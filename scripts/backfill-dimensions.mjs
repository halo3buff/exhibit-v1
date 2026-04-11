// scripts/backfill-dimensions.mjs
// Run: node scripts/backfill-dimensions.mjs
//
// Uses the EXACT same cache filename formula as prewarm-cache.mjs:
//   key      = getFetchUrl(imageUrl, size) + ":" + size
//   filename = md5(key).jpg
// Checks sizes 400 and 1200, same as findCachedPath() in nsfw-scan.mjs.
// Cache directory: C:\Users\ameen\Desktop\.img-cache  (outside project root)

import fs       from 'fs';
import path     from 'path';
import crypto   from 'crypto';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT      = path.join(__dirname, '..');

// ── Cache dir is OUTSIDE the project root, on the Desktop ───────────────────
// Adjust this if you ever move it.
const CACHE_DIR = path.join(ROOT, '..', '.img-cache');   // C:\Users\ameen\Desktop\.img-cache
const DB_PATH   = path.join(ROOT, 'artworks.db');

let sharp;
try {
  sharp = (await import('sharp')).default;
} catch {
  console.error('sharp not found. Run: npm install sharp');
  process.exit(1);
}

// ── EXACT copy of the cache filename logic from prewarm-cache.mjs ────────────
function iiifUrl(url, size) {
  return url.replace(/\/full\/[^/]+\//, `/full/!${size},${size}/`);
}
function chSourceUrl(url) {
  return url.replace(/_[bzn]\.jpg$/i, '_z.jpg');
}
function getFetchUrl(imageUrl, size) {
  if (imageUrl.includes('letterformarchive.org')) return imageUrl;
  if (imageUrl.includes('/full/'))                return iiifUrl(imageUrl, size);
  if (imageUrl.includes('images.collection.cooperhewitt.org') && /_[bzn]\.jpg$/i.test(imageUrl)) {
    return chSourceUrl(imageUrl);
  }
  return imageUrl;
}
function getCacheFilename(imageUrl, size) {
  const fetchUrl = getFetchUrl(imageUrl, size);
  const key      = `${fetchUrl}:${size}`;
  return `${crypto.createHash('md5').update(key).digest('hex')}.jpg`;
}
function findCachedPath(imageUrl) {
  for (const size of [400, 1200]) {
    const p = path.join(CACHE_DIR, getCacheFilename(imageUrl, size));
    try { if (fs.statSync(p).size > 500) return p; } catch {}
  }
  return null;
}
// ─────────────────────────────────────────────────────────────────────────────

async function run() {
  // Confirm cache dir exists before doing anything
  if (!fs.existsSync(CACHE_DIR)) {
    console.error(`\n❌ Cache directory not found: ${CACHE_DIR}`);
    console.error(`   Edit CACHE_DIR at the top of this script to match your actual path.`);
    process.exit(1);
  }

  // Sanity check: count files in cache
  const cacheFiles = fs.readdirSync(CACHE_DIR).filter(f => f.endsWith('.jpg'));
  console.log(`✓ Cache dir found: ${CACHE_DIR}`);
  console.log(`  ${cacheFiles.length.toLocaleString()} .jpg files present\n`);

  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');

  // ── Add columns if missing ───────────────────────────────────────────────
  const info = db.prepare(`PRAGMA table_info(artworks)`).all();
  const cols  = new Set(info.map(c => c.name));
  if (!cols.has('imageWidth'))  { db.prepare(`ALTER TABLE artworks ADD COLUMN imageWidth INTEGER`).run();  console.log('✓ Added column: imageWidth');  }
  if (!cols.has('imageHeight')) { db.prepare(`ALTER TABLE artworks ADD COLUMN imageHeight INTEGER`).run(); console.log('✓ Added column: imageHeight'); }

  // ── Spot-check: test 3 real URLs against the cache ───────────────────────
  console.log('\nSpot-checking cache path resolution:');
  const sample = db.prepare(`SELECT imageUrl FROM artworks WHERE imageUrl IS NOT NULL LIMIT 5`).all();
  let spotHits = 0;
  for (const { imageUrl } of sample) {
    const p = findCachedPath(imageUrl);
    const found = p ? '✓ HIT ' : '✗ MISS';
    console.log(`  ${found}  ${imageUrl.slice(0, 70)}`);
    if (p) spotHits++;
  }
  if (spotHits === 0) {
    console.error('\n❌ No cache hits on spot-check. The CACHE_DIR path or filename formula is wrong.');
    console.error(`   CACHE_DIR is currently: ${CACHE_DIR}`);
    db.close();
    process.exit(1);
  }
  console.log('');

  // ── Fetch rows needing dimensions ────────────────────────────────────────
  const rows = db.prepare(`
    SELECT id, imageUrl FROM artworks
    WHERE imageUrl IS NOT NULL AND imageUrl != ''
      AND (imageWidth IS NULL OR imageHeight IS NULL)
  `).all();

  console.log(`Rows needing dimensions: ${rows.length.toLocaleString()}`);
  if (rows.length === 0) { console.log('Nothing to do.'); db.close(); return; }

  const updateStmt = db.prepare(`UPDATE artworks SET imageWidth = ?, imageHeight = ? WHERE id = ?`);

  let done = 0, skipped = 0, errors = 0;
  const BATCH = 100;

  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);

    // 1. Resolve cache paths (sync)
    const resolved = batch.map(row => ({
      id:        row.id,
      cachePath: findCachedPath(row.imageUrl),
    }));

    // 2. Read dimensions in parallel (async)
    const results = await Promise.all(
      resolved.map(async ({ id, cachePath }) => {
        if (!cachePath) return { id, w: null, h: null, miss: true };
        try {
          const meta = await sharp(cachePath).metadata();
          return { id, w: meta.width || null, h: meta.height || null };
        } catch {
          return { id, w: null, h: null, err: true };
        }
      })
    );

    // 3. Write in one transaction (sync)
    db.transaction(() => {
      for (const { id, w, h, miss, err } of results) {
        if (miss)   { skipped++; continue; }
        if (err)    { errors++;  continue; }
        if (w && h) { updateStmt.run(w, h, id); done++; }
        else        { skipped++; }
      }
    })();

    const total = i + batch.length;
    const pct   = Math.round((total / rows.length) * 100);
    process.stdout.write(`  ${total.toLocaleString()}/${rows.length.toLocaleString()} (${pct}%) — updated:${done.toLocaleString()}  skipped:${skipped.toLocaleString()}  errors:${errors}  \r`);
  }

  db.close();
  console.log(`\n\n✓ Backfill complete`);
  console.log(`  Updated:            ${done.toLocaleString()}`);
  console.log(`  Skipped (no cache): ${skipped.toLocaleString()}`);
  console.log(`  Errors:             ${errors}`);
}

run().catch(err => { console.error(err); process.exit(1); });
