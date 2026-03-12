// src/scripts/show-subcategories.mjs
// Run: node src/scripts/show-subcategories.mjs
// Shows every subCategory and its count, grouped by mainCategory

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT    = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const db      = new Database(path.join(ROOT, 'artworks.db'), { readonly: true });

const rows = db.prepare(`
  SELECT 
    mainCategory,
    subCategory,
    COUNT(*) as count
  FROM artworks
  WHERE imageUrl IS NOT NULL AND imageUrl != ''
  GROUP BY mainCategory, subCategory
  ORDER BY mainCategory, count DESC
`).all();

db.close();

let currentCat = null;
let catTotal = 0;
const byCategory = {};

for (const row of rows) {
  if (!byCategory[row.mainCategory]) byCategory[row.mainCategory] = [];
  byCategory[row.mainCategory].push(row);
}

for (const [cat, subs] of Object.entries(byCategory)) {
  const total = subs.reduce((s, r) => s + r.count, 0);
  console.log(`\n${'─'.repeat(50)}`);
  console.log(`${cat.toUpperCase()}  (${total} total)`);
  console.log(`${'─'.repeat(50)}`);
  for (const row of subs) {
    const bar = '█'.repeat(Math.round((row.count / total) * 30));
    const sub = (row.subCategory || '(none)').padEnd(35);
    console.log(`  ${sub} ${row.count.toString().padStart(6)}  ${bar}`);
  }
}
