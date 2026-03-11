const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.join(__dirname, '../artworks.db');
const db = new Database(dbPath);

console.log('\n=== ARTWORKS BY MAIN CATEGORY ===\n');

// Replaced 'type' with 'main_category' to match your schema
const rows = db.prepare(`
  SELECT main_category, COUNT(*) as count 
  FROM artworks 
  GROUP BY main_category 
  ORDER BY count DESC
`).all();

console.table(rows);

console.log('\n=== TOP SUBCATEGORIES ===\n');

const subRows = db.prepare(`
  SELECT main_category, sub_category, COUNT(*) as count 
  FROM artworks 
  WHERE sub_category IS NOT NULL
  GROUP BY sub_category 
  ORDER BY count DESC 
  LIMIT 10
`).all();

console.table(subRows);

// Updated sample query to use existing columns
const sample = db.prepare(`
  SELECT title, author, main_category, sub_category 
  FROM artworks 
  WHERE imageUrl IS NOT NULL 
  LIMIT 10
`).all();

console.log('\n=== SAMPLE ENTRIES ===\n');
console.table(sample);

db.close();