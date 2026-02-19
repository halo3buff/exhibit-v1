const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.join(__dirname, '../artworks.db');
const db = new Database(dbPath);

console.log('\n=== ARTWORKS BY CATEGORY ===\n');

// We changed 'primaryCategory' to 'type' in the new builder
const rows = db.prepare(`
  SELECT type, COUNT(*) as count 
  FROM artworks 
  GROUP BY type 
  ORDER BY count DESC
`).all();

console.table(rows);

const sample = db.prepare(`SELECT title, author, type FROM artworks LIMIT 10`).all();
console.log('\n=== SAMPLE ENTRIES ===\n');
console.table(sample);

db.close();