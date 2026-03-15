// src/pipeline/01-harvest/harvest-europeana.ts
//
// EUROPEANA HARVEST — Requires EUROPEANA_API_KEY in .env.local
// Register free at: https://www.europeana.eu → My Account → API Key
//
// Strategy: cursor-based pagination across targeted graphic design queries.
// Each query runs until 20k items or exhausted. Deduplication via seen set.
// Images filtered to media=true (direct image URL present).
// reusability=open filters to openly licensed items only.
//
// Run: npx tsx src/pipeline/01-harvest/harvest-europeana.ts

import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
dotenv.config({ path: '.env.local' });

const API_KEY  = process.env.EUROPEANA_API_KEY;
if (!API_KEY) { console.error('❌ EUROPEANA_API_KEY not set in .env.local'); process.exit(1); }

const OUT_DIR  = path.join('data', 'raw', 'europeana');
const BASE_URL = 'https://api.europeana.eu/record/v2/search.json';
const ROWS     = 100; // API max

fs.mkdirSync(OUT_DIR, { recursive: true });

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function fetchPage(query: string, qf: string[], cursor: string): Promise<any> {
  const params = new URLSearchParams({
    wskey:         API_KEY!,
    query,
    rows:          String(ROWS),
    profile:       'rich',
    media:         'true',
    reusability:   'open',
    cursor,
    sort:          'europeana_id+asc',
  });
  for (const f of qf) params.append('qf', f);

  const url = `${BASE_URL}?${params}`;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(20000),
      });
      if (res.status === 429) {
        console.log('\n   Rate limited — waiting 10s');
        await sleep(10000);
        continue;
      }
      if (!res.ok) return null;
      return await res.json();
    } catch(e: any) {
      if (attempt < 2) { await sleep(2000 * (attempt + 1)); continue; }
      return null;
    }
  }
  return null;
}

function extractImageUrl(item: any): string {
  // edmIsShownBy is the direct media URL
  if (item.edmIsShownBy?.[0]) return item.edmIsShownBy[0];
  if (item.edmPreview?.[0])   return item.edmPreview[0];
  return '';
}

function extractYear(item: any): string {
  const date = item.year?.[0] || item.dctermsCreated?.[0] || item.dcDate?.[0] || '';
  const m = String(date).match(/\b(1[0-9]{3}|20[0-9]{2})\b/);
  return m ? m[0] : '';
}

const seen = new Set<string>();
let fileIndex = 0;

// Load existing seen IDs
const seenPath = path.join(OUT_DIR, '.seen-ids.json');
if (fs.existsSync(seenPath)) {
  const ids = JSON.parse(fs.readFileSync(seenPath, 'utf8')) as string[];
  ids.forEach(id => seen.add(id));
  fileIndex = seen.size;
}

async function runQuery(
  desc: string,
  query: string,
  qf: string[],
  limit: number
): Promise<{ saved: number; dupes: number }> {
  console.log(`\n📌 ${desc}`);
  let cursor   = '*';
  let saved    = 0;
  let dupes    = 0;
  let fetched  = 0;

  while (saved + dupes < limit) {
    const data = await fetchPage(query, qf, cursor);
    if (!data?.success || !data.items?.length) break;

    for (const item of data.items) {
      const id = `europeana-${item.id.replace(/\//g, '-')}`;
      if (seen.has(id)) { dupes++; continue; }

      const imageUrl = extractImageUrl(item);
      if (!imageUrl) continue;

      const record = {
        id,
        source:      'europeana',
        title:       item.dcTitleLangAware?.en?.[0] || item.title?.[0] || 'Untitled',
        author:      item.dcCreator?.[0] || item.edmAgentLabelLangAware?.en?.[0] || '',
        year:        extractYear(item),
        imageUrl,
        url:         item.edmIsShownAt?.[0] || `https://www.europeana.eu/item${item.id}`,
        provider:    item.dataProvider?.[0] || item.provider?.[0] || '',
        country:     item.country?.[0] || '',
        type:        item.type || '',
        rights:      item.rights?.[0] || '',
        dcType:      item.dcType || [],
        dcSubject:   item.dcSubject || [],
        edmConcept:  item.edmConceptLabel || [],
      };

      seen.add(id);
      const outPath = path.join(OUT_DIR, `europeana-${String(fileIndex++).padStart(6, '0')}.json`);
      fs.writeFileSync(outPath, JSON.stringify(record, null, 2));
      saved++;
    }

    fetched += data.items.length;
    process.stdout.write(`\r   fetched:${fetched} saved:${saved} dupes:${dupes}  `);

    // Cursor for next page
    cursor = data.nextCursor;
    if (!cursor) break;

    await sleep(200); // polite
  }

  console.log(`\n   ✓ saved:${saved} dupes:${dupes}`);
  fs.writeFileSync(seenPath, JSON.stringify([...seen]));
  return { saved, dupes };
}

