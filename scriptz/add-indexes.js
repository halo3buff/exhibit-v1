// scriptz/add-indexes.js
// Run once: node scriptz/add-indexes.js
// Adds indexes to artworks.db so category filter queries are fast.
// Safe to re-run — uses CREATE INDEX IF NOT EXISTS.

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', 'artworks.db');

console.log(`Opening database at: ${DB_PATH}`);

const db = new Database(DB_PATH);

console.log('Creating indexes...');

// ⚠️ Column names are camelCase: mainCategory, subCategory (NOT snake_case)
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_mainCategory ON artworks(mainCategory);
  CREATE INDEX IF NOT EXISTS idx_subCategory ON artworks(subCategory);
  CREATE INDEX IF NOT EXISTS idx_year_sort ON artworks(year_sort);
  CREATE INDEX IF NOT EXISTS idx_source ON artworks(source);
  CREATE INDEX IF NOT EXISTS idx_title ON artworks(title);
  CREATE INDEX IF NOT EXISTS idx_id ON artworks(id);
  CREATE INDEX IF NOT EXISTS idx_imageUrl ON artworks(imageUrl) WHERE imageUrl IS NOT NULL AND imageUrl != '';
`);

console.log('✅ Indexes created successfully');

// Show what was created
const indexes = db.prepare(`SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='artworks'`).all();
console.log('\nIndexes on artworks table:');
indexes.forEach(idx => console.log(`  ✓ ${idx.name}`));

db.close();