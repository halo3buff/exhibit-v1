// src/scripts/debug-rijks-classification.mjs
//
// Diagnostic: Pull 5 Rijks items classified as "Identity & Branding" or "Posters & Advertising"
// and dump their complete raw JSON to inspect the full structure.
//
// Usage: node src/scripts/debug-rijks-classification.mjs

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT    = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const DB_PATH = path.join(ROOT, 'artworks.db');
const RAW_DIR = path.join(ROOT, 'data', 'raw', 'rijks');

const TARGET_SUBS = ['Identity & Branding', 'Posters & Advertising'];
const LIMIT = 5;

async function main() {
  const db = new Database(DB_PATH);
  
  // Find Rijks items with target classifications
  const rows = db.prepare(`
    SELECT id, title, mainCategory, subCategory 
    FROM artworks 
    WHERE source = 'rijks' 
      AND subCategory IN (${TARGET_SUBS.map(() => '?').join(',')})
    LIMIT ?
  `).all([...TARGET_SUBS, LIMIT]);

  if (rows.length === 0) {
    console.log('⚠️  No Rijks items found with target classifications.');
    console.log(`   Looking for subCategory in: ${TARGET_SUBS.join(', ')}`);
    db.close();
    return;
  }

  console.log(`🔍 Found ${rows.length} Rijks item(s) — dumping complete raw JSON:\n`);
  console.log('='.repeat(80));

  for (const row of rows) {
    console.log(`\n📦 DB Record:`);
    console.log(`   id:           ${row.id}`);
    console.log(`   title:        ${row.title?.slice(0, 80)}${row.title?.length > 80 ? '...' : ''}`);
    console.log(`   category:     ${row.mainCategory}/${row.subCategory}`);
    
    // Extract Rijks ID from dbId format "rijks-XXXX"
    const rijksId = row.id.replace(/^rijks-/, '');
    const rawFile = path.join(RAW_DIR, `${rijksId}.json`);
    
    if (!fs.existsSync(rawFile)) {
      console.log(`   ⚠️  Raw file not found: ${rawFile}`);
      continue;
    }
    
    const raw = JSON.parse(fs.readFileSync(rawFile, 'utf8'));
    
    console.log(`\n📄 Complete Raw JSON (untruncated):`);
    console.log(JSON.stringify(raw, null, 2));
    console.log('\n' + '-'.repeat(80));
    
    // Bonus: Highlight key fields if they exist
    const data = raw.data || raw;
    console.log(`\n🔑 Key Field Summary:`);
    console.log(`   _harvestType:        ${data._harvestType || '(missing)'}`);
    console.log(`   classified_as:       ${Array.isArray(data.classified_as) ? `[${data.classified_as.length} entries]` : '(not an array / missing)'}`);
    if (Array.isArray(data.classified_as) && data.classified_as.length > 0) {
      console.log(`     → First entry: ${JSON.stringify(data.classified_as[0]).slice(0, 200)}`);
    }
    console.log(`   produced_by.technique: ${Array.isArray(data.produced_by?.technique) ? `[${data.produced_by.technique.length} entries]` : '(missing)'}`);
    console.log(`   title (identified_by): ${data.identified_by?.find(x => x?.type === 'Name')?.content || '(missing)'}`);
  }

  console.log(`\n✅ Done. Inspect the JSON above for top-level classified_as or other signals.`);
  db.close();
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});