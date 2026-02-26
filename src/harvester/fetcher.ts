import https from 'https';
import fs from 'fs';
import path from 'path';

const UAS = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_3_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3.1 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0',
];
const ua    = () => UAS[Math.floor(Math.random() * UAS.length)];
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

function get(url: string, timeout = 18000): Promise<any> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => { try { req.destroy(); } catch {} resolve(null); }, timeout);
    const req = https.get(url, { headers: { 'User-Agent': ua(), 'Accept': 'application/json' } }, (res) => {
      if ([301,302,303,307,308].includes(res.statusCode!) && res.headers.location) {
        clearTimeout(timer);
        const loc = res.headers.location;
        resolve(get(loc.startsWith('http') ? loc : `https://${new URL(url).host}${loc}`, timeout));
        return;
      }
      if (res.statusCode === 429) {
        clearTimeout(timer);
        resolve({ _rateLimit: true, wait: parseInt(res.headers['retry-after'] || '60') * 1000 });
        return;
      }
      const chunks: Buffer[] = [];
      res.on('data', (c: Buffer) => chunks.push(c));
      res.on('end', () => {
        clearTimeout(timer);
        if (res.statusCode !== 200) { resolve(null); return; }
        try { resolve(JSON.parse(Buffer.concat(chunks).toString())); }
        catch { resolve(null); }
      });
    });
    req.on('error', () => { clearTimeout(timer); resolve(null); });
  });
}

function getWithHeaders(url: string): Promise<{ body: any; headers: Record<string, string> } | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => { try { req.destroy(); } catch {} resolve(null); }, 22000);
    const req = https.get(url, { headers: { 'User-Agent': ua(), 'Accept': 'application/json' } }, (res) => {
      if (res.statusCode === 429) { clearTimeout(timer); resolve(null); return; }
      const chunks: Buffer[] = [];
      res.on('data', (c: Buffer) => chunks.push(c));
      res.on('end', () => {
        clearTimeout(timer);
        if (res.statusCode !== 200) { resolve(null); return; }
        try { resolve({ body: JSON.parse(Buffer.concat(chunks).toString()), headers: res.headers as any }); }
        catch { resolve(null); }
      });
    });
    req.on('error', () => { clearTimeout(timer); resolve(null); });
  });
}

// ─── MET ──────────────────────────────────────────────────────────────────────
// BUG FIX: params without q used /objects?departmentIds=9 returning 175k IDs.
// Random sample of 175k almost never hits the target objectName.
// FIX: when both q AND departmentId are present, use the SEARCH endpoint which
// pre-filters by q, then we can sample a small relevant set.
// When only departmentId (no q), still use /objects but sample 6x limit.

async function fetchMet(config: any): Promise<any[]> {
  const { params, limit = 300 } = config;

  let searchUrl: string;
  if (params.q && params.departmentId) {
    // Search endpoint: returns only IDs matching q, constrained to department
    searchUrl = `https://collectionapi.metmuseum.org/public/collection/v1/search`
      + `?hasImages=true&q=${encodeURIComponent(params.q)}`
      + `&departmentId=${params.departmentId}`;
  } else if (params.q) {
    searchUrl = `https://collectionapi.metmuseum.org/public/collection/v1/search`
      + `?hasImages=true&q=${encodeURIComponent(params.q)}`;
  } else if (params.departmentId) {
    // Department-only: use /objects endpoint, sample broadly
    searchUrl = `https://collectionapi.metmuseum.org/public/collection/v1/objects`
      + `?departmentIds=${params.departmentId}`;
  } else {
    console.warn('  MET: no q or departmentId in params'); return [];
  }

  const search = await get(searchUrl, 20000);
  if (!search) { console.warn('  MET: no response from search'); return []; }
  const allIds: number[] = search?.objectIDs || [];
  if (!allIds.length) { console.warn(`  MET: 0 IDs returned`); return []; }

  // Shuffle for variety; when using dept-only endpoint oversample heavily
  const oversample = params.q ? 3 : 8;
  const shuffled = allIds.sort(() => Math.random() - 0.5).slice(0, limit * oversample);

  const objectNameFilter: string   = params.objectName || '';
  const excludeNames: string[]     = params.excludeObjectNames || [];

  const results: any[] = [];

  for (let i = 0; i < shuffled.length && results.length < limit; i += 10) {
    const batch = shuffled.slice(i, i + 10);
    const batchResults = await Promise.all(
      batch.map(id => get(`https://collectionapi.metmuseum.org/public/collection/v1/objects/${id}`, 10000))
    );
    for (const obj of batchResults) {
      if (!obj?.primaryImage) continue;
      if (objectNameFilter) {
        const n = (obj.objectName || '').toLowerCase();
        if (!n.includes(objectNameFilter.toLowerCase())) continue;
      }
      if (excludeNames.length) {
        const n = (obj.objectName || '').toLowerCase();
        if (excludeNames.some(ex => n.includes(ex.toLowerCase()))) continue;
      }
      results.push(obj);
    }
    process.stdout.write(`  MET: ${Math.min(results.length, limit)}/${limit}\r`);
    await sleep(150);
  }

  const final = results.slice(0, limit);
  console.log(`\n  MET: ✓ ${final.length} items`);
  return final;
}

