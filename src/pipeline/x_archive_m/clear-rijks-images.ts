// src/scripts/clear-rijks-images.ts
// Clears bad _webImageUrl values from raw Rijks files so the
// backfill script can re-fetch real image URLs from the REST API.
//
// Run: npx tsx src/scripts/clear-rijks-images.ts

import * as fs from 'fs';
import * as path from 'path';

const RAW_DIR = path.join(process.cwd(), 'data', 'raw', 'rijks');

async function main() {
  const files = fs.readdirSync(RAW_DIR).filter(f => f.endsWith('.json'));
  console.log(`Found ${files.length} raw Rijks files\n`);

  let cleared = 0;
  let skipped = 0;
  let errors  = 0;

  for (const file of files) {
    const filePath = path.join(RAW_DIR, file);
    try {
      const rawItem = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      if (rawItem.data?._webImageUrl) {
        delete rawItem.data._webImageUrl;
        fs.writeFileSync(filePath, JSON.stringify(rawItem, null, 2), 'utf8');
        cleared++;
      } else {
        skipped++;
      }
    } catch {
      console.warn(`Error processing ${file}`);
      errors++;
    }
  }

  console.log(`✅ Done`);
  console.log(`   Cleared: ${cleared}`);
  console.log(`   No URL (skipped): ${skipped}`);
  console.log(`   Errors: ${errors}`);
  console.log(`\nNext: npx tsx src/scripts/backfill-rijks-images.ts`);
}

main().catch(console.error);
