// src/scripts/harvest-designarchive.ts
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import https from 'https';

dotenv.config({ path: '.env.local' });

// ─────────────────────────────────────────────────────────────────────────────
// AIGA DESIGN ARCHIVE HARVEST — No API key required
//
// Confirmed live endpoint (from network inspection):
//   https://designarchives.aiga.org/srv/entries.json
//
// Params:
//   q     — Lucene query ('' = all, or keyword)
//   page  — 1-indexed
//   limit — items per page (50 works)
//
// Response: { list: [...], pagination: { page, totalPages, totalItems } }
// Image:    CDN_BASE + entry.primary_asset.files.lg.img
// Author:   entry.primary_credits.credits[0]
// Link:     CDN_BASE + entry.uri_parsed
//
// NOTE: designarchives.aiga.org uses a self-signed / chain-incomplete SSL cert
// that Node.js rejects. We use https.request with rejectUnauthorized:false —
// same workaround as any internal corporate tool. The data itself is public.
// ─────────────────────────────────────────────────────────────────────────────

const OUT_DIR  = path.join('data', 'raw', 'designarchive');
const BASE_URL = 'https://designarchives.aiga.org/srv/entries.json'; // ✅ Fixed: removed trailing spaces
const CDN_BASE = 'https://designarchives.aiga.org';                   // ✅ Fixed: removed trailing spaces
const PAGE_SIZE = 50;

// Custom HTTPS agent that skips SSL cert verification — needed because
// designarchives.aiga.org has a cert Node.js rejects (browser ignores it).
const agent = new https.Agent({ rejectUnauthorized: false });

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

function getImageUrl(primaryAsset: any): string {
  if (!primaryAsset?.files) return '';
  const f   = primaryAsset.files;
  const img = f.lg?.img ?? f.or?.img ?? f.prev?.img ?? '';
  return img ? `${CDN_BASE}${img}` : '';
}

async function fetchPage(
  q: string,
  page: number,
  retries = 3
): Promise<{ list: any[]; totalPages: number } | null> {
  const params = new URLSearchParams({
    q,
    page:  String(page),
    limit: String(PAGE_SIZE),
  });

  const url = `${BASE_URL}?${params.toString()}`;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const data = await new Promise<any>((resolve, reject) => {
        const req = https.get(url, {
          agent,
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; ArtHarvester/2.0)',
            'Accept':     'application/json',
            'Referer':    'https://designarchives.aiga.org/', // ✅ Fixed: removed trailing spaces
          },
        }, (res) => {
          if (res.statusCode === 429) {
            const wait = parseInt(res.headers['retry-after'] || '30') * 1000;
            console.log(`   ⏸  Rate limited — waiting ${wait / 1000}s`);
            res.resume();
            setTimeout(() => resolve(fetchPage(q, page)), wait);
            return;
          }
          if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
            res.resume();
            reject(new Error(`HTTP ${res.statusCode}`));
            return;
          }

          let body = '';
          res.setEncoding('utf8');
          res.on('data', chunk => body += chunk);
          res.on('end', () => {
            try { resolve(JSON.parse(body)); }
            catch (e) { reject(new Error('JSON parse error')); }
          });
        });
        req.on('error', reject);
        req.setTimeout(15000, () => { req.destroy(); reject(new Error('Timeout')); });
      });

      return {
        list:       data?.list       ?? [],
        totalPages: data?.pagination?.totalPages ?? 1,
      };
    } catch (e: any) {
      console.warn(`   Fetch error (attempt ${attempt + 1}/${retries}): ${e.message}`);
      if (attempt < retries - 1) await sleep(1000 * (attempt + 1));
    }
  }
  return null;
}

