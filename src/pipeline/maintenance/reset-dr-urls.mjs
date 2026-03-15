// src/pipeline/maintenance/reset-dr-urls.mjs
// Resets any designreviewed imageUrls that were changed to local paths
// back to the original remote URLs, by reading data/raw/designreviewed/*.json
//
// Run ONCE before prewarm-cache.mjs if you previously ran download-local-images.mjs
//
// node src/pipeline/maintenance/reset-dr-urls.mjs

import fs       from 'fs';
import path     from 'path';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT      = path.join(__dirname, '..', '..', '..');
const DB_PATH   = path.join(ROOT, 'artworks.db');
const RAW_DIR   = path.join(ROOT, 'data', 'raw', 'designreviewed');

const db = new Database(DB_PATH);

// Check how many local paths exist
const localCount = db.prepare(`SELECT COUNT(*) as c FROM artworks WHERE source='designreviewed' AND imageUrl LIKE '/designreviewed-images/%'`).get().c;
const remoteCount = db.prepare(`SELECT COUNT(*) as c FROM artworks WHERE source='designreviewed' AND imageUrl LIKE 'https://%'`).get().c;
console.log(`\n📊 Current DR imageUrl state:`);
console.log(`   Remote URLs : ${remoteCount}`);
console.log(`   Local paths : ${localCount}`);

if (localCount === 0) {
  console.log('\n✅ Nothing to reset — all DR rows already have remote URLs.');
  db.close();
  process.exit(0);
}

console.log(`\n📂 Reading raw files to restore ${localCount} local paths → remote URLs...`);

const files = fs.readdirSync(RAW_DIR).filter(f => f.endsWith('.json'));
const updateStmt = db.prepare(`UPDATE artworks SET imageUrl = ? WHERE id = ? AND imageUrl LIKE '/designreviewed-images/%'`);

let reset = 0;
for (const file of files) {
  try {
    const raw = JSON.parse(fs.readFileSync(path.join(RAW_DIR, file), 'utf8'));
    if (!raw.id || !raw.imageUrl || !raw.imageUrl.startsWith('https://')) continue;
    const result = updateStmt.run(raw.imageUrl, raw.id);
    if (result.changes > 0) reset++;
  } catch {}
}

db.close();
console.log(`✅ Reset ${reset} rows back to remote URLs`);
console.log(`\n   Now run: node src/pipeline/maintenance/prewarm-cache.mjs\n`);