async function main() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║  EUROPEANA HARVEST — Graphic Design Focus                ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  // Targeted GD queries — each capped at limit items
  // qf filters narrow by TYPE field in Europeana EDM
  const tasks = [
    // Core GD — broad unique queries, each exhausted fully
    { desc: 'Posters',
      query: 'poster',                          qf: ['TYPE:IMAGE'], limit: 5000 },
    { desc: 'Bauhaus',
      query: 'bauhaus',                         qf: ['TYPE:IMAGE'], limit: 5000 },
    { desc: 'Lithographs',
      query: 'lithograph',                      qf: ['TYPE:IMAGE'], limit: 5000 },
    { desc: 'Type specimens',
      query: '"type specimen"',                  qf: ['TYPE:IMAGE'], limit: 5000 },
    { desc: 'Woodcuts',
      query: 'woodcut',                         qf: ['TYPE:IMAGE'], limit: 3000 },
    { desc: 'Engravings',
      query: 'engraving',                       qf: ['TYPE:IMAGE'], limit: 3000 },
    { desc: 'Etching',
      query: 'etching',                         qf: ['TYPE:IMAGE'], limit: 3000 },
    { desc: 'Screenprint',
      query: 'screenprint',                     qf: ['TYPE:IMAGE'], limit: 2000 },
    { desc: 'Gebrauchsgraphik',
      query: 'gebrauchsgraphik',                qf: ['TYPE:IMAGE'], limit: 3000 },
    { desc: 'Decorative art',
      query: 'decorative art',                  qf: ['TYPE:IMAGE'], limit: 3000 },
    { desc: 'Art nouveau',
      query: '"art nouveau"',                   qf: ['TYPE:IMAGE'], limit: 3000 },
    { desc: 'Art deco',
      query: '"art deco"',                      qf: ['TYPE:IMAGE'], limit: 3000 },
    { desc: 'Constructivism',
      query: 'constructivism',                  qf: ['TYPE:IMAGE'], limit: 2000 },
    { desc: 'Dutch graphic design',
      query: 'grafisch',                        qf: ['TYPE:IMAGE', 'COUNTRY:netherlands'], limit: 3000 },
    { desc: 'Drawing',
      query: 'drawing',                         qf: ['TYPE:IMAGE'], limit: 3000 },
    { desc: 'Photograph',
      query: 'photograph',                      qf: ['TYPE:IMAGE'], limit: 3000 },
    { desc: 'Painting',
      query: 'painting',                        qf: ['TYPE:IMAGE'], limit: 3000 },
    { desc: 'Watercolor',
      query: 'watercolor',                      qf: ['TYPE:IMAGE'], limit: 2000 },
    { desc: 'Ceramics',
      query: 'ceramics',                        qf: ['TYPE:IMAGE'], limit: 2000 },
    { desc: 'Textile',
      query: 'textile',                         qf: ['TYPE:IMAGE'], limit: 2000 },
  ];

  let totalSaved = 0;
  for (const t of tasks) {
    const { saved } = await runQuery(t.desc, t.query, t.qf, t.limit);
    totalSaved += saved;
    if (totalSaved >= 20000) { console.log('\n   20,000 target reached ✓'); break; }
    await sleep(500);
  }

  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║  HARVEST COMPLETE                                         ║');
  console.log('╠═══════════════════════════════════════════════════════════╣');
  console.log(`   Total saved: ${totalSaved.toLocaleString()}`);
  console.log('   Next steps:');
  console.log("   1. Add 'europeana' to SourceName in src/harvester/types.ts");
  console.log('   2. npx tsx src/pipeline/02-transform/02-transform-europeana.ts');
  console.log('   3. npx tsx src/pipeline/03-load/03-load-europeana.ts');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');
}

main().catch(console.error);