// ─── ART INSTITUTE OF CHICAGO ─────────────────────────────────────────────────
// BUG FIX: previous version used fetch() POST to /artworks/search — this silently
// returned 0 results in ts-node/esm on Windows/Node 24 due to ESM/fetch compatibility.
// FIX: use native https.get() with the confirmed GET query[term] approach.
// CONFIRMED WORKING artwork_type_title values:
//   "Poster" | "Photograph" | "Painting" | "Drawing and Watercolor on Paper"
//   "Print and Multiple" | "Textile" | "Ceramic" | "Glass" | "Metalwork"
//   "Decorative Arts"

async function fetchArtic(config: any): Promise<any[]> {
  const { params, limit = 300 } = config;
  const FIELDS = 'id,title,image_id,artist_display,date_display,medium_display,artwork_type_title,classification_title,style_title,place_of_origin,department_title';

  const results: any[] = [];
  let page = 1;

  while (results.length < limit && page <= 60) {
    await sleep(700);

    // Build GET URL — confirmed working approach
    let url: string;
    const base = `https://api.artic.edu/api/v1/artworks?query[term][is_public_domain]=true&fields=${FIELDS}&limit=100&page=${page}`;

    if (params.artwork_type_title) {
      url = base + `&query[term][artwork_type_title.keyword]=${encodeURIComponent(params.artwork_type_title)}`;
    } else if (params.classification_id) {
      url = base + `&query[term][classification_id]=${encodeURIComponent(params.classification_id)}`;
    } else if (params.department_title) {
      // department_title is a text field, use match_phrase
      url = base + `&query[match_phrase][department_title]=${encodeURIComponent(params.department_title)}`;
    } else if (params.q) {
      url = base + `&q=${encodeURIComponent(params.q)}`;
    } else {
      break;
    }

    const data = await get(url);
    if (!data?.data?.length) break;

    for (const item of data.data) {
      if (results.length >= limit) break;
      if (!item.image_id) continue;
      results.push(item);
    }

    process.stdout.write(`  ARTIC: ${results.length}/${limit}\r`);
    page++;
  }

  console.log(`\n  ARTIC: ✓ ${results.length} items`);
  return results;
}

// ─── V&A MUSEUM ───────────────────────────────────────────────────────────────
// params.id_category → V&A thesaurus ID (THES48943, THES48876, etc.)
// Two-step: search list → per-item detail for full classification + material