async function runTask(
  desc: string,
  q: string,
  limit: number,
  startPage: number,
  seen: Set<string>,
  fileIndex: { n: number }
): Promise<{ newCount: number; dupeCount: number; noImgCount: number }> {
  console.log(`\n📌 ${desc}`);

  let page       = startPage;
  let totalPages = 9999;
  let newCount   = 0;
  let dupeCount  = 0;
  let noImgCount = 0;
  const maxPages = startPage + Math.ceil(limit / PAGE_SIZE) - 1;

  while (page <= Math.min(totalPages, maxPages)) {
    const result = await fetchPage(q, page);

    if (!result || !result.list.length) {
      console.log('   → No more results');
      break;
    }

    if (page === startPage) totalPages = result.totalPages;

    for (const entry of result.list) {
      const rawId = entry.id;
      if (!rawId) continue;

      const id = `designarchive-${rawId}`;
      if (seen.has(id)) { dupeCount++; continue; }

      const imageUrl = getImageUrl(entry.primary_asset);
      if (!imageUrl) { noImgCount++; continue; }

      const record = {
        id,
        source:      'designarchive',
        title:       entry.title                          ?? '',
        author:      entry.primary_credits?.credits?.[0] ?? '',
        year:        String(entry.year ?? ''),
        imageUrl,
        url:         `${CDN_BASE}${entry.uri_parsed}`,
        discipline:  entry.discipline                     ?? '',
        formats:     (entry.formats     ?? []).map((f: any) => f.name),
        collections: (entry.collections ?? []).map((c: any) => c.name),
        location:    entry.locations?.[0]                ?? '',
        raw:         entry,
      };

      seen.add(id);
      const outPath = path.join(OUT_DIR, `designarchive-${String(fileIndex.n++).padStart(6, '0')}.json`);
      fs.writeFileSync(outPath, JSON.stringify(record, null, 2));
      newCount++;
    }

    page++;
    await sleep(400);
  }

  console.log(`   ✓ ${newCount} new, ${dupeCount} dupes, ${noImgCount} no-image`);
  return { newCount, dupeCount, noImgCount };
}

async function main() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║  AIGA DESIGN ARCHIVE HARVEST — No API Key Required       ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  fs.mkdirSync(OUT_DIR, { recursive: true });

  const seenPath = path.join(OUT_DIR, '.seen-ids.json');
  const seen: Set<string> = new Set(
    fs.existsSync(seenPath) ? JSON.parse(fs.readFileSync(seenPath, 'utf8')) : []
  );
  const fileIndex = { n: seen.size };

  const tasks: { desc: string; q: string; limit: number; startPage: number }[] = [
    // Broad sweeps — q='' returns the full collection in publication order
    // ✅ Fixed: changed q: '*' to q: '' (empty string = all results)
    { desc: 'Sweep 1  (pages   1–100)', q: '', limit: 5000, startPage: 1   },
    { desc: 'Sweep 2  (pages 101–200)', q: '', limit: 5000, startPage: 101 },
    { desc: 'Sweep 3  (pages 201–300)', q: '', limit: 5000, startPage: 201 },
    { desc: 'Sweep 4  (pages 301–400)', q: '', limit: 5000, startPage: 301 },
    // Keyword passes for graphic design disciplines
    { desc: 'Keyword: Poster',          q: 'poster',       limit: 2000, startPage: 1 },
    { desc: 'Keyword: Typography',      q: 'typography',   limit: 2000, startPage: 1 },
    { desc: 'Keyword: Book design',     q: 'book',         limit: 2000, startPage: 1 },
    { desc: 'Keyword: Identity',        q: 'identity',     limit: 2000, startPage: 1 },
    { desc: 'Keyword: Packaging',       q: 'packaging',    limit: 1500, startPage: 1 },
    { desc: 'Keyword: Environmental',   q: 'environmental',limit: 1000, startPage: 1 },
  ];

  let totalNew   = 0;
  let totalDupes = 0;
  let totalNoImg = 0;
  const results: { desc: string; newCount: number; dupeCount: number }[] = [];

  for (const task of tasks) {
    const r = await runTask(task.desc, task.q, task.limit, task.startPage, seen, fileIndex);
    totalNew   += r.newCount;
    totalDupes += r.dupeCount;
    totalNoImg += r.noImgCount;
    results.push({ desc: task.desc, newCount: r.newCount, dupeCount: r.dupeCount });
    fs.writeFileSync(seenPath, JSON.stringify([...seen]));
    await sleep(2000);
  }

  fs.writeFileSync(seenPath, JSON.stringify([...seen]));

  const descWidth = Math.max(...results.map(r => r.desc.length));
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║  HARVEST COMPLETE                                         ║');
  console.log('╠═══════════════════════════════════════════════════════════╣');
  results.forEach((r, i) => {
    const num  = String(i + 1).padStart(2, ' ');
    const desc = r.desc.padEnd(descWidth, ' ');
    const nw   = String(r.newCount).padStart(6, ' ');
    const dp   = String(r.dupeCount).padStart(5, ' ');
    console.log(`  ${num}. ${desc}   ${nw} new   ${dp} dupes`);
  });
  console.log('╠═══════════════════════════════════════════════════════════╣');
  console.log(`   No image (skipped) : ${totalNoImg.toLocaleString()}`);
  console.log(`   Duplicates skipped : ${totalDupes.toLocaleString()}`);
  console.log(`   ✅ New items saved  : ${totalNew.toLocaleString()}`);
  console.log('╠═══════════════════════════════════════════════════════════╣');
  console.log('   Next steps:');
  console.log('     npm run transform');
  console.log('     npm run load');
  console.log('     node src/scripts/reclassify-from-raw.mjs --commit');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');
}

main().catch(console.error);