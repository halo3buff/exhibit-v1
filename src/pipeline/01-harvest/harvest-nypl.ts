// src/pipeline/01-harvest/harvest-nypl.ts
//
// NYPL DIGITAL COLLECTIONS HARVEST — Requires NYPL_API_TOKEN in .env.local
// Register free at: https://api.repo.nypl.org/sign_up
// Token arrives by email, add to .env.local as: NYPL_API_TOKEN=your_token
//
// Strategy: search targeted GD queries, publicDomainOnly=true ensures image
// links are present. per_page=500 is the API max.
// Image derivative 'q' = 1600px JPEG — best quality available.
//
// Run: npx tsx src/pipeline/01-harvest/harvest-nypl.ts

import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
dotenv.config({ path: '.env.local' });

const API_TOKEN = process.env.NYPL_API_TOKEN;
if (!API_TOKEN) { console.error('❌ NYPL_API_TOKEN not set in .env.local'); process.exit(1); }

const OUT_DIR  = path.join('data', 'raw', 'nypl');
const BASE_URL = 'https://api.repo.nypl.org/api/v2';
const PER_PAGE = 500;

fs.mkdirSync(OUT_DIR, { recursive: true });

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function fetchJson(url: string, retries = 3): Promise<any> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, {
        headers: {
          'Authorization': `Token token="${API_TOKEN}"`,
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(20000),
      });
      if (res.status === 429) { await sleep(15000); continue; }
      if (res.status === 401) { console.error('\n❌ NYPL token invalid — check NYPL_API_TOKEN'); process.exit(1); }
      if (!res.ok) return null;
      return await res.json();
    } catch(e: any) {
      if (i < retries - 1) { await sleep(2000 * (i + 1)); continue; }
      return null;
    }
  }
  return null;
}

// Get the best image URL from a capture's imageLinks
function getBestImageUrl(capture: any): string {
  const links = capture?.imageLinks?.imageLink;
  if (!links || !links.length) return '';
  // Priority: q (1600px) > w (760px) > r (300px)
  const byType: Record<string, string> = {};
  for (const link of links) {
    if (link.$ && link._) byType[link.$?.type || link.type] = link._ || link;
    else if (typeof link === 'string') {
      // URL format: .../{imageId}/{type}.jpg
      const m = link.match(/\/([a-z])\.(?:jpg|jpeg)$/i);
      if (m) byType[m[1]] = link;
    }
  }
  return byType['q'] || byType['w'] || byType['r'] || byType['f'] || Object.values(byType)[0] || '';
}

// Parse MODS title from item_details response
function extractTitle(mods: any): string {
  const ti = mods?.titleInfo;
  if (!ti) return 'Untitled';
  const t = Array.isArray(ti) ? ti[0] : ti;
  return [t?.title, t?.subTitle].filter(Boolean).join(': ') || 'Untitled';
}

function extractYear(mods: any): string {
  const date = mods?.originInfo?.dateCreated || mods?.originInfo?.dateIssued || '';
  const str = Array.isArray(date) ? date[0]?._ || date[0] : date?._ || date;
  const m = String(str || '').match(/\b(1[0-9]{3}|20[0-9]{2})\b/);
  return m ? m[0] : '';
}

function extractAuthor(mods: any): string {
  const name = mods?.name;
  if (!name) return '';
  const names = Array.isArray(name) ? name : [name];
  for (const n of names) {
    const role = n?.role?.roleTerm;
    const roleStr = Array.isArray(role) ? role[0] : role?._ || role || '';
    if (/creator|designer|artist|author/i.test(String(roleStr))) {
      const np = n?.namePart;
      return Array.isArray(np) ? np.join(', ') : String(np || '');
    }
  }
  // Fallback: first name
  const first = names[0]?.namePart;
  return Array.isArray(first) ? first.join(', ') : String(first || '');
}

const seen = new Set<string>();
let fileIndex = 0;
const seenPath = path.join(OUT_DIR, '.seen-ids.json');
if (fs.existsSync(seenPath)) {
  const ids = JSON.parse(fs.readFileSync(seenPath, 'utf8')) as string[];
  ids.forEach(id => seen.add(id));
  fileIndex = seen.size;
}

async function runSearch(desc: string, query: string, limit: number): Promise<{ saved: number }> {
  console.log(`\n📌 ${desc}`);
  let page  = 1;
  let saved = 0;

  while (saved < limit) {
    const url = `${BASE_URL}/items/search?q=${encodeURIComponent(query)}&publicDomainOnly=true&per_page=${PER_PAGE}&page=${page}`;
    const data = await fetchJson(url);

    if (!data?.nyplAPI?.response) { console.log('   → No response'); break; }

    const headers = data.nyplAPI.request?.headers;
    const results = data.nyplAPI.response;

    // Results can be an array of captures directly
    const items = Array.isArray(results) ? results : (results?.capture ?? []);

    if (!items.length) { console.log('   → No more results'); break; }

    for (const capture of items) {
      const uuid = capture?.uuid || capture?.itemUUID;
      if (!uuid) continue;

      const id = `nypl-${uuid}`;
      if (seen.has(id)) continue;

      // Get best image URL
      const imageUrl = getBestImageUrl(capture);
      if (!imageUrl) continue;

      // Title from capture or search result
      const title = capture?.title || capture?.sortString || 'Untitled';
      const itemLink = capture?.itemLink || `https://digitalcollections.nypl.org/items/${uuid}`;

      const record = {
        id,
        source:    'nypl',
        title,
        author:    '',   // enriched below if we fetch mods
        year:      '',
        imageUrl,
        url:       itemLink,
        uuid,
        typeOfResource: capture?.typeOfResource || '',
        rightsStatement: capture?.rightsStatement || '',
      };

      seen.add(id);
      const outPath = path.join(OUT_DIR, `nypl-${String(fileIndex++).padStart(6, '0')}.json`);
      fs.writeFileSync(outPath, JSON.stringify(record, null, 2));
      saved++;
    }

    process.stdout.write(`\r   page:${page} saved:${saved}  `);

    // Check if more pages exist
    const totalResults = parseInt(data.nyplAPI?.response?.numResults || data.nyplAPI?.headers?.hasNumberOfItems || '0');
    const totalPages = Math.ceil(totalResults / PER_PAGE);
    if (page >= totalPages || !items.length) break;

    page++;
    await sleep(500);
  }

  console.log(`\n   ✓ saved:${saved}`);
  fs.writeFileSync(seenPath, JSON.stringify([...seen]));
  return { saved };
}

async function main() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║  NYPL DIGITAL COLLECTIONS HARVEST                        ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  const tasks = [
    { desc: 'Posters',                query: 'poster',                     limit: 4000 },
    { desc: 'Menus',                  query: 'menu',                       limit: 2000 },
    { desc: 'Trade cards',            query: 'trade card',                 limit: 2000 },
    { desc: 'Broadsides',             query: 'broadside',                  limit: 1500 },
    { desc: 'Prints & lithographs',   query: 'lithograph',                 limit: 2000 },
    { desc: 'Photographs',            query: 'photograph',                 limit: 2000 },
    { desc: 'Book covers',            query: 'book cover',                 limit: 1500 },
    { desc: 'Type specimens',         query: 'type specimen',              limit: 1000 },
    { desc: 'Ephemera',               query: 'ephemera',                   limit: 1500 },
    { desc: 'Advertisements',         query: 'advertisement',              limit: 1500 },
    { desc: 'Maps & cartography',     query: 'map cartography',            limit: 1000 },
  ];

  let totalSaved = 0;
  for (const t of tasks) {
    const { saved } = await runSearch(t.desc, t.query, t.limit);
    totalSaved += saved;
    if (totalSaved >= 20000) { console.log('\n   20,000 target reached ✓'); break; }
    await sleep(1000);
  }

  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║  HARVEST COMPLETE                                         ║');
  console.log('╠═══════════════════════════════════════════════════════════╣');
  console.log(`   Total saved: ${totalSaved.toLocaleString()}`);
  console.log('   Next steps:');
  console.log("   1. Add 'nypl' to SourceName in src/harvester/types.ts");
  console.log('   2. npx tsx src/pipeline/02-transform/02-transform-nypl.ts');
  console.log('   3. npx tsx src/pipeline/03-load/03-load-nypl.ts');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');
}

main().catch(console.error);