async function fetchVA(config: any): Promise<any[]> {
  const { params, limit = 300 } = config;
  const allItems = new Map<string, any>();
  let page = 1;

  const buildUrl = (p: number) => {
    const base = 'https://api.vam.ac.uk/v2/objects/search?images_exist=true&page_size=100';
    if (params.id_category) return `${base}&id_category=${params.id_category}&page=${p}`;
    if (params.q)           return `${base}&q=${encodeURIComponent(params.q)}&page=${p}`;
    return null;
  };

  while (allItems.size < limit && page <= 20) {
    await sleep(800);
    const url = buildUrl(page);
    if (!url) break;

    const data = await get(url);
    if (!data?.records?.length) break;

    const needed = data.records
      .filter((item: any) => item._images?._primary_thumbnail)
      .filter((item: any) => !allItems.has(item.systemNumber))
      .slice(0, limit - allItems.size);

    if (!needed.length) { page++; continue; }

    for (let i = 0; i < needed.length; i += 8) {
      const batch = needed.slice(i, i + 8);
      const details = await Promise.all(
        batch.map((item: any) => get(`https://api.vam.ac.uk/v2/object/${item.systemNumber}`, 12000))
      );
      for (let j = 0; j < batch.length; j++) {
        const detail = details[j]?.record || details[j] || null;
        if (!detail) continue;
        allItems.set(batch[j].systemNumber, { ...batch[j], ...detail, systemNumber: batch[j].systemNumber });
      }
      await sleep(300);
    }

    process.stdout.write(`  V&A: ${allItems.size}/${limit}\r`);
    page++;
  }

  console.log(`\n  V&A: ✓ ${allItems.size} items`);
  return Array.from(allItems.values());
}

// ─── LIBRARY OF CONGRESS ──────────────────────────────────────────────────────
// BUG FIX: previous version looped on 429 forever with no max retries.
// FIX: track consecutive 429s. After 3 in a row, give up and move to next source.
// Also uses /collections/{name}/ endpoint which is the correct LOC collections URL.

function upgradeLOCImage(raw: string): string {
  if (!raw) return '';
  const url = raw.startsWith('//') ? `https:${raw}` : raw;
  return url.split('?')[0]
    .replace(/_150px\.(jpg|jpeg|png)/i, '_1024px.$1')
    .replace(/_75px\.(jpg|jpeg|png)/i,  '_1024px.$1');
}

async function fetchLOC(config: any): Promise<any[]> {
  const { params, limit = 400 } = config;
  const collection = params.collection || 'posters';
  const PER_PAGE   = 100;

  const results: any[] = [];
  const seen = new Set<string>();
  let page = 1;
  let totalPages = 999;
  let rateLimitStrikes = 0;

  while (results.length < limit && page <= totalPages) {
    // 2.5s minimum — LOC needs this to avoid 429
    await sleep(2500);

    const url = `https://www.loc.gov/collections/${collection}/?fo=json&c=${PER_PAGE}&sp=${page}`;
    const data = await get(url, 25000);

    if (!data) { page++; continue; }

    if (data._rateLimit) {
      rateLimitStrikes++;
      if (rateLimitStrikes >= 3) {
        console.warn(`\n  LOC: 3 consecutive 429s — giving up on "${collection}". Move on.`);
        break;
      }
      const wait = Math.min(data.wait * rateLimitStrikes, 300000); // max 5 min
      console.warn(`\n  LOC: rate limited (strike ${rateLimitStrikes}/3) — waiting ${wait / 1000}s`);
      await sleep(wait);
      continue;
    }

    rateLimitStrikes = 0; // reset on success

    if (page === 1) {
      const total = data.pagination?.total || 0;
      totalPages = Math.min(Math.ceil(total / PER_PAGE), Math.ceil(limit / PER_PAGE) + 3);
      console.log(`\n  LOC: "${collection}" — ${total} items, ${totalPages} pages`);
    }

    for (const result of (data.results || [])) {
      if (results.length >= limit) break;
      if (!result.image_url?.length || result.access_restricted) continue;
      const idMatch = (result.id || '').match(/\/item\/([^/]+)\/?$/);
      if (!idMatch) continue;
      if (seen.has(idMatch[1])) continue;
      seen.add(idMatch[1]);
      results.push({ ...result, _imageUrl: upgradeLOCImage(result.image_url[0]) });
    }

    process.stdout.write(`  LOC: ${results.length}/${limit} (p${page}/${totalPages})\r`);
    page++;
  }

  console.log(`\n  LOC: ✓ ${results.length} items`);
  return results;
}

