// src/pipeline/03-load/03-load-nypl.ts
import * as fs from 'fs';
import * as path from 'path';
import Database from 'better-sqlite3';

const PROCESSED_DIR = path.join(process.cwd(), 'data', 'processed');
const DB_PATH       = path.join(process.cwd(), 'artworks.db');
const SOURCE_PREFIX = 'nypl-';
const SOURCE_NAME   = 'nypl';

function extractYearSort(year: string): number | null {
  if (!year || year === 'n.d.') return null;
  const match = year.match(/\b(1[0-9]{3}|20[0-9]{2})\b/);
  return match ? parseInt(match[0]) : null;
}

async function main() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║  NYPL LOAD — Importing to SQLite                         ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  if (!fs.existsSync(PROCESSED_DIR)) {
    console.error('❌ /data/processed/ not found. Run transform first.');
    process.exit(1);
  }

  const files = fs.readdirSync(PROCESSED_DIR)
    .filter(f => f.startsWith(SOURCE_PREFIX) && f.endsWith('.json'));

  if (files.length === 0) {
    console.error(`❌ No processed ${SOURCE_NAME} files found. Run transform first.`);
    process.exit(1);
  }
  console.log(`📦 Found ${files.length} processed files\n`);

  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS artworks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      author TEXT NOT NULL,
      year TEXT NOT NULL,
      year_sort INTEGER,
      mainCategory TEXT NOT NULL,
      subCategory TEXT,
      source TEXT NOT NULL,
      imageUrl TEXT NOT NULL,
      link TEXT NOT NULL,
      classification TEXT,
      medium TEXT,
      department TEXT,
      objectType TEXT,
      confidenceScore INTEGER,
      origin TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_mainCategory ON artworks(mainCategory);
    CREATE INDEX IF NOT EXISTS idx_subCategory  ON artworks(subCategory);
    CREATE INDEX IF NOT EXISTS idx_source       ON artworks(source);
    CREATE INDEX IF NOT EXISTS idx_year_sort    ON artworks(year_sort);
    CREATE INDEX IF NOT EXISTS idx_origin       ON artworks(origin);
  `);

  const insert = db.prepare(`
    INSERT OR REPLACE INTO artworks (
      id, title, author, year, year_sort, mainCategory, subCategory,
      source, imageUrl, link, classification, medium, department,
      objectType, confidenceScore, origin
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertMany = db.transaction((items: any[]) => {
    for (const item of items) {
      insert.run(
        item.id, item.title, item.author, item.year,
        extractYearSort(item.year),
        item.mainCategory, item.subCategory || null,
        item.source, item.imageUrl, item.link,
        item.classification || null, item.medium || null,
        item.department || null, item.objectType || null,
        item.confidenceScore || null, item.origin || null
      );
    }
  });

  let inserted = 0, errors = 0;
  const batchSize = 500;
  console.log('💾 Inserting into database...');

  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files.slice(i, i + batchSize);
    const items: any[] = [];
    for (const file of batch) {
      try { items.push(JSON.parse(fs.readFileSync(path.join(PROCESSED_DIR, file), 'utf8'))); }
      catch (e: any) { console.warn(`⚠️  ${file}: ${e.message}`); errors++; }
    }
    if (items.length > 0) { insertMany(items); inserted += items.length; }
  }

  const total = (db.prepare(`SELECT COUNT() as n FROM artworks WHERE source = ?`).get(SOURCE_NAME) as any).n;
  const byCat = db.prepare(`SELECT mainCategory, COUNT() as n FROM artworks WHERE source = ? GROUP BY mainCategory ORDER BY n DESC`).all(SOURCE_NAME) as any[];
  db.close();

  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║  LOAD COMPLETE                                            ║');
  console.log('╠═══════════════════════════════════════════════════════════╣');
  console.log(`   Inserted  : ${inserted}  |  Errors: ${errors}`);
  console.log(`   DB total  : ${total} ${SOURCE_NAME} records`);
  console.log('\n   By Category:');
  byCat.forEach((r: any) => console.log(`   ${r.mainCategory.padEnd(28)} ${r.n}`));
  console.log('╚═══════════════════════════════════════════════════════════╝\n');
}

main().catch(console.error);
