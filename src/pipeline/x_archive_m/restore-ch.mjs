// src/scripts/restore-ch.mjs
// Restores Cooper Hewitt rows in the DB from processed JSON files.
// Does NOT touch any other source.
// Run: node src/scripts/restore-ch.mjs

import fs       from 'fs';
import path     from 'path';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';

const __dirname      = path.dirname(fileURLToPath(import.meta.url));
const ROOT           = path.join(__dirname, '..', '..');
const PROCESSED_DIR  = path.join(ROOT, 'data', 'processed');
const DB_PATH        = path.join(ROOT, 'artworks.db');

function extractYearSort(year) {
  if (!year || year === 'n.d.') return null;
  const match = year.match(/\b(1[0-9]{3}|20[0-9]{2})\b/);
  return match ? parseInt(match[0]) : null;
}

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

const upsert = db.prepare(`
  INSERT OR REPLACE INTO artworks (
    id, title, author, year, year_sort, mainCategory, subCategory,
    source, imageUrl, link, classification, medium, department, objectType, confidenceScore
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const files = fs.readdirSync(PROCESSED_DIR).filter(f => f.startsWith('cooperhewitt-') && f.endsWith('.json'));
console.log(`\n🔄 Restoring ${files.length.toLocaleString()} Cooper Hewitt records from processed files...\n`);

const restoreAll = db.transaction(() => {
  for (const file of files) {
    const item = JSON.parse(fs.readFileSync(path.join(PROCESSED_DIR, file), 'utf8'));
    upsert.run(
      item.id, item.title, item.author, item.year, extractYearSort(item.year),
      item.mainCategory, item.subCategory || null, item.source,
      item.imageUrl, item.link, item.classification || null,
      item.medium || null, item.department || null,
      item.objectType || null, item.confidenceScore || null
    );
  }
});

restoreAll();
db.close();

console.log(`✅ Done — ${files.length.toLocaleString()} Cooper Hewitt records restored to original classification.\n`);