// ─── RIJKSMUSEUM ──────────────────────────────────────────────────────────────
// params.type → affiche|foto|schilderij|prent|tekening|aquarel|aardewerk|glas|meubilair|textiel|zilverwerk|goud
// params.q   → MUST be '*' — without it returns 0 results (documented API behavior)

async function fetchRijks(config: any): Promise<any[]> {
  const key  = process.env.RIJKS_API_KEY || '0fiuZFh4';
  const { params, limit = 200 } = config;
  const results: any[] = [];
  let page = 1;

  while (results.length < limit && page <= 30) {
    await sleep(400);
    const type = params.type || 'prent';
    const q    = params.q || '*';
    const url  = `https://www.rijksmuseum.nl/api/en/collection?key=${key}&q=${encodeURIComponent(q)}&type=${encodeURIComponent(type)}&imgonly=true&ps=100&p=${page}`;

    const data = await get(url);
    if (!data) { console.warn('  Rijks: null response'); break; }
    if (!data.artObjects?.length) break;

    results.push(...data.artObjects.slice(0, limit - results.length));
    process.stdout.write(`  Rijks: ${results.length}/${limit}\r`);
    page++;
  }

  console.log(`\n  Rijks: ✓ ${results.length} items`);
  return results;
}

// ─── HARVARD ART MUSEUMS ──────────────────────────────────────────────────────
// Confirmed param names and values:
//   worktype=    → "Poster", "Photograph", "Painting", "Print", "Drawing"
//   classification= → "Photographs", "Prints", "Drawings", "Paintings", "Posters",
//                     "Textiles and Fashion Arts", "Ceramics and Glass",
//                     "Metalwork and Jewelry", "Furniture"
//   technique=   → "Etching", "Lithography", "Photography", "Woodcut"
//   medium=      → "Watercolor", etc. (freetext)

async function fetchHarvard(config: any): Promise<any[]> {
  const key = process.env.HARVARD_API_KEY;
  if (!key) { console.warn('  Harvard: no HARVARD_API_KEY — skipping'); return []; }

  const { params, limit = 200 } = config;
  const results: any[] = [];
  let page = 1;

  while (results.length < limit && page <= 30) {
    await sleep(400);

    let qParam: string;
    if (params.worktype)            qParam = `worktype=${encodeURIComponent(params.worktype)}`;
    else if (params.classification) qParam = `classification=${encodeURIComponent(params.classification)}`;
    else if (params.technique)      qParam = `technique=${encodeURIComponent(params.technique)}`;
    else if (params.medium)         qParam = `medium=${encodeURIComponent(params.medium)}`;
    else if (params.keyword)        qParam = `keyword=${encodeURIComponent(params.keyword)}`;
    else { console.warn('  Harvard: no recognized param'); return []; }

    const url = `https://api.harvardartmuseums.org/object?${qParam}&size=100&page=${page}&apikey=${key}&hasimage=1`;
    const data = await get(url);
    if (!data?.records?.length) break;

    results.push(...data.records.filter((r: any) => r.primaryimageurl).slice(0, limit - results.length));
    process.stdout.write(`  Harvard: ${results.length}/${limit}\r`);
    page++;
  }

  console.log(`\n  Harvard: ✓ ${results.length} items`);
  return results;
}

// ─── EUROPEANA ────────────────────────────────────────────────────────────────
// params.query → free text. Always adds TYPE:IMAGE + reusability=open.

async function fetchEuropeana(config: any): Promise<any[]> {
  const key = process.env.EUROPEANA_API_KEY;
  if (!key) { console.warn('  Europeana: no EUROPEANA_API_KEY — skipping'); return []; }

  const { params, limit = 200 } = config;
  const query  = params.query || 'poster';
  const results: any[] = [];
  let cursor   = '*';

  while (results.length < limit) {
    await sleep(400);
    const url = `https://api.europeana.eu/record/v2/search.json?wskey=${key}`
      + `&query=${encodeURIComponent(query)}&qf=TYPE:IMAGE&reusability=open&media=true&rows=100`
      + `&cursor=${encodeURIComponent(cursor)}`;

    const data = await get(url);
    if (!data?.items?.length) break;

    results.push(...data.items.slice(0, limit - results.length));
    cursor = data.nextCursor || '';
    if (!cursor) break;
    process.stdout.write(`  Europeana: ${results.length}/${limit}\r`);
  }

  console.log(`\n  Europeana: ✓ ${results.length} items`);
  return results;
}

