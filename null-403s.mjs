// One-off: nulls the 403s saved in fix-failures-report.json
// Run: node null-403s.mjs  (from project root)
import fs from 'fs';
import Database from 'better-sqlite3';

const report = JSON.parse(fs.readFileSync('fix-failures-report.json', 'utf8'));
const db     = new Database('artworks.db');
const stmt   = db.prepare(`UPDATE artworks SET imageUrl = '' WHERE imageUrl = ?`);
const result = db.transaction(() => report.forEach(r => stmt.run(r.url)))();
db.close();
console.log(`✅ Nulled ${report.length} stuck 403 URLs — they won't appear in the gallery.`);
