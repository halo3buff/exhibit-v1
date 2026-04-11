// scripts/analyze-dimensions.mjs
// Run: node scripts/analyze-dimensions.mjs
//
// Scans .img-cache/, reads pixel dimensions via sharp,
// classifies each image into an aspect ratio bucket,
// and writes scripts/dimension-manifest.json
//
// Aspect ratio buckets:
//   "tall"    — ratio < 0.72   (portrait, e.g. 2:3 book covers, 9:16 posters)
//   "poster"  — ratio 0.72–0.85 (classic vertical poster, ~3:4)
//   "square"  — ratio 0.85–1.18 (near-square)
//   "wide"    — ratio 1.18–1.6  (landscape)
//   "panorama"— ratio > 1.6     (very wide)

import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT      = path.join(__dirname, '..');
const CACHE_DIR = path.join(ROOT, '.img-cache');
const OUT_PATH  = path.join(__dirname, 'dimension-manifest.json');

// Lazy-import sharp so the script fails gracefully if not installed
let sharp;
try {
  sharp = (await import('sharp')).default;
} catch {
  console.error('sharp not found. Run: npm install sharp');
  process.exit(1);
}

function classifyRatio(w, h) {
  if (!w || !h) return 'unknown';
  const r = w / h;
  if (r < 0.72)        return 'tall';
  if (r < 0.85)        return 'poster';
  if (r < 1.18)        return 'square';
  if (r < 1.6)         return 'wide';
  return 'panorama';
}

async function run() {
  if (!fs.existsSync(CACHE_DIR)) {
    console.error(`Cache dir not found: ${CACHE_DIR}`);
    process.exit(1);
  }

  const files = fs.readdirSync(CACHE_DIR)
    .filter(f => /\.(jpg|jpeg|png|webp|gif)$/i.test(f));

  console.log(`Found ${files.length} images in .img-cache/`);

  const manifest = {
    generated: new Date().toISOString(),
    total: 0,
    buckets: { tall: 0, poster: 0, square: 0, wide: 0, panorama: 0, unknown: 0 },
    images: {},   // hash → { width, height, ratio, bucket }
    bucketList: { tall: [], poster: [], square: [], wide: [], panorama: [] },
  };

  let processed = 0;
  let errors    = 0;

  for (const file of files) {
    const filePath = path.join(CACHE_DIR, file);
    try {
      const meta   = await sharp(filePath).metadata();
      const { width, height } = meta;
      const ratio  = width && height ? +(width / height).toFixed(4) : null;
      const bucket = classifyRatio(width, height);

      manifest.images[file] = { width, height, ratio, bucket };
      manifest.buckets[bucket]++;
      if (bucket !== 'unknown') manifest.bucketList[bucket].push(file);

      processed++;
      if (processed % 500 === 0) process.stdout.write(`  ${processed}/${files.length}\r`);
    } catch {
      errors++;
      manifest.images[file] = { width: null, height: null, ratio: null, bucket: 'unknown' };
      manifest.buckets.unknown++;
    }
  }

  manifest.total = processed;
  fs.writeFileSync(OUT_PATH, JSON.stringify(manifest, null, 2));

  console.log(`\n✓ Done. ${processed} processed, ${errors} errors`);
  console.log('Bucket distribution:');
  for (const [k, v] of Object.entries(manifest.buckets)) {
    const pct = manifest.total ? ((v / manifest.total) * 100).toFixed(1) : '0.0';
    console.log(`  ${k.padEnd(10)} ${String(v).padStart(6)}  (${pct}%)`);
  }
  console.log(`\n→ Manifest written to: ${OUT_PATH}`);
}

run().catch(err => { console.error(err); process.exit(1); });