// ─── WELLCOME COLLECTION ──────────────────────────────────────────────────────
async function fetchWellcome(config: any): Promise<any[]> {
  const { params, limit = 200 } = config;
  const workType = params.workType || 'k';
  const query    = params.query ? `&query=${encodeURIComponent(params.query)}` : '';
  const results: any[] = [];
  let page = 1;

  while (results.length < limit && page <= 20) {
    await sleep(500);
    const url = `https://api.wellcomecollection.org/catalogue/v2/works`
      + `?workType=${workType}${query}&pageSize=100&page=${page}&include=subjects,contributors`;

    const data = await get(url);
    if (!data?.results?.length) break;

    for (const item of data.results) {
      if (results.length >= limit) break;
      if (!item.thumbnail?.url) continue;
      results.push(item);
    }

    process.stdout.write(`  Wellcome: ${results.length}/${limit}\r`);
    page++;
  }

  console.log(`\n  Wellcome: ✓ ${results.length} items`);
  return results;
}

// ─── INTERNET ARCHIVE ─────────────────────────────────────────────────────────
async function fetchIA(config: any): Promise<any[]> {
  const { params, limit = 200 } = config;
  const subject   = params.subject  || 'poster';
  const mediatype = params.mediatype || 'image';
  const results: any[] = [];
  const seen = new Set<string>();
  let page = 1;

  while (results.length < limit && page <= 15) {
    await sleep(600);
    const q   = `subject:(${subject}) AND mediatype:(${mediatype})`;
    const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(q)}`
      + `&fl[]=identifier,title,creator,date,mediatype,collection,subject&rows=100&page=${page}&output=json`;

    const data = await get(url);
    if (!data?.response?.docs?.length) break;

    for (const doc of data.response.docs) {
      if (results.length >= limit) break;
      if (seen.has(doc.identifier)) continue;
      seen.add(doc.identifier);
      results.push(doc);
    }

    process.stdout.write(`  IA: ${results.length}/${limit}\r`);
    page++;
  }

  console.log(`\n  IA: ✓ ${results.length} items`);
  return results;
}

// ─── COOPER HEWITT ────────────────────────────────────────────────────────────
function cooperWeightedId(): number {
  const r = Math.random();
  if (r < 0.60) return Math.floor(Math.random() * (18850000 - 18600000) + 18600000);
  if (r < 0.85) return Math.floor(Math.random() * (18600000 - 18400000) + 18400000);
  if (r < 0.95) return Math.floor(Math.random() * (18400000 - 18200000) + 18200000);
  return        Math.floor(Math.random() * (18200000 - 18000000) + 18000000);
}

async function fetchCooper(config: any): Promise<any[]> {
  const { params, limit = 300 } = config;
  const typeFilter = (params.typeFilter || '').toLowerCase();
  const deptFilter = params.department_id || '';
  const BATCH = 60;

  const results: any[] = [];
  const seen  = new Set<string>();

  const resumePath = path.join(process.cwd(), 'public', 'manifests', '_cooper_seen.json');
  if (fs.existsSync(resumePath)) {
    const ids = JSON.parse(fs.readFileSync(resumePath, 'utf8'));
    ids.forEach((id: string) => seen.add(id));
  }

  while (results.length < limit) {
    const batchIds = Array.from({ length: BATCH }, () => cooperWeightedId());

    const batchResults = await Promise.all(batchIds.map(async (id) => {
      const sId = String(id);
      const url = `https://raw.githubusercontent.com/cooperhewitt/collection/master/objects/`
        + `${sId.slice(0,3)}/${sId.slice(3,6)}/${sId.slice(6)}/${id}.json`;
      return await get(url, 4000);
    }));

    for (const obj of batchResults) {
      if (!obj?.images?.length) continue;
      if (seen.has(String(obj.id))) continue;
      seen.add(String(obj.id));

      if (typeFilter) {
        const type = (obj.type || '').toLowerCase();
        const cls  = (obj.classification || '').toLowerCase();
        const med  = (obj.medium || '').toLowerCase();
        const dept = (obj.department?.name || obj.departments?.[0]?.name || '').toLowerCase();
        const tags = `${type} ${cls} ${med} ${dept}`;

        const matches =
          tags.includes(typeFilter) ||
          (typeFilter === 'poster' && (tags.includes('advertisement') || tags.includes('trade card') || tags.includes('broadside') || tags.includes('lithograph'))) ||
          (typeFilter === 'textile' && (tags.includes('fabric') || tags.includes('lace') || tags.includes('tapestry') || tags.includes('embroidery') || tags.includes('carpet') || tags.includes('weaving'))) ||
          (typeFilter === 'graphic design' && (tags.includes('graphic') || tags.includes('ephemera') || tags.includes('packaging') || tags.includes('book') || tags.includes('magazine'))) ||
          (typeFilter === 'jewelry' && (tags.includes('jewel') || tags.includes('brooch') || tags.includes('necklace') || tags.includes('ring') || tags.includes('ornament'))) ||
          (typeFilter === 'ceramic' && (tags.includes('porcelain') || tags.includes('pottery') || tags.includes('earthenware') || tags.includes('glass'))) ||
          (typeFilter === 'product' && (tags.includes('industrial') || tags.includes('furniture') || tags.includes('lamp') || tags.includes('clock') || tags.includes('product design'))) ||
          (typeFilter === 'drawing' && (tags.includes('sketch') || tags.includes('study') || tags.includes('draft') || tags.includes('charcoal') || tags.includes('graphite')));

        if (!matches) continue;
      } else if (deptFilter && obj.department_id !== deptFilter) {
        continue;
      }

      results.push(obj);
    }

    process.stdout.write(`  Cooper: ${results.length}/${limit}\r`);
    await sleep(100);
  }

  fs.writeFileSync(resumePath, JSON.stringify(Array.from(seen)));
  console.log(`\n  Cooper: ✓ ${results.length} items`);
  return results.slice(0, limit);
}

