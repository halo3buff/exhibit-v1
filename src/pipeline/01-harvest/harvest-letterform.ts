// src/pipeline/01-harvest/harvest-letterformarchive.ts
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import https from 'https';

dotenv.config({ path: '.env.local' });

// ─────────────────────────────────────────────────────────────────────────────
// LETTERFORM ARCHIVE HARVEST — No API key required
//
// Custom REST API. Fully reverse-engineered params:
//
// ITEMS:  GET /api/items?limit=N&offset=N
//   - limit= and offset= are the ONLY working params
//   - rowCount in response = number of rows returned (NOT total collection)
//   - Fetch with limit=9999 to get everything in one shot (~3,666 items, ~2MB)
//
// IMAGES: GET /api/images  (no filter params work — always returns all 27,457)
//   - img_full = relative path → prepend IMAGE_BASE for full URL
//   - ispreferred = 'Y' | 'N'
//   - Join to items on workid field
// ─────────────────────────────────────────────────────────────────────────────

const OUT_DIR    = path.join('data', 'raw', 'letterformarchive');
const IMAGE_BASE = 'https://oa.letterformarchive.org/';
const BATCH_SIZE = 100;

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

function fetchJson(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ArtHarvester/2.0)',
        'Accept':     'application/json',
        'Referer':    'https://oa.letterformarchive.org/',
      },
    }, (res) => {
      if (res.statusCode === 429) {
        const wait = parseInt(res.headers['retry-after'] || '60') * 1000;
        console.log(`   ⏸  Rate limited — waiting ${wait / 1000}s`);
        res.resume();
        setTimeout(() => resolve(fetchJson(url)), wait);
        return;
      }
      if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
        res.resume();
        reject(new Error(`HTTP ${res.statusCode} — ${url.slice(0, 100)}`));
        return;
      }
      let body = '';
      res.setEncoding('utf8');
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); }
        catch { reject(new Error('JSON parse error')); }
      });
    });
    req.on('error', reject);
    req.setTimeout(60000, () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

async function buildImageMap(): Promise<Map<string, string>> {
  console.log('   Fetching all images from /api/images (one shot)...');
  const data = await fetchJson('https://oa.letterformarchive.org/api/images');
  if (!data?.rows?.length) throw new Error('Images endpoint returned no rows');

  const imageMap = new Map<string, string>();
  for (const img of data.rows) {
    const workid: string = img.workid;
    const imgFull: string = img.img_full ?? '';
    if (!workid || !imgFull) continue;
    // ispreferred=Y wins; non-preferred only sets if workid not yet seen
    if (img.ispreferred === 'Y') {
      imageMap.set(workid, IMAGE_BASE + imgFull);
    } else if (!imageMap.has(workid)) {
      imageMap.set(workid, IMAGE_BASE + imgFull);
    }
  }

  console.log(`   ✓ Image map built: ${imageMap.size.toLocaleString()} unique workids`);
  return imageMap;
}

async function main() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║  LETTERFORM ARCHIVE HARVEST — No API Key Required        ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  fs.mkdirSync(OUT_DIR, { recursive: true });

  const seenPath = path.join(OUT_DIR, '.seen-ids.json');
  const seen: Set<string> = new Set(
    fs.existsSync(seenPath) ? JSON.parse(fs.readFileSync(seenPath, 'utf8')) : []
  );
  const fileIndex = { n: seen.size };

  // ── Step 1: Image map ──────────────────────────────────────────────────────
  console.log('📥 Step 1: Building image map...');
  let imageMap: Map<string, string>;
  try {
    imageMap = await buildImageMap();
  } catch (e: any) {
    console.error(`❌ Failed to build image map: ${e.message}`);
    process.exit(1);
  }

  // ── Step 2: Fetch ALL items in one request ─────────────────────────────────
  // rowCount = rows returned in THIS response (not a separate total field).
  // Collection is ~3,666 items (~2MB JSON) — safe to fetch in one shot.
  console.log('\n📥 Step 2: Fetching full item list...');
  let allItems: any[] = [];
  try {
    const data = await fetchJson(
      'https://oa.letterformarchive.org/api/items?limit=9999&offset=0'
    );
    allItems = data?.rows ?? [];
    console.log(`   ✓ Fetched ${allItems.length.toLocaleString()} items total`);
  } catch (e: any) {
    console.error(`❌ Failed to fetch items: ${e.message}`);
    process.exit(1);
  }

  if (allItems.length === 0) {
    console.error('❌ No items returned — check the API');
    process.exit(1);
  }

  // ── Step 3: Process in batches (join image map + save) ────────────────────
  console.log('\n📥 Step 3: Processing and saving...');
  let newCount   = 0;
  let dupeCount  = 0;
  let noImgCount = 0;

  for (let i = 0; i < allItems.length; i += BATCH_SIZE) {
    const batch = allItems.slice(i, i + BATCH_SIZE);

    for (const item of batch) {
      const workid: string = item.workid ?? '';
      if (!workid) continue;

      const id = `letterformarchive-${workid}`;
      if (seen.has(id)) { dupeCount++; continue; }

      if (item.item_has_images !== 'Yes') { noImgCount++; continue; }

      const imageUrl = imageMap.get(workid) ?? '';
      if (!imageUrl) { noImgCount++; continue; }

      const split = (val: string) =>
        (val ?? '').split(';').map((s: string) => s.trim()).filter(Boolean);

      const record = {
        id,
        source:          'letterformarchive',
        title:           item.title        ?? '',
        alt_title:       item.alt_title    ?? '',
        author:          item.all_creators ?? item.all_peopleandfirms ?? '',
        year:            item.year         ?? item.date_txt ?? '',
        decade:          item.decade       ?? '',
        imageUrl,
        url:             item.itempage     ?? `https://oa.letterformarchive.org/item?workID=${workid}`,
        description:     item.description  ?? '',
        measurements:    item.measurements ?? '',
        orientation:     item.orientation  ?? '',
        collection:      item.collection   ?? '',
        source_ref:      item.source       ?? '',
        rights:          item.rights       ?? '',
        subjects:        split(item.all_subjects),
        worktypes:       split(item.all_worktypes),
        countries:       split(item.all_countries),
        languages:       split(item.all_languages),
        available_images: parseInt(item.available_images ?? '0') || 0,
        raw: item,
      };

      seen.add(id);
      const outPath = path.join(
        OUT_DIR,
        `letterformarchive-${String(fileIndex.n++).padStart(6, '0')}.json`
      );
      fs.writeFileSync(outPath, JSON.stringify(record, null, 2));
      newCount++;
    }

    // Progress line + checkpoint every batch
    const processed = Math.min(i + BATCH_SIZE, allItems.length);
    process.stdout.write(`\r   Progress: ${processed}/${allItems.length} items processed...`);
    fs.writeFileSync(seenPath, JSON.stringify([...seen]));
  }

  fs.writeFileSync(seenPath, JSON.stringify([...seen]));
  console.log(''); // newline after progress line

  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║  HARVEST COMPLETE                                         ║');
  console.log('╠═══════════════════════════════════════════════════════════╣');
  console.log(`   Total items fetched      : ${allItems.length.toLocaleString()}`);
  console.log(`   No image (skipped)       : ${noImgCount.toLocaleString()}`);
  console.log(`   Duplicates (skipped)     : ${dupeCount.toLocaleString()}`);
  console.log(`   ✅ New items saved        : ${newCount.toLocaleString()}`);
  console.log('╠═══════════════════════════════════════════════════════════╣');
  console.log('   Next steps:');
  console.log("     1. Add 'letterformarchive' to SourceName in src/harvester/types.ts");
  console.log('     2. Add classifier in src/harvester/engine/classifier.ts');
  console.log('     npm run transform');
  console.log('     npm run load');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');
}

main().catch(console.error);