import 'dotenv/config';
import https from 'https';
import fs from 'fs';
import path from 'path';

// ─── Utilities ────────────────────────────────────────────────────────────────

const UAS = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_3_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3.1 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0',
];
const ua = () => UAS[Math.floor(Math.random() * UAS.length)];
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms + Math.random() * ms * 0.3));

function getJson(url: string, timeout = 20000): Promise<any> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => { try { req.destroy(); } catch {} resolve(null); }, timeout);
    const req = https.get(url, {
      headers: {
        'User-Agent': ua(),
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
        'Connection': 'keep-alive',
      }
    }, (res) => {
      // Follow redirects
      if ([301, 302, 303, 307, 308].includes(res.statusCode!) && res.headers.location) {
        clearTimeout(timer);
        const loc = res.headers.location.startsWith('http')
          ? res.headers.location
          : `https://${new URL(url).host}${res.headers.location}`;
        resolve(getJson(loc, timeout));
        return;
      }
      // Rate limit — return sentinel
      if (res.statusCode === 429) {
        clearTimeout(timer);
        const wait = parseInt(res.headers['retry-after'] || '60') * 1000;
        resolve({ _rateLimit: true, wait });
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
    req.on('error', (e: Error) => { clearTimeout(timer); console.warn(`  net err: ${e.message}`); resolve(null); });
  });
}

// Helper: fetch JSON + response headers (needed for WP X-WP-TotalPages)
function getJsonWithHeaders(url: string): Promise<{ body: any; headers: Record<string, string> } | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => { try { req.destroy(); } catch {} resolve(null); }, 25000);
    const req = https.get(url, {
      headers: { 'User-Agent': ua(), 'Accept': 'application/json' }
    }, (res) => {
      if (res.statusCode === 429) { clearTimeout(timer); resolve(null); return; }
      const chunks: Buffer[] = [];
      res.on('data', (c: Buffer) => chunks.push(c));
      res.on('end', () => {
        clearTimeout(timer);
        if (res.statusCode !== 200) { resolve(null); return; }
        try {
          resolve({ body: JSON.parse(Buffer.concat(chunks).toString()), headers: res.headers as any });
        } catch { resolve(null); }
      });
    });
    req.on('error', () => { clearTimeout(timer); resolve(null); });
  });
}

// ─── COOPER HEWITT ────────────────────────────────────────────────────────────
// No API key required. Weighted ID probing against the GitHub raw collection
// dump. 4-tier probability distribution confirmed working from old harvest.

function getCooperWeightedId(): number {
  const r = Math.random();
  if (r < 0.60) return Math.floor(Math.random() * (18850000 - 18600000) + 18600000); // 60% modern
  if (r < 0.85) return Math.floor(Math.random() * (18600000 - 18400000) + 18400000); // 25% mid
  if (r < 0.95) return Math.floor(Math.random() * (18400000 - 18200000) + 18200000); // 10% early modern
  return Math.floor(Math.random() * (18200000 - 18000000) + 18000000);               //  5% older
}