// ─── WIKIMEDIA COMMONS ────────────────────────────────────────────────────────
async function fetchWikimedia(config: any): Promise<any[]> {
  const { params, limit = 150 } = config;
  const category = params.category || 'Posters';
  const results: any[] = [];
  let cmcontinue = '';

  while (results.length < limit) {
    await sleep(400);
    const cont = cmcontinue ? `&cmcontinue=${encodeURIComponent(cmcontinue)}` : '';
    const listUrl = `https://commons.wikimedia.org/w/api.php?action=query&list=categorymembers`
      + `&cmtitle=Category:${encodeURIComponent(category)}&cmtype=file&cmlimit=100&format=json${cont}`;

    const listData = await get(listUrl);
    if (!listData?.query?.categorymembers?.length) break;

    const pageIds = listData.query.categorymembers.map((m: any) => m.pageid).join('|');
    if (!pageIds) break;

    const iiData = await get(`https://commons.wikimedia.org/w/api.php?action=query&pageids=${pageIds}`
      + `&prop=imageinfo&iiprop=url|size|extmetadata&iiurlwidth=800&format=json`);

    const pages = Object.values(iiData?.query?.pages || {}) as any[];
    for (const pg of pages) {
      if (results.length >= limit) break;
      const ii = pg.imageinfo?.[0];
      if (!ii?.url || (ii.width || 0) < 200) continue;
      results.push({ pageid: pg.pageid, title: pg.title, imageinfo: [ii], _fetchCategory: category });
    }

    cmcontinue = listData['query-continue']?.categorymembers?.cmcontinue || listData.continue?.cmcontinue || '';
    if (!cmcontinue) break;
    process.stdout.write(`  Wikimedia: ${results.length}/${limit}\r`);
    await sleep(200);
  }

  console.log(`\n  Wikimedia: ✓ ${results.length} items`);
  return results;
}

