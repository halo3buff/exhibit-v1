import https from 'https';
import fs from 'fs';
import path from 'path';

// ─── HTTP utilities ────────────────────────────────────────────────────────────

const UAS = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_3_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3.1 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0',
];
const ua  = () => UAS[Math.floor(Math.random() * UAS.length)];
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

function get(url: string, timeout = 15000): Promise<any> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => { try { req.destroy(); } catch {} resolve(null); }, timeout);
    const req = https.get(url, { headers: { 'User-Agent': ua(), 'Accept': 'application/json' } }, (res) => {
      if ([301,302,303,307,308].includes(res.statusCode!) && res.headers.location) {
        clearTimeout(timer);
        const next = res.headers.location.startsWith('http')
          ? res.headers.location
          : `https://${new URL(url).host}${res.headers.location}`;
        resolve(get(next, timeout));
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

// Returns response body AND headers (needed for WP X-WP-TotalPages)
function getWithHeaders(url: string): Promise<{ body: any; headers: Record<string, string> } | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => { try { req.destroy(); } catch {} resolve(null); }, 20000);
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

// Parallel batch fetch — runs `concurrent` requests at a time with `delay`ms between batches
async function batchFetch<T>(
  items: T[],
  fn: (item: T) => Promise<any>,
  concurrent = 10,
  delay = 150
): Promise<any[]> {
  const results: any[] = [];
  for (let i = 0; i < items.length; i += concurrent) {
    const batch = items.slice(i, i + concurrent);
    const batchResults = await Promise.all(batch.map(fn));
    results.push(...batchResults.filter(Boolean));
    if (i + concurrent < items.length) await sleep(delay);
  }
  return results;
}

// ─── MET ──────────────────────────────────────────────────────────────────────
// params.q          → /search?q=poster&hasImages=true  (poster/photograph/etc)
// params.departmentId → /objects?departmentIds=11       (paintings dept, etc)
// Speed: parallel batches of 10 object fetches, 150ms between batches

async function fetchMet(config: any): Promise<any[]> {
  const { params, limit = 300 } = config;
  let searchUrl: string;

  if (params.q) {
    // Free text search — add departmentId constraint if present
    const deptParam = params.departmentId ? `&departmentId=${params.departmentId}` : '';
    searchUrl = `https://collectionapi.metmuseum.org/public/collection/v1/search?hasImages=true&q=${encodeURIComponent(params.q)}${deptParam}`;
  } else if (params.departmentId) {
    searchUrl = `https://collectionapi.metmuseum.org/public/collection/v1/objects?departmentIds=${params.departmentId}`;
  } else {
    console.warn('  MET: no q or departmentId in params'); return [];
  }

  const search = await get(searchUrl);
  const allIds: number[] = search?.objectIDs || [];
  if (!allIds.length) { console.warn('  MET: no object IDs returned'); return []; }

  // Shuffle to get variety, then take 3× limit (many will have no image)
  const shuffled = allIds.sort(() => Math.random() - 0.5).slice(0, limit * 3);

  // objectName post-fetch filter: exact match
  const objectNameFilter: string | undefined   = params.objectName;
  const excludeObjectNames: string[] | undefined = params.excludeObjectNames;

  const results: any[] = [];
  const fetchOne = async (id: number) => {
    const obj = await get(`https://collectionapi.metmuseum.org/public/collection/v1/objects/${id}`, 10000);
    if (!obj?.primaryImage) return null;
    // Apply objectName include filter
    if (objectNameFilter) {
      const name = (obj.objectName || '').toLowerCase();
      if (!name.includes(objectNameFilter.toLowerCase())) return null;
    }
    // Apply objectName exclude filter
    if (excludeObjectNames?.length) {
      const name = (obj.objectName || '').toLowerCase();
      if (excludeObjectNames.some(ex => name.includes(ex.toLowerCase()))) return null;
    }
    return obj;
  };

  // Process in batches, stop once we hit the limit
  for (let i = 0; i < shuffled.length && results.length < limit; i += 10) {
    const batch = shuffled.slice(i, i + 10);
    const batchResults = await Promise.all(batch.map(fetchOne));
    results.push(...batchResults.filter(Boolean));
    process.stdout.write(`  MET: ${Math.min(results.length, limit)}/${limit}\r`);
    if (results.length < limit) await sleep(200);
  }

  const final = results.slice(0, limit);
  console.log(`\n  MET: ✓ ${final.length} items`);
  return final;
}

// ─── ART INSTITUTE OF CHICAGO ─────────────────────────────────────────────────
// Uses POST /artworks/search with full Elasticsearch body.
// This is the only reliable way to filter by artwork_type_title, classification,
// or department_title — the GET endpoint's query[term] params are unreliable.
//
// params.artwork_type_title → must: [term: artwork_type_title.keyword]
// params.classification_id  → must: [term: classification_id]
// params.department_title   → must: [match: department_title]
// params.q                  → must: [match: _all / title]

async function fetchArtic(config: any): Promise<any[]> {
  const { params, limit = 300 } = config;
  const FIELDS = 'id,title,image_id,artist_display,date_display,medium_display,artwork_type_title,classification_title,style_title,place_of_origin,department_title';

  const results: any[] = [];
  let page = 1;

  // Build Elasticsearch bool filter clauses
  const mustFilters: any[] = [
    { term: { is_public_domain: true } },
    { exists: { field: 'image_id' } },
  ];

  if (params.artwork_type_title) {
    mustFilters.push({ term: { 'artwork_type_title.keyword': params.artwork_type_title } });
  }
  if (params.classification_id) {
    mustFilters.push({ term: { classification_id: params.classification_id } });
  }
  if (params.department_title) {
    mustFilters.push({ match: { department_title: params.department_title } });
  }
  if (params.q) {
    mustFilters.push({ multi_match: { query: params.q, fields: ['title^3', 'alt_titles', 'artist_display', 'medium_display'] } });
  }

  while (results.length < limit && page <= 60) {
    await sleep(600);

    const body = {
      query: { bool: { must: mustFilters } },
      fields: FIELDS.split(','),
      _source: true,
      size: 100,
      from: (page - 1) * 100,
    };

    const resp = await fetch(`https://api.artic.edu/api/v1/artworks/search?fields=${FIELDS}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!resp.ok) break;
    const data = await resp.json() as any;
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
// params.id_category → ?id_category=THES48943  (Posters thesaurus ID)
//                    → ?id_category=THES48881  (Textiles)
// Two-step: search list → detail per item for real classification + material

async function fetchVA(config: any): Promise<any[]> {
  const { params, limit = 300 } = config;
  const allItems = new Map<string, any>();
  let page = 1;

  const buildUrl = (p: number) => {
    if (params.id_category) {
      return `https://api.vam.ac.uk/v2/objects/search?id_category=${params.id_category}&images_exist=true&page_size=100&page=${p}`;
    }
    if (params.q) {
      return `https://api.vam.ac.uk/v2/objects/search?q=${encodeURIComponent(params.q)}&images_exist=true&page_size=100&page=${p}`;
    }
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

    // Detail calls in parallel batches of 8
    for (let i = 0; i < needed.length; i += 8) {
      const batch = needed.slice(i, i + 8);
      const details = await Promise.all(
        batch.map((item: any) => get(`https://api.vam.ac.uk/v2/object/${item.systemNumber}`, 10000))
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
// params.collection → /collections/{name}/?fo=json
// Confirmed endpoint — /search/ returns 1 result for poster format facet

function upgradeLOCImage(raw: string): string {
  if (!raw) return '';
  const url = raw.startsWith('//') ? `https:${raw}` : raw;
  return url.split('?')[0]
    .replace(/_150px\.(jpg|jpeg|png)/i, '_1024px.$1')
    .replace(/_75px\.(jpg|jpeg|png)/i, '_1024px.$1');
}

async function fetchLOC(config: any): Promise<any[]> {
  const { params, limit = 400 } = config;
  const collection = params.collection || 'posters';
  const PER_PAGE   = 150;

  const results: any[] = [];
  const seen = new Set<string>();
  let page = 1;
  let totalPages = 999;

  while (results.length < limit && page <= totalPages) {
    await sleep(1200);
    const url = `https://www.loc.gov/collections/${collection}/?fo=json&c=${PER_PAGE}&sp=${page}`;
    const data = await get(url);
    if (!data) { page++; continue; }

    if (data._rateLimit) {
      console.warn(`  LOC: rate limited — waiting ${data.wait / 1000}s`);
      await sleep(data.wait);
      continue;
    }

    if (page === 1) {
      const total = data.pagination?.total || 0;
      totalPages = Math.min(Math.ceil(total / PER_PAGE), Math.ceil(limit / PER_PAGE) + 2);
      console.log(`  LOC: ${total} total items, ${totalPages} pages`);
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

    process.stdout.write(`  LOC: ${results.length}/${limit} (page ${page}/${totalPages})\r`);
    page++;
  }

  console.log(`\n  LOC: ✓ ${results.length} items`);
  return results;
}

// ─── RIJKSMUSEUM ──────────────────────────────────────────────────────────────
// params.type → type=affiche (poster) | prent (print) | schilderij (painting) | foto (photo)
// params.q   → q=* (wildcard required — without it returns 0 results)

async function fetchRijks(config: any): Promise<any[]> {
  const key  = process.env.RIJKS_API_KEY || '0fiuZFh4';
  const { params, limit = 200 } = config;
  const results: any[] = [];
  let page = 1;

  while (results.length < limit && page <= 30) {
    await sleep(400);
    const q    = params.q || '*';
    const type = params.type || 'prent';
    const url  = `https://www.rijksmuseum.nl/api/en/collection?key=${key}&q=${encodeURIComponent(q)}&type=${encodeURIComponent(type)}&imgonly=true&ps=100&p=${page}`;

    const data = await get(url);
    if (!data) { console.warn(`  Rijks: null response (key may be rate-limited)`); break; }
    if (!data.artObjects?.length) break;

    results.push(...data.artObjects.slice(0, limit - results.length));
    process.stdout.write(`  Rijks: ${results.length}/${limit}\r`);
    page++;
  }

  console.log(`\n  Rijks: ✓ ${results.length} items`);
  return results;
}

// ─── HARVARD ART MUSEUMS ──────────────────────────────────────────────────────
// params.keyword        → /object?keyword=poster
// params.classification_id → /object?classification_id=21

async function fetchHarvard(config: any): Promise<any[]> {
  const key = process.env.HARVARD_API_KEY;
  if (!key) { console.warn('  Harvard: no HARVARD_API_KEY in .env.local'); return []; }

  const { params, limit = 200 } = config;
  const results: any[] = [];
  let page = 1;

  while (results.length < limit && page <= 30) {
    await sleep(400);

    let qParam: string;
    if (params.worktype)         qParam = `worktype=${encodeURIComponent(params.worktype)}`;
    else if (params.classification) qParam = `classification=${encodeURIComponent(params.classification)}`;
    else if (params.keyword)     qParam = `keyword=${encodeURIComponent(params.keyword)}`;
    else if (params.technique)   qParam = `technique=${encodeURIComponent(params.technique)}`;
    else if (params.classification_id) qParam = `classification_id=${params.classification_id}`;
    else qParam = 'keyword=poster';

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
// params.query → free text, e.g. "poster OR affiche OR plakat"
// Cursor-based pagination. qf=TYPE:IMAGE + reusability=open enforced always.

async function fetchEuropeana(config: any): Promise<any[]> {
  const key = process.env.EUROPEANA_API_KEY;
  if (!key) { console.warn('  Europeana: no EUROPEANA_API_KEY in .env.local'); return []; }

  const { params, limit = 200 } = config;
  const query  = params.query || 'poster';
  const results: any[] = [];
  let cursor   = '*';

  while (results.length < limit) {
    await sleep(400);
    const url = `https://api.europeana.eu/record/v2/search.json?wskey=${key}` +
      `&query=${encodeURIComponent(query)}&qf=TYPE:IMAGE&reusability=open&media=true&rows=100` +
      `&cursor=${encodeURIComponent(cursor)}`;

    const data = await get(url);
    if (!data?.items?.length) break;

    results.push(...data.items.slice(0, limit - results.length));
    cursor = data.nextCursor || '';
    if (!cursor) break;
    process.stdout.write(`  Europeana: ${results.length}/${limit}\r`);
    await sleep(200);
  }

  console.log(`\n  Europeana: ✓ ${results.length} items`);
  return results;
}

// ─── WELLCOME COLLECTION ──────────────────────────────────────────────────────
// params.workType → k = Pictures/Visual Works (broadest type that includes posters)
// No query= filter — workType handles it; query=poster also matches "four-poster bed"

async function fetchWellcome(config: any): Promise<any[]> {
  const { params, limit = 200 } = config;
  const workType = params.workType || 'k';
  const query    = params.query ? `&query=${encodeURIComponent(params.query)}` : '';
  const results: any[] = [];
  let page = 1;

  while (results.length < limit && page <= 20) {
    await sleep(500);
    const url = `https://api.wellcomecollection.org/catalogue/v2/works` +
      `?workType=${workType}${query}&pageSize=100&page=${page}&include=subjects,contributors`;

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
// params.subject  → subject:(poster)
// params.mediatype → image OR texts (default: image)

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
    const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(q)}` +
      `&fl[]=identifier,title,creator,date,mediatype,collection,subject&rows=100&page=${page}&output=json`;

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
// params.typeFilter   → filter by type/classification field value ("poster")
// params.department_id → filter by dept ID (for non-poster harvests)
// Weighted ID probing against GitHub raw collection dump

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

  // Resume from existing manifest
  const resumePath = path.join(process.cwd(), 'public', 'manifests', '_cooper_seen.json');
  if (fs.existsSync(resumePath)) {
    const ids = JSON.parse(fs.readFileSync(resumePath, 'utf8'));
    ids.forEach((id: string) => seen.add(id));
    console.log(`  Cooper: resuming — ${seen.size} IDs already probed`);
  }

  console.log(`  Cooper: probing for ${limit} items...`);

  while (results.length < limit) {
    const batchIds = Array.from({ length: BATCH }, () => cooperWeightedId());

    const batchResults = await Promise.all(batchIds.map(async (id) => {
      const sId = String(id);
      const url = `https://raw.githubusercontent.com/cooperhewitt/collection/master/objects/` +
        `${sId.slice(0,3)}/${sId.slice(3,6)}/${sId.slice(6)}/${id}.json`;
      return await get(url, 4000);
    }));

    for (const obj of batchResults) {
      if (!obj?.images?.length) continue;
      if (seen.has(String(obj.id))) continue;
      seen.add(String(obj.id));

      // Apply filter
      if (typeFilter) {
        const type = (obj.type || '').toLowerCase();
        const cls  = (obj.classification || '').toLowerCase();
        const med  = (obj.medium || '').toLowerCase();
        const dept = (obj.department?.name || '').toLowerCase();
        // Extended match logic per filter type
        const matches =
          type.includes(typeFilter) ||
          cls.includes(typeFilter) ||
          dept.includes(typeFilter) ||
          (typeFilter === 'poster' && (
            cls.includes('advertisement') || cls.includes('trade card') ||
            cls.includes('printed ephemera') || med.includes('lithograph') ||
            med.includes('screenprint') || med.includes('letterpress')
          )) ||
          (typeFilter === 'textile' && (
            cls.includes('fabric') || cls.includes('lace') || cls.includes('tapestry') ||
            cls.includes('embroidery') || cls.includes('carpet') || cls.includes('weaving') ||
            dept.includes('textile')
          )) ||
          (typeFilter === 'graphic design' && (
            cls.includes('graphic') || cls.includes('print') || cls.includes('ephemera') ||
            dept.includes('graphic') || dept.includes('drawing')
          )) ||
          (typeFilter === 'jewelry' && (
            cls.includes('jewel') || cls.includes('ornament') || cls.includes('brooch') ||
            cls.includes('necklace') || cls.includes('ring')
          )) ||
          (typeFilter === 'ceramic' && (
            cls.includes('ceramic') || cls.includes('porcelain') || cls.includes('pottery') ||
            cls.includes('earthenware') || cls.includes('glass')
          )) ||
          (typeFilter === 'product' && (
            cls.includes('product') || cls.includes('industrial') || cls.includes('furniture') ||
            cls.includes('lamp') || cls.includes('clock') || dept.includes('product')
          ));
        if (!matches) continue;
      } else if (deptFilter && obj.department_id !== deptFilter) {
        continue;
      }

      results.push(obj);
    }

    process.stdout.write(`  Cooper: ${results.length}/${limit}\r`);
    await sleep(100);
  }

  // Save seen IDs for next resume
  fs.writeFileSync(resumePath, JSON.stringify(Array.from(seen)));

  console.log(`\n  Cooper: ✓ ${results.length} items`);
  return results.slice(0, limit);
}

// ─── WIKIMEDIA COMMONS ────────────────────────────────────────────────────────
// params.category → Category:Posters | Category:Photographs | etc.

async function fetchWikimedia(config: any): Promise<any[]> {
  const { params, limit = 200 } = config;
  const category = params.category || 'Posters';
  const results: any[] = [];
  let cmcontinue = '';

  while (results.length < limit) {
    await sleep(400);
    const continueParam = cmcontinue ? `&cmcontinue=${encodeURIComponent(cmcontinue)}` : '';
    const listUrl = `https://commons.wikimedia.org/w/api.php?action=query&list=categorymembers` +
      `&cmtitle=Category:${encodeURIComponent(category)}&cmtype=file&cmlimit=100&format=json${continueParam}`;

    const listData = await get(listUrl);
    if (!listData?.query?.categorymembers?.length) break;

    const pageIds = listData.query.categorymembers.map((m: any) => m.pageid).join('|');
    if (!pageIds) break;

    const iiData = await get(`https://commons.wikimedia.org/w/api.php?action=query&pageids=${pageIds}` +
      `&prop=imageinfo&iiprop=url|size|extmetadata&iiurlwidth=800&format=json`);

    const pages = Object.values(iiData?.query?.pages || {}) as any[];
    for (const pg of pages) {
      if (results.length >= limit) break;
      const ii = pg.imageinfo?.[0];
      if (!ii?.url || (ii.width || 0) < 200) continue;
      results.push({ pageid: pg.pageid, title: pg.title, imageinfo: [ii] });
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
// Entire site is graphic design. WP REST API with _embed for taxonomy terms.

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
      console.log(`  DR: ${data.headers['x-wp-total'] || '?'} total posts, ${totalPages} pages`);
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
// Mastodon API on typo.social. Account IDs resolved dynamically.

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
      const continueParam = maxId ? `&max_id=${maxId}` : '';
      const url = `https://typo.social/api/v1/accounts/${accountId}/statuses` +
        `?limit=40&exclude_replies=true&exclude_reblogs=true${continueParam}`;

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
// params.q → free text search

async function fetchSmithsonian(config: any): Promise<any[]> {
  const key  = process.env.SMITHSONIAN_API_KEY;
  const { params, limit = 200 } = config;
  const q    = params.q || 'poster';
  const unit = params.unit_code || '';
  const type = params.type || '';
  const results: any[] = [];
  let start  = 0;

  while (results.length < limit) {
    await sleep(500);
    const base = 'https://api.si.edu/openaccess/api/v1.0/search';
    let url = key
      ? `${base}?api_key=${key}&q=${encodeURIComponent(q)}&rows=100&start=${start}`
      : `${base}?q=${encodeURIComponent(q)}&rows=100&start=${start}`;
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

  while (results.length < limit && offset <= limit * 2) {
    await sleep(500);
    const url = `https://api.nga.gov/art/tms/objects?classification=${encodeURIComponent(params.classification || 'Painting')}&offset=${offset}&limit=100`;
    const data = await get(url);
    if (!data?.items?.length) break;
    results.push(...data.items.slice(0, limit - results.length));
    process.stdout.write(`  NGA: ${results.length}/${limit}\r`);
    offset += 100;
  }

  console.log(`\n  NGA: ✓ ${results.length} items`);
  return results;
}

// ─── NYPL ──────────────────────────────────────────────────────────────────────
// New York Public Library Digital Collections API v2
// params.subject     → subject filter (e.g. "posters", "photographs")
// Requires NYPL_API_KEY env var (free at digitalcollections.nypl.org/developers)

async function fetchNYPL(config: any): Promise<any[]> {
  const key = process.env.NYPL_API_KEY;
  if (!key) { console.warn('  NYPL: no NYPL_API_KEY — skipping'); return []; }

  const { params, limit = 200 } = config;
  const subject = params.subject || 'posters';
  const results: any[] = [];
  let page = 1;

  while (results.length < limit && page <= 20) {
    await sleep(600);
    // NYPL v2 API uses Basic auth via token
    const url = `https://api.nypl.org/api/v2/items/search?q=${encodeURIComponent(subject)}&per_page=100&page=${page}&token=${key}`;
    const data = await get(url);
    const items = data?.nyplAPI?.response?.result || [];
    if (!items.length) break;

    for (const item of items) {
      if (results.length >= limit) break;
      // NYPL item needs an imageID
      if (!item.imageID?.length && !Array.isArray(item.imageID)) continue;
      results.push(item);
    }
    process.stdout.write(`  NYPL: ${results.length}/${limit}\r`);
    page++;
  }

  console.log(`\n  NYPL: ✓ ${results.length} items`);
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
  // Note: aif, ada, harvardme, palarchive, translatio, auc need custom fetch logic.
  // These are intentionally left with empty fallbacks — add fetchers as those
  // APIs become accessible.
  aif:            async () => [],
  ada:            async () => [],
  harvardme:      async () => [],
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