async function fetchCooper(config: any): Promise<any[]> {
  const TARGET = config.limit || 300;
  const BATCH  = 60;
  const results: any[] = [];
  const seen = new Set<string>();

  // Resume from existing manifest if present
  const manifestPath = path.join(process.cwd(), 'public', 'manifests', 'cooperhewitt.json');
  if (fs.existsSync(manifestPath)) {
    const existing = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    existing.forEach((item: any) => seen.add(item.id));
    console.log(`  Cooper: resuming — ${seen.size} already harvested`);
  }

  console.log(`  Cooper: targeting ${TARGET} items in batches of ${BATCH}...`);

  while (results.length < TARGET) {
    const batchIds = Array.from({ length: BATCH }, () => getCooperWeightedId());
    const batch = await Promise.all(batchIds.map(async (id) => {
      const sId = String(id);
      const url =
        `https://raw.githubusercontent.com/cooperhewitt/collection/master/objects/` +
        `${sId.substring(0, 3)}/${sId.substring(3, 6)}/${sId.substring(6)}/${id}.json`;
      return await getJson(url, 5000);
    }));

    for (const obj of batch) {
      if (!obj || !obj.images?.length) continue;
      const key = `ch-${obj.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      results.push(obj);
    }

    process.stdout.write(`  Cooper: ${results.length}/${TARGET}\r`);
    await sleep(200);
  }

  console.log(`\n  Cooper: ✓ ${results.length} items`);
  return results;
}

// ─── MET ──────────────────────────────────────────────────────────────────────
// Public API, no key. Per-object fetches with 1s delay and 15s timeout.
// departmentId drives the category; optional subFilter narrows by search term.

async function fetchMet(config: any): Promise<any[]> {
  const { filterId, filterType, subFilter } = config;
  const TARGET = config.limit || 200;

  const searchUrl = subFilter
    ? `https://collectionapi.metmuseum.org/public/collection/v1/search?hasImages=true&departmentId=${filterId}&q=${encodeURIComponent(subFilter)}`
    : `https://collectionapi.metmuseum.org/public/collection/v1/objects?${filterType}=${filterId}`;

  const search = await getJson(searchUrl);
  const ids: number[] = (search?.objectIDs || []).slice(0, TARGET * 2);

  if (!ids.length) { console.warn(`  MET: no IDs returned`); return []; }

  const results: any[] = [];
  for (const id of ids) {
    if (results.length >= TARGET) break;
    await sleep(1000);
    const obj = await getJson(
      `https://collectionapi.metmuseum.org/public/collection/v1/objects/${id}`,
      15000
    );
    if (!obj || !obj.primaryImage) continue;
    results.push(obj);
    process.stdout.write(`  MET: ${results.length}/${TARGET}\r`);
  }

  console.log(`\n  MET: ✓ ${results.length} items`);
  return results;
}

// ─── ART INSTITUTE OF CHICAGO ─────────────────────────────────────────────────
// Public API, no key. MUST use query[term][is_public_domain]=true (Elasticsearch
// syntax). Plain is_public_domain=true is silently ignored by their backend and
// causes the IIIF server to return placeholder boxes for restricted works.

async function fetchArtic(config: any): Promise<any[]> {
  const { filterId, filterType } = config;
  const TARGET = config.limit || 200;
  const FIELDS = [
    'id', 'title', 'image_id', 'artist_display', 'date_display',
    'medium_display', 'artwork_type_title', 'classification_title',
    'style_title', 'place_of_origin', 'department_title',
  ].join(',');

  const results: any[] = [];
  let page = 1;

  while (results.length < TARGET && page <= 40) {
    await sleep(800);
    const url =
      `https://api.artic.edu/api/v1/artworks/search` +
      `?query[bool][must][0][term][is_public_domain]=true` +
      `&query[bool][must][1][term][${filterType}]=${filterId}` +
      `&fields=${FIELDS}&limit=100&page=${page}`;

    const data = await getJson(url);
    if (!data?.data?.length) break;

    for (const item of data.data) {
      if (results.length >= TARGET) break;
      if (!item.image_id) continue;
      results.push(item);
    }

    process.stdout.write(`  ARTIC: ${results.length}/${TARGET}\r`);
    page++;
  }

  console.log(`\n  ARTIC: ✓ ${results.length} items`);
  return results;
}

// ─── RIJKSMUSEUM ──────────────────────────────────────────────────────────────
// Uses the public demo key already present in your codebase (src/lib/archives/rijks.js).
// Override via RIJKS_API_KEY in .env if you get your own key — otherwise works as-is.

async function fetchRijks(config: any): Promise<any[]> {
  const key = process.env.RIJKS_API_KEY || '0fiuZFh4';
  const { filterId } = config;
  const TARGET = config.limit || 150;
  const results: any[] = [];
  let page = 1;

  while (results.length < TARGET && page <= 20) {
    await sleep(500);
    const url =
      `https://www.rijksmuseum.nl/api/en/collection?key=${key}` +
      `&type=${filterId}&imgonly=True&ps=100&p=${page}`;
    const data = await getJson(url);
    if (!data?.artObjects?.length) break;
    results.push(...data.artObjects.slice(0, TARGET - results.length));
    process.stdout.write(`  Rijks: ${results.length}/${TARGET}\r`);
    page++;
  }

  console.log(`\n  Rijks: ✓ ${results.length} items`);
  return results;
}

// ─── HARVARD ART MUSEUMS ──────────────────────────────────────────────────────
// Requires a free API key. Register at harvardartmuseums.org/collections/api
// (instant email delivery). If key is missing, skips gracefully.

async function fetchHarvard(config: any): Promise<any[]> {
  const key = process.env.HARVARD_API_KEY;
  if (!key) {
    console.warn('  Harvard: no HARVARD_API_KEY in .env — skipping.');
    console.warn('  Get a free key at: https://harvardartmuseums.org/collections/api');
    return [];
  }

  const { filterId, filterType } = config;
  const TARGET = config.limit || 150;
  const results: any[] = [];
  let page = 1;

  while (results.length < TARGET && page <= 20) {
    await sleep(500);
    const url =
      `https://api.harvardartmuseums.org/object` +
      `?${filterType}=${filterId}&size=100&page=${page}&apikey=${key}&hasimage=1`;
    const data = await getJson(url);
    if (!data?.records?.length) break;
    results.push(
      ...data.records
        .filter((r: any) => r.primaryimageurl)
        .slice(0, TARGET - results.length)
    );
    process.stdout.write(`  Harvard: ${results.length}/${TARGET}\r`);
    page++;
  }

  console.log(`\n  Harvard: ✓ ${results.length} items`);
  return results;
}

// ─── V&A MUSEUM ───────────────────────────────────────────────────────────────
// Two-step: search list → detail per item. The detail call is mandatory —
// it gives us categories[0].name for real classification. Skip it and
// classification is always empty. No key required.

async function fetchVA(config: any): Promise<any[]> {
  const { filterId } = config;
  const TARGET = config.limit || 200;
  const isThesId = /^THES/.test(filterId);
  const BATCH_SIZE = 5;
  const allItems = new Map<string, any>();

  let page = 1;
  while (allItems.size < TARGET && page <= 15) {
    await sleep(1000);

    const url = isThesId
      ? `https://api.vam.ac.uk/v2/objects/search?id_category=${filterId}&images_exist=true&page_size=100&page=${page}`
      : `https://api.vam.ac.uk/v2/objects/search?q=${encodeURIComponent(filterId)}&images_exist=true&page_size=100&page=${page}`;

    const data = await getJson(url);
    if (!data?.records?.length) break;

    const needed = data.records
      .filter((item: any) => item._images?._primary_thumbnail)
      .filter((item: any) => !allItems.has(`va-${item.systemNumber}`))
      .slice(0, TARGET - allItems.size);

    if (!needed.length) { page++; continue; }

    // Fetch detail records in small batches to get proper classification
    for (let i = 0; i < needed.length; i += BATCH_SIZE) {
      const batch = needed.slice(i, i + BATCH_SIZE);
      const details = await Promise.all(
        batch.map((item: any) =>
          getJson(`https://api.vam.ac.uk/v2/object/${item.systemNumber}`)
        )
      );

      for (let j = 0; j < details.length; j++) {
        const detail = details[j]?.record || details[j] || null;
        const searchItem = batch[j];
        if (!detail) continue;
        // Merge search item + detail — adapter uses both
        allItems.set(
          `va-${searchItem.systemNumber}`,
          { ...searchItem, ...detail, systemNumber: searchItem.systemNumber }
        );
      }

      await sleep(500);
    }

    process.stdout.write(`  V&A: ${allItems.size}/${TARGET}\r`);
    page++;
  }

  console.log(`\n  V&A: ✓ ${allItems.size} items`);
  return Array.from(allItems.values());
}

// ─── LIBRARY OF CONGRESS ──────────────────────────────────────────────────────
// Free, no key. CONFIRMED endpoint: /search/?fa=original-format:poster&fo=json
// Image upgrade: _150px → _1024px. User-agent rotation. 429 handling.

async function fetchLOC(config: any): Promise<any[]> {
  const { filterId } = config;
  const TARGET  = config.limit || 300;
  const PER_PAGE = 100;
  const FA_MAP: Record<string, string> = {
    pos: 'original-format:poster',
    pho: 'original-format:photograph',
    app: 'original-format:print',
    ser: 'original-format:periodical',
  };
  const fa = FA_MAP[filterId] || `original-format:${filterId}`;

  const results: any[] = [];
  const seen = new Set<string>();
  let page = 1;
  let totalPages = 1;

  while (results.length < TARGET && page <= totalPages) {
    await sleep(2000 + Math.random() * 1000);

    const url =
      `https://www.loc.gov/search/?fo=json` +
      `&fa=${encodeURIComponent(fa)}&c=${PER_PAGE}&sp=${page}`;

    const data = await getJson(url);
    if (!data) { page++; continue; }

    if ((data as any)._rateLimit) {
      console.warn(`  LOC: rate limited, waiting ${(data as any).wait / 1000}s...`);
      await sleep((data as any).wait);
      continue;
    }

    if (page === 1) {
      totalPages = data.pagination?.total_pages || 1;
      console.log(`  LOC: ${data.pagination?.total || 0} total results, ${totalPages} pages`);
    }

    for (const result of (data.results || [])) {
      if (results.length >= TARGET) break;
      if (!result.image_url?.length) continue;
      if (seen.has(result.id)) continue;
      seen.add(result.id);
      results.push(result);
    }

    process.stdout.write(`  LOC: ${results.length}/${TARGET} (page ${page}/${totalPages})\r`);
    page++;
  }

  console.log(`\n  LOC: ✓ ${results.length} items`);
  return results;
}

// ─── WIKIMEDIA COMMONS ────────────────────────────────────────────────────────
// Public API, no key. Category members via imageinfo.

async function fetchWikimedia(config: any): Promise<any[]> {
  const { filterId } = config;
  const TARGET = config.limit || 150;
  const results: any[] = [];
  let cmcontinue = '';

  while (results.length < TARGET) {
    await sleep(500);
    const continueParam = cmcontinue ? `&cmcontinue=${encodeURIComponent(cmcontinue)}` : '';
    const listUrl =
      `https://commons.wikimedia.org/w/api.php?action=query&list=categorymembers` +
      `&cmtitle=Category:${encodeURIComponent(filterId)}&cmtype=file&cmlimit=100` +
      `&format=json${continueParam}`;

    const listData = await getJson(listUrl);
    if (!listData?.query?.categorymembers?.length) break;

    const pageIds = listData.query.categorymembers.map((m: any) => m.pageid).join('|');
    if (!pageIds) break;

    const iiUrl =
      `https://commons.wikimedia.org/w/api.php?action=query&pageids=${pageIds}` +
      `&prop=imageinfo&iiprop=url|extmetadata&format=json`;
    const iiData = await getJson(iiUrl);
    const pageObjs = Object.values(iiData?.query?.pages || {}) as any[];

    for (const pg of pageObjs) {
      if (results.length >= TARGET) break;
      const ii = pg.imageinfo?.[0];
      if (!ii?.url) continue;
      results.push({ pageid: pg.pageid, title: pg.title, imageinfo: [ii] });
    }

    cmcontinue =
      listData['query-continue']?.categorymembers?.cmcontinue ||
      listData.continue?.cmcontinue || '';
    if (!cmcontinue) break;
    process.stdout.write(`  Wikimedia: ${results.length}/${TARGET}\r`);
  }

  console.log(`\n  Wikimedia: ✓ ${results.length} items`);
  return results;
}

// ─── EUROPEANA ────────────────────────────────────────────────────────────────
// Free API key — register at api.europeana.eu. Cursor-based pagination.

async function fetchEuropeana(config: any): Promise<any[]> {
  const key = process.env.EUROPEANA_API_KEY;
  if (!key) {
    console.warn('  Europeana: no EUROPEANA_API_KEY in .env — skipping.');
    console.warn('  Get a free key at: https://api.europeana.eu');
    return [];
  }

  const { filterId, filterType } = config;
  const TARGET = config.limit || 150;
  const results: any[] = [];
  let cursor = '*';

  while (results.length < TARGET) {
    await sleep(500);
    const url =
      `https://api.europeana.eu/record/v2/search.json?wskey=${key}` +
      `&query=*&qf=${filterType}:${filterId}&rows=100` +
      `&cursor=${encodeURIComponent(cursor)}&profile=rich&media=true`;

    const data = await getJson(url);
    if (!data?.items?.length) break;

    results.push(...data.items.slice(0, TARGET - results.length));
    cursor = data.nextCursor || '';
    if (!cursor) break;
    process.stdout.write(`  Europeana: ${results.length}/${TARGET}\r`);
  }

  console.log(`\n  Europeana: ✓ ${results.length} items`);
  return results;
}

// ─── WELLCOME COLLECTION ──────────────────────────────────────────────────────
// Free public API, no key needed.

async function fetchWellcome(config: any): Promise<any[]> {
  const { filterId } = config;
  const TARGET = config.limit || 100;
  const results: any[] = [];
  let page = 1;

  while (results.length < TARGET && page <= 15) {
    await sleep(600);
    const url =
      `https://api.wellcomecollection.org/catalogue/v2/works` +
      `?workType=${encodeURIComponent(filterId)}&pageSize=100&page=${page}` +
      `&include=images,subjects,contributors`;

    const data = await getJson(url);
    if (!data?.results?.length) break;

    for (const item of data.results) {
      if (results.length >= TARGET) break;
      if (!item.thumbnail?.url) continue;
      results.push(item);
    }

    process.stdout.write(`  Wellcome: ${results.length}/${TARGET}\r`);
    page++;
  }

  console.log(`\n  Wellcome: ✓ ${results.length} items`);
  return results;
}

// ─── INTERNET ARCHIVE ─────────────────────────────────────────────────────────
// Free Solr endpoint. Works for any collection or subject query.
// Used for both ia.ts (general) and rave.ts (rave-flyers collection).

async function fetchIA(config: any): Promise<any[]> {
  const { filterId, filterType } = config;
  const TARGET = config.limit || 150;
  const results: any[] = [];
  let page = 1;

  while (results.length < TARGET && page <= 10) {
    await sleep(700);
    const q = filterType === 'collection'
      ? `collection:(${filterId}) AND mediatype:image`
      : `subject:(${filterId}) AND mediatype:image`;

    const url =
      `https://archive.org/advancedsearch.php?q=${encodeURIComponent(q)}` +
      `&fl[]=identifier,title,creator,date,mediatype,collection,subject` +
      `&rows=100&page=${page}&output=json`;

    const data = await getJson(url);
    if (!data?.response?.docs?.length) break;

    for (const doc of data.response.docs) {
      if (results.length >= TARGET) break;
      results.push(doc);
    }

    process.stdout.write(`  IA: ${results.length}/${TARGET}\r`);
    page++;
  }

  console.log(`\n  IA: ✓ ${results.length} items`);
  return results;
}

// ─── DESIGN REVIEWED ──────────────────────────────────────────────────────────
// WordPress REST API with _embed=true. Reads X-WP-TotalPages for pagination.
// No scraping — all data comes from WP taxonomy terms and featured media.

async function fetchDesignReviewed(config: any): Promise<any[]> {
  const TARGET = config.limit || 500;
  const results: any[] = [];
  let page = 1;
  let totalPages = 1;

  while (results.length < TARGET && page <= totalPages) {
    await sleep(800);
    const url =
      `https://designreviewed.com/wp-json/wp/v2/artefacts?_embed=true&per_page=100&page=${page}`;

    const pageData = await getJsonWithHeaders(url);
    if (!pageData) { page++; continue; }

    if (page === 1 && pageData.headers?.['x-wp-totalpages']) {
      totalPages = Math.min(
        parseInt(pageData.headers['x-wp-totalpages']),
        Math.ceil(TARGET / 100) + 1
      );
      console.log(
        `  DR: ${pageData.headers['x-wp-total'] || '?'} total posts, ${totalPages} pages`
      );
    }

    for (const post of (pageData.body || [])) {
      if (results.length >= TARGET) break;
      results.push(post);
    }

    process.stdout.write(`  DesignReviewed: ${results.length}/${TARGET}\r`);
    page++;
  }

  console.log(`\n  DesignReviewed: ✓ ${results.length} items`);
  return results;
}

// ─── LETTERFORM ARCHIVE ───────────────────────────────────────────────────────
// Mastodon/typo.social bot API — paginated by max_id.
// No key needed. ~2s delay is safe within rate limits.
// The adapter will filter out type specimens and null posts.

async function fetchLetterform(config: any): Promise<any[]> {
  const ACCOUNT_ID = '109303745934337359'; // Confirmed LFA bot account on typo.social
  const TARGET = config.limit || 800;
  const results: any[] = [];
  let maxId = '';

  while (results.length < TARGET) {
    await sleep(2000);
    const continueParam = maxId ? `&max_id=${maxId}` : '';
    const url =
      `https://typo.social/api/v1/accounts/${ACCOUNT_ID}/statuses?limit=40${continueParam}`;

    const data = await getJson(url);
    if (!Array.isArray(data) || !data.length) break;

    results.push(...data);
    maxId = data[data.length - 1].id;
    process.stdout.write(`  Letterform: ${results.length} statuses fetched\r`);
  }

  console.log(`\n  Letterform: ✓ ${results.length} raw statuses (adapter will filter)`);
  return results;
}

// ─── NYPL ─────────────────────────────────────────────────────────────────────
// NYPL Digital Collections API v2. Free token from digitalcollections.nypl.org.

async function fetchNYPL(config: any): Promise<any[]> {
  const token = process.env.NYPL_API_TOKEN;
  if (!token) {
    console.warn('  NYPL: no NYPL_API_TOKEN in .env — skipping.');
    return [];
  }

  const { filterId } = config;
  const TARGET = config.limit || 100;
  const results: any[] = [];
  let page = 1;

  while (results.length < TARGET && page <= 10) {
    await sleep(700);
    const url =
      `https://api.nypl.org/api/v2/items/search` +
      `?q=${encodeURIComponent(filterId)}&page=${page}&per_page=100`;

    const data = await getJson(url);
    if (!data?.nyplAPI?.response?.result?.length) break;

    for (const item of data.nyplAPI.response.result) {
      if (results.length >= TARGET) break;
      results.push(item);
    }

    process.stdout.write(`  NYPL: ${results.length}/${TARGET}\r`);
    page++;
  }

  console.log(`\n  NYPL: ✓ ${results.length} items`);
  return results;
}

// ─── SMITHSONIAN ──────────────────────────────────────────────────────────────
// Works without a key via the public Open Access endpoint.
// Optional SMITHSONIAN_API_KEY in .env gives higher rate limits.

async function fetchSmithsonian(config: any): Promise<any[]> {
  const key = process.env.SMITHSONIAN_API_KEY;
  const { filterId } = config;
  const TARGET = config.limit || 100;
  const results: any[] = [];
  let start = 0;

  while (results.length < TARGET) {
    await sleep(600);
    const base = `https://api.si.edu/openaccess/api/v1.0/search`;
    const url = key
      ? `${base}?api_key=${key}&q=${encodeURIComponent(filterId)}&rows=100&start=${start}`
      : `${base}?q=${encodeURIComponent(filterId)}&rows=100&start=${start}`;

    const data = await getJson(url);
    const rows = data?.response?.rows || [];
    if (!rows.length) break;

    results.push(...rows.slice(0, TARGET - results.length));
    start += rows.length;
    process.stdout.write(`  Smithsonian: ${results.length}/${TARGET}\r`);
  }

  console.log(`\n  Smithsonian: ✓ ${results.length} items`);
  return results;
}

// ─── NGA ──────────────────────────────────────────────────────────────────────
// NGA Open Access REST API. Free, no key required.

async function fetchNGA(config: any): Promise<any[]> {
  const { filterId } = config;
  const TARGET = config.limit || 100;
  const results: any[] = [];
  let page = 0;

  while (results.length < TARGET && page <= 10) {
    await sleep(600);
    const url =
      `https://api.nga.gov/art/tms/objects` +
      `?classification=${encodeURIComponent(filterId)}&offset=${page * 100}&limit=100`;

    const data = await getJson(url);
    if (!data?.items?.length) break;

    for (const item of data.items) {
      if (results.length >= TARGET) break;
      results.push(item);
    }

    process.stdout.write(`  NGA: ${results.length}/${TARGET}\r`);
    page++;
  }

  console.log(`\n  NGA: ✓ ${results.length} items`);
  return results;
}

// ─── GETTY ────────────────────────────────────────────────────────────────────
// Getty Open Content via Linked Art. Each item is enriched with a detail call
// to get the full IIIF image service URL.

async function fetchGetty(config: any): Promise<any[]> {
  const { filterId } = config;
  const TARGET = config.limit || 80;
  const results: any[] = [];
  let page = 0;

  while (results.length < TARGET && page <= 5) {
    await sleep(700);
    const url =
      `https://data.getty.edu/museum/collection/search` +
      `?classification=${encodeURIComponent(filterId)}&offset=${page * 100}&limit=100`;

    const data = await getJson(url);
    const items = data?.items || data?.['@graph'] || [];
    if (!items.length) break;

    results.push(...items.slice(0, TARGET - results.length));
    process.stdout.write(`  Getty: ${results.length}/${TARGET}\r`);
    page++;
  }

  // Enrich: fetch full Linked Art record per item for IIIF image URL
  console.log(`\n  Getty: enriching ${results.length} items...`);
  const enriched: any[] = [];
  for (const item of results) {
    const id = item.id || item['@id'] || '';
    if (!id) continue;
    await sleep(300);
    const detail = await getJson(id);
    if (detail) enriched.push(detail);
  }

  console.log(`  Getty: ✓ ${enriched.length} enriched items`);
  return enriched;
}

// ─── DISPATCHER ───────────────────────────────────────────────────────────────

const FETCHERS: Record<string, (config: any) => Promise<any[]>> = {
  cooper:         fetchCooper,
  met:            fetchMet,
  artic:          fetchArtic,
  rijks:          fetchRijks,
  harvard:        fetchHarvard,
  va:             fetchVA,
  loc:            fetchLOC,
  wikimedia:      fetchWikimedia,
  europeana:      fetchEuropeana,
  wellcome:       fetchWellcome,
  ia:             fetchIA,
  // rave routes through fetchIA pointing at the rave-flyers IA collection
  rave:           (c) => fetchIA({ ...c, filterType: 'collection', filterId: 'rave-flyers' }),
  designreviewed: fetchDesignReviewed,
  letterform:     fetchLetterform,
  nypl:           fetchNYPL,
  smithsonian:    fetchSmithsonian,
  nga:            fetchNGA,
  getty:          fetchGetty,
};

export async function fetchSourceData(source: string, config: any): Promise<any[]> {
  const fetcher = FETCHERS[source];
  if (!fetcher) {
    console.warn(`  ⚠️  No fetcher registered for "${source}" — skipping`);
    return [];
  }
  try {
    return await fetcher(config);
  } catch (err: any) {
    console.error(`  ❌ fetchSourceData(${source}) threw:`, err.message);
    return [];
  }
}