// ─── DESIGN REVIEWED ──────────────────────────────────────────────────────────
async function fetchDesignReviewed(config: any): Promise<any[]> {
  const { limit = 500 } = config;
  const results: any[] = [];
  let page = 1;
  let totalPages = 1;

  while (results.length < limit && page <= totalPages) {
    await sleep(700);
    const url = `https://designreviewed.com/wp-json/wp/v2/artefacts?_embed=true&per_page=100&page=${page}`;
    const data = await getWithHeaders(url);
    if (!data) { page++; continue; }

    if (page === 1 && data.headers['x-wp-totalpages']) {
      totalPages = Math.min(parseInt(data.headers['x-wp-totalpages']), Math.ceil(limit / 100) + 1);
    }

    for (const post of (data.body || [])) {
      if (results.length >= limit) break;
      results.push(post);
    }

    process.stdout.write(`  DesignReviewed: ${results.length}/${limit}\r`);
    page++;
  }

  console.log(`\n  DesignReviewed: ✓ ${results.length} items`);
  return results;
}

// ─── LETTERFORM ARCHIVE ───────────────────────────────────────────────────────
async function resolveTypoId(acct: string): Promise<string | null> {
  const data = await get(`https://typo.social/api/v1/accounts/lookup?acct=${encodeURIComponent(acct)}`);
  return data?.id || null;
}

async function fetchLetterform(config: any): Promise<any[]> {
  const { limit = 600 } = config;
  const ACCTS = ['Lfaimagebot', 'letterformarchive'];
  const accountIds: string[] = [];

  for (const acct of ACCTS) {
    const id = await resolveTypoId(acct);
    if (id) { accountIds.push(id); console.log(`  Letterform: @${acct} → ${id}`); }
    await sleep(400);
  }

  if (!accountIds.length) { console.warn('  Letterform: no accounts resolved'); return []; }

  const allStatuses: any[] = [];
  const perAccount = Math.ceil(limit / accountIds.length);

  for (const accountId of accountIds) {
    let maxId = '';
    let fetched = 0;

    while (fetched < perAccount) {
      await sleep(1500);
      const cont = maxId ? `&max_id=${maxId}` : '';
      const url  = `https://typo.social/api/v1/accounts/${accountId}/statuses`
        + `?limit=40&exclude_replies=true&exclude_reblogs=true${cont}`;

      const data = await get(url);
      if (!Array.isArray(data) || !data.length) break;

      allStatuses.push(...data);
      maxId = data[data.length - 1].id;
      fetched += data.length;
      process.stdout.write(`  Letterform: ${allStatuses.length} statuses\r`);
    }
  }

  console.log(`\n  Letterform: ✓ ${allStatuses.length} raw statuses`);
  return allStatuses;
}

// ─── SMITHSONIAN ──────────────────────────────────────────────────────────────
async function fetchSmithsonian(config: any): Promise<any[]> {
  const key  = process.env.SMITHSONIAN_API_KEY || '';
  const { params, limit = 200 } = config;
  const q    = params.q || 'poster';
  const unit = params.unit_code || '';
  const type = params.type || '';
  const results: any[] = [];
  let start  = 0;

  while (results.length < limit) {
    await sleep(500);
    const base = 'https://api.si.edu/openaccess/api/v1.0/search';
    let url = `${base}?q=${encodeURIComponent(q)}&rows=100&start=${start}`;
    if (key)  url += `&api_key=${key}`;
    if (unit) url += `&unit_code=${encodeURIComponent(unit)}`;
    if (type) url += `&type=${encodeURIComponent(type)}`;

    const data = await get(url);
    const rows = data?.response?.rows || [];
    if (!rows.length) break;

    results.push(...rows.slice(0, limit - results.length));
    start += rows.length;
    process.stdout.write(`  Smithsonian: ${results.length}/${limit}\r`);
  }

  console.log(`\n  Smithsonian: ✓ ${results.length} items`);
  return results;
}

// ─── NGA ──────────────────────────────────────────────────────────────────────
async function fetchNGA(config: any): Promise<any[]> {
  const { params, limit = 200 } = config;
  const results: any[] = [];
  let offset = 0;

  while (results.length < limit) {
    await sleep(600);
    const url = `https://api.nga.gov/art/tms/objects?classification=${encodeURIComponent(params.classification || 'Painting')}&offset=${offset}&limit=100`;
    const data = await get(url);
    if (!data?.items?.length) break;
    results.push(...data.items.slice(0, limit - results.length));
    process.stdout.write(`  NGA: ${results.length}/${limit}\r`);
    offset += 100;
    if (data.items.length < 100) break;
  }

  console.log(`\n  NGA: ✓ ${results.length} items`);
  return results;
}

// ─── NYPL ─────────────────────────────────────────────────────────────────────
async function fetchNYPL(config: any): Promise<any[]> {
  const key = process.env.NYPL_API_KEY;
  if (!key) { console.warn('  NYPL: no NYPL_API_KEY — skipping'); return []; }

  const { params, limit = 200 } = config;
  const subject = params.subject || 'posters';
  const results: any[] = [];
  let page = 1;

  while (results.length < limit && page <= 20) {
    await sleep(600);
    const url = `https://api.nypl.org/api/v2/items/search?q=${encodeURIComponent(subject)}&per_page=100&page=${page}&token=${key}`;
    const data = await get(url);
    const items = data?.nyplAPI?.response?.result || [];
    if (!items.length) break;

    for (const item of items) {
      if (results.length >= limit) break;
      if (!item.imageID?.length && !Array.isArray(item.imageID)) continue;
      results.push(item);
    }
    process.stdout.write(`  NYPL: ${results.length}/${limit}\r`);
    page++;
  }

  console.log(`\n  NYPL: ✓ ${results.length} items`);
  return results;
}

// ─── Harvard Middle East Posters ─────────────────────────────────────────────
async function fetchHarvardME(config: any): Promise<any[]> {
  const { limit = 100 } = config;
  const results: any[] = [];
  let start = 0;

  while (results.length < limit) {
    await sleep(600);
    const url = `https://api.lib.harvard.edu/api/v2/items.json?setSpec=HarvardDigitalCollections&q=posters&limit=20&start=${start}`;
    const data = await get(url);
    const items = data?.items?.mods;
    if (!Array.isArray(items) || !items.length) break;
    results.push(...items.slice(0, limit - results.length));
    start += 20;
    process.stdout.write(`  HarvardME: ${results.length}/${limit}\r`);
  }

  console.log(`\n  HarvardME: ✓ ${results.length} items`);
  return results;
}

// ─── DISPATCHER ───────────────────────────────────────────────────────────────

const FETCHERS: Record<string, (config: any) => Promise<any[]>> = {
  met:            fetchMet,
  artic:          fetchArtic,
  va:             fetchVA,
  loc:            fetchLOC,
  rijks:          fetchRijks,
  harvard:        fetchHarvard,
  europeana:      fetchEuropeana,
  wellcome:       fetchWellcome,
  ia:             fetchIA,
  rave:           (c) => fetchIA({ ...c, params: { subject: 'rave flyer', mediatype: 'image' } }),
  cooper:         fetchCooper,
  wikimedia:      fetchWikimedia,
  designreviewed: fetchDesignReviewed,
  letterform:     fetchLetterform,
  smithsonian:    fetchSmithsonian,
  nga:            fetchNGA,
  nypl:           fetchNYPL,
  harvardme:      fetchHarvardME,
  aif:            async () => [],
  ada:            async () => [],
  arabic_design:  async () => [],
  palarchive:     async () => [],
  translatio:     async () => [],
  auc:            async () => [],
  jstor:          async () => [],
  getty:          async () => [],
};

export async function fetchSourceData(source: string, config: any): Promise<any[]> {
  const fetcher = FETCHERS[source];
  if (!fetcher) { console.warn(`  ⚠️  No fetcher for "${source}"`); return []; }
  try { return await fetcher(config); }
  catch (err: any) { console.error(`  ❌ ${source} threw: ${err.message}`); return []; }
}
