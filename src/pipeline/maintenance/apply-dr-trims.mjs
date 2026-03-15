// src/pipeline/maintenance/apply-dr-trims.mjs
//
// Moves reviewed trimmed images from .img-cache-trimmed-review/ into .img-cache/
// Run this after reviewing the output of trim-dr-borders.mjs
//
// Run from project root:
//   node src/pipeline/maintenance/apply-dr-trims.mjs

import fs   from 'fs';
import path from 'path';

const CACHE_DIR  = 'C:\\Users\\ameen\\Desktop\\.img-cache';
const REVIEW_DIR = 'C:\\Users\\ameen\\Desktop\\.img-cache-trimmed-review';

async function main() {
  console.log('\n📦 Applying trimmed DR images to .img-cache\n');

  if (!fs.existsSync(REVIEW_DIR)) {
    console.error('❌ Review folder not found. Run trim-dr-borders.mjs first.');
    process.exit(1);
  }

  const files = fs.readdirSync(REVIEW_DIR).filter(f => f.endsWith('.jpg'));
  console.log(`   ${files.length.toLocaleString()} trimmed files to apply\n`);

  let applied = 0, failed = 0;

  for (const file of files) {
    const src  = path.join(REVIEW_DIR, file);
    const dest = path.join(CACHE_DIR, file);
    try {
      fs.copyFileSync(src, dest);
      applied++;
    } catch(e) {
      console.warn(`   ✗ ${file}: ${e.message}`);
      failed++;
    }
  }

  console.log(`✅ Applied ${applied.toLocaleString()} trimmed images to .img-cache`);
  if (failed > 0) console.log(`   ${failed} failed`);
  console.log(`\n   You can delete the review folder now if everything looks good:`);
  console.log(`   ${REVIEW_DIR}\n`);
}

main().catch(console.error);
