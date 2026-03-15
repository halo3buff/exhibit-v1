// src/pipeline/maintenance/trim-dr-borders.mjs
//
// Trims black borders from cached Design Reviewed images.
// Saves trimmed versions to .img-cache-trimmed-review/ for inspection.
// Once you're happy, run: node src/pipeline/maintenance/apply-dr-trims.mjs
//
// Run from project root:
//   node src/pipeline/maintenance/trim-dr-borders.mjs

import fs       from 'fs';
import path     from 'path';
import crypto   from 'crypto';
import sharp    from 'sharp';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';

const __dirname    = path.dirname(fileURLToPath(import.meta.url));
const ROOT         = path.join(__dirname, '..', '..', '..');
const DB_PATH      = path.join(ROOT, 'artworks.db');
const CACHE_DIR    = 'C:\\Users\\ameen\\Desktop\\.img-cache';
const REVIEW_DIR   = 'C:\\Users\\ameen\\Desktop\\.img-cache-trimmed-review';
const SIZES        = [400, 1200];

fs.mkdirSync(REVIEW_DIR, { recursive: true });

function cacheFilename(fetchUrl, size) {
  return `${crypto.createHash('md5').update(`${fetchUrl}:${size}`).digest('hex')}.jpg`;
}

async function main() {
  console.log('\n✂️  Design Reviewed — Black Border Trimmer (REVIEW MODE)');
  console.log(`   Trimmed files saved to: ${REVIEW_DIR}`);
  console.log('   Nothing in .img-cache will be touched until you run apply-dr-trims.mjs\n');

  const db   = new Database(DB_PATH, { readonly: true });
  const rows = db.prepare(`
    SELECT imageUrl FROM artworks
    WHERE source = 'designreviewed'
    AND imageUrl IS NOT NULL AND imageUrl != ''
  `).all();
  db.close();

  const urls  = [...new Set(rows.map(r => r.imageUrl))];
  const total = urls.length * SIZES.length;
  console.log(`   ${urls.length.toLocaleString()} DR artworks → ${total.toLocaleString()} cache files\n`);

  let processed = 0, trimmed = 0, skipped = 0, missing = 0, failed = 0;

  for (const url of urls) {
    for (const size of SIZES) {
      const filename   = cacheFilename(url, size);
      const srcPath    = path.join(CACHE_DIR, filename);
      const destPath   = path.join(REVIEW_DIR, filename);

      // Already reviewed
      if (fs.existsSync(destPath)) { skipped++; processed++; progress(); continue; }

      // Not cached yet
      if (!fs.existsSync(srcPath)) { missing++; processed++; progress(); continue; }

      try {
        const original = sharp(srcPath);
        const meta     = await original.metadata();

        const trimBuf  = await sharp(srcPath)
          .trim({ threshold: 30 })
          .jpeg({ quality: 85, progressive: true })
          .toBuffer();

        const trimMeta = await sharp(trimBuf).metadata();

        const widthDiff  = (meta.width  ?? 0) - (trimMeta.width  ?? 0);
        const heightDiff = (meta.height ?? 0) - (trimMeta.height ?? 0);

        if (widthDiff < 5 && heightDiff < 5) {
          // No meaningful border — skip, don't clutter review folder
          skipped++; processed++; progress(); continue;
        }

        fs.writeFileSync(destPath, trimBuf);
        trimmed++;
      } catch(e) {
        failed++;
      }

      processed++;
      progress();
    }
  }

  console.log(`\n\n✅ Done`);
  console.log(`   Trimmed versions saved : ${trimmed.toLocaleString()}`);
  console.log(`   No border (skipped)    : ${skipped.toLocaleString()}`);
  console.log(`   Not yet cached         : ${missing.toLocaleString()}`);
  console.log(`   Failed                 : ${failed}`);
  console.log(`\n   Review folder: ${REVIEW_DIR}`);
  console.log('   When happy: node src/pipeline/maintenance/apply-dr-trims.mjs\n');

  function progress() {
    if (processed % 200 === 0 || processed === total) {
      const pct = ((processed / total) * 100).toFixed(1);
      process.stdout.write(`\r   ${pct}% (${processed.toLocaleString()}/${total.toLocaleString()}) trimmed:${trimmed} skip:${skipped} miss:${missing} fail:${failed}  `);
    }
  }
}

main().catch(console.error);
