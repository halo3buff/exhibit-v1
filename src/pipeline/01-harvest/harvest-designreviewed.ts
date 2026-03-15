// src/pipeline/01-harvest/harvest-designreviewed.ts
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import https from 'https';

dotenv.config({ path: '.env.local' });

// ─────────────────────────────────────────────────────────────────────────────
// DESIGN REVIEWED HARVEST — No API key required
//
// Design Reviewed is a personal graphic design history archive by Matt Lamont
// (Bradford, UK) — 8,000+ physical artefacts spanning 150 years: books,
// magazines, type specimens, posters, records, matchbox labels, stamps,
// packaging. All digitised and publicly browsable.
//
// API: Standard WordPress REST API, custom post type 'artefacts'
//   https://designreviewed.com/wp-json/wp/v2/artefacts
//   per_page = 100 (WP maximum)
//   _embed   = 1 — inlines featured media (image) so no second fetch needed
//   orderby  = id, order = asc — stable pagination
//   X-WP-TotalPages response header drives loop termination
//
// WordPress returns HTTP 400 (not 404) when page > totalPages — handled below.
//
// Image URL priority:
//   post._embedded['wp:featuredmedia'][0].media_details.sizes.large.source_url
//   → fallback: .sizes.medium_large.source_url
//   → fallback: .source_url  (original/full-size)
//
// Item URL:  post.link  (canonical permalink, e.g. /artefacts/graphis-23-1964/)
//
// Format taxonomy passes use the slug from the site nav URL structure.
// REST filter param is 'artefact_format' — this is the standard WordPress
// rest_base for a custom taxonomy registered as 'artefact_format'. If the
// param name is wrong on the server the request returns all posts; the
// broad sweeps already cover everything, so this is purely additive.
//
// After harvesting, add to pipeline:
//   1. Add 'designreviewed' to SourceName in src/harvester/types.ts
//   2. Add classifyDesignReviewed() to src/harvester/engine/classifier.ts
//   3. Create src/pipeline/02-transform/02-transform-designreviewed.ts
//   4. Add to SOURCE_LABELS + TOOLTIP_SCHEMA in gallery page
// ─────────────────────────────────────────────────────────────────────────────

const OUT_DIR   = path.join('data', 'raw', 'designreviewed');
const BASE_URL  = 'https://designreviewed.com/wp-json/wp/v2/artefacts';
const PAGE_SIZE = 100; // WordPress REST API maximum

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

function getImageUrl(post: any): string {
  const media = post?._embedded?.['wp:featuredmedia']?.[0];
  if (!media) return '';
  const sizes = media.media_details?.sizes ?? {};
  return (
    sizes.large?.source_url         ??
    sizes.medium_large?.source_url  ??
    sizes.medium?.source_url        ??
    media.source_url                ??
    ''
  );
}

async function fetchPage(
  page: number,
  extraParams: Record<string, string>,
  retries = 3
): Promise<{ posts: any[]; totalPages: number } | null> {
  const params = new URLSearchParams({
    per_page: String(PAGE_SIZE),
    page:     String(page),
    _embed:   '1',
    status:   'publish',
    orderby:  'id',
    order:    'asc',
    ...extraParams,
  });

  const url = `${BASE_URL}?${params.toString()}`;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const result = await new Promise<{ posts: any[]; totalPages: number } | null>((resolve, reject) => {
        const req = https.get(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; ArtHarvester/2.0)',
            'Accept':     'application/json',
            'Referer':    'https://designreviewed.com/',
          },
        }, (res) => {
          // WordPress returns 400 when page is out of range
          if (res.statusCode === 400) { res.resume(); resolve(null); return; }

          if (res.statusCode === 429) {
            const wait = parseInt(res.headers['retry-after'] || '30') * 1000;
            console.log(`   ⏸  Rate limited — waiting ${wait / 1000}s`);
            res.resume();
            setTimeout(() => resolve(fetchPage(page, extraParams)), wait);
            return;
          }
          if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
            res.resume();
            reject(new Error(`HTTP ${res.statusCode}`));
            return;
          }

          const totalPages = parseInt(res.headers['x-wp-totalpages'] as string || '1', 10);

          let body = '';
          res.setEncoding('utf8');
          res.on('data', chunk => body += chunk);
          res.on('end', () => {
            try {
              const posts = JSON.parse(body);
              resolve({ posts: Array.isArray(posts) ? posts : [], totalPages });
            } catch (e) {
              reject(new Error('JSON parse error'));
            }
          });
        });
        req.on('error', reject);
        req.setTimeout(20000, () => { req.destroy(); reject(new Error('Timeout')); });
      });

      return result;
    } catch (e: any) {
      console.warn(`   Fetch error (attempt ${attempt + 1}/${retries}): ${e.message}`);
      if (attempt < retries - 1) await sleep(1500 * (attempt + 1));
    }
  }
  return null;
}

async function runTask(
  desc: string,
  extraParams: Record<string, string>,
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
    const result = await fetchPage(page, extraParams);

    if (!result || !result.posts.length) {
      console.log('   → No more results');
      break;
    }

    if (page === startPage) totalPages = result.totalPages;

    for (const post of result.posts) {
      const rawId = post.id;
      if (!rawId) continue;

      const id = `designreviewed-${rawId}`;
      if (seen.has(id)) { dupeCount++; continue; }

      const imageUrl = getImageUrl(post);
      if (!imageUrl) { noImgCount++; continue; }

      // _embedded['wp:term'] is an array of taxonomy arrays
      // index 0 = primary taxonomy (artefact_format), index 1 = tags
      const termGroups = post._embedded?.['wp:term'] ?? [];
      const formats    = (termGroups[0] ?? []).map((t: any) => t.name as string);
      const tags       = (termGroups[1] ?? []).map((t: any) => t.name as string);

      // Strip HTML entities from rendered title
      const title = (post.title?.rendered ?? '')
        .replace(/&amp;/g, '&').replace(/&#038;/g, '&')
        .replace(/&nbsp;/g, ' ').replace(/<[^>]+>/g, '').trim();

      const record = {
        id,
        source:    'designreviewed',
        title,
        author:    '',        // site doesn't expose designer in default REST fields
        year:      '',        // individual artefact year is in post content/ACF, not default REST
        imageUrl,
        url:       post.link ?? `https://designreviewed.com/artefacts/${post.slug}/`,
        formats,              // ['Book', 'Type Specimen', 'Magazine', …]
        tags,
        slug:      post.slug  ?? '',
        published: post.date  ?? '',
        raw:       post,
      };

      seen.add(id);
      const outPath = path.join(OUT_DIR, `designreviewed-${String(fileIndex.n++).padStart(6, '0')}.json`);
      fs.writeFileSync(outPath, JSON.stringify(record, null, 2));
      newCount++;
    }

    page++;
    await sleep(700); // polite — small personal site on shared hosting
  }

  console.log(`   ✓ ${newCount} new, ${dupeCount} dupes, ${noImgCount} no-image`);
  return { newCount, dupeCount, noImgCount };
}

async function main() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║  DESIGN REVIEWED HARVEST — No API Key Required           ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  fs.mkdirSync(OUT_DIR, { recursive: true });

  const seenPath = path.join(OUT_DIR, '.seen-ids.json');
  const seen: Set<string> = new Set(
    fs.existsSync(seenPath) ? JSON.parse(fs.readFileSync(seenPath, 'utf8')) : []
  );
  const fileIndex = { n: seen.size };

  // ── Tasks ──────────────────────────────────────────────────────────────────
  // 8,000+ artefacts ÷ 100/page = ~80 pages. Four sweeps of 25 pages cover
  // everything. Format passes are additive; deduplication is free.
  //
  // Taxonomy filter param 'artefact_format' uses the slug values from the
  // site nav: /book/, /magazines/, /type-specimens/, /record/, etc.
  // ─────────────────────────────────────────────────────────────────────────
  const tasks: { desc: string; params: Record<string,string>; limit: number; startPage: number }[] = [
    // Broad sweeps — no filter, gets everything
    { desc: 'Sweep 1  (pages  1–25)',  params: {}, limit: 2500, startPage: 1  },
    { desc: 'Sweep 2  (pages 26–50)',  params: {}, limit: 2500, startPage: 26 },
    { desc: 'Sweep 3  (pages 51–75)',  params: {}, limit: 2500, startPage: 51 },
    { desc: 'Sweep 4  (pages 76–100)', params: {}, limit: 2500, startPage: 76 },
    // Format taxonomy passes (slugs from site nav URL structure)
    { desc: 'Format: Books',              params: { artefact_format: 'book' },                 limit: 2000, startPage: 1 },
    { desc: 'Format: Magazines',          params: { artefact_format: 'magazines' },            limit: 3000, startPage: 1 },
    { desc: 'Format: Type Specimens',     params: { artefact_format: 'type-specimens' },       limit: 1000, startPage: 1 },
    { desc: 'Format: Records',            params: { artefact_format: 'record' },               limit: 1000, startPage: 1 },
    { desc: 'Format: Stamps',             params: { artefact_format: 'stamps' },               limit: 500,  startPage: 1 },
    { desc: 'Format: Packaging',          params: { artefact_format: 'packaging-and-labels' }, limit: 800,  startPage: 1 },
    { desc: 'Format: Matchbox Labels',    params: { artefact_format: 'matchbox-labels' },      limit: 500,  startPage: 1 },
    { desc: 'Format: Brochures & Guides', params: { artefact_format: 'brochures-and-guides' }, limit: 500,  startPage: 1 },
  ];

  let totalNew   = 0;
  let totalDupes = 0;
  let totalNoImg = 0;
  const results: { desc: string; newCount: number; dupeCount: number }[] = [];

  for (const task of tasks) {
    const r = await runTask(task.desc, task.params, task.limit, task.startPage, seen, fileIndex);
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
  console.log('     1. Add \'designreviewed\' to SourceName in src/harvester/types.ts');
  console.log('     2. Add classifier case in src/harvester/engine/classifier.ts');
  console.log('     3. npm run transform');
  console.log('     npm run load');
  console.log('     node src/scripts/reclassify-from-raw.mjs --commit');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');
}

main().catch(console.error);