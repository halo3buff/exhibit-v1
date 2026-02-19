const Database = require('better-sqlite3');
const db = new Database('./artworks.db');

console.log('\n--- DESIGN CLASSIFICATIONS ---');
const classifications = db.prepare(`
  SELECT classification, COUNT(*) as count
  FROM artworks
  WHERE primaryCategory = 'Design'
  GROUP BY classification
  ORDER BY count DESC
  LIMIT 30
`).all();

console.table(classifications);

console.log('\n--- DESIGN OBJECT TYPES ---');
const objectTypes = db.prepare(`
  SELECT objectType, COUNT(*) as count
  FROM artworks
  WHERE primaryCategory = 'Design'
  GROUP BY objectType
  ORDER BY count DESC
  LIMIT 30
`).all();

console.table(objectTypes);

db.close();
