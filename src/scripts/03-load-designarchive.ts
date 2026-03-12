// src/scripts/03-load-designarchive.ts
// ─────────────────────────────────────────────────────────────────────────────
// LOAD PHASE: Import processed designarchive items into SQLite
// Reads: /data/processed/designarchive-*.json
// Writes: artworks.db (appends to existing database)
// ─────────────────────────────────────────────────────────────────────────────
import * as fs from 'fs';
import * as path from 'path';
import Database from 'better-sqlite3';

const PROCESSED_DIR = path.join(process.cwd(), 'data', 'processed');
const DB_PATH = path.join(process.cwd(), 'artworks.db');
const SOURCE_PREFIX = 'designarchive-';

function extractYearSort(year: string): number | null {
  if (!year || year === 'n.d.') return null;
  const match = year.match(/\b(1[0-9]{3}|20[0-9]{2})\b/);
  return match ? parseInt(match[0]) : null;
}

async function main() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║  DESIGN ARCHIVE LOAD — Importing to SQLite               ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');
  
  if (!fs.existsSync(PROCESSED_DIR)) {
    console.error('❌ /data/processed/ directory not found. Run transform first.');
    process.exit(1);
  }
  
  // Read only designarchive processed item files
  const files = fs.readdirSync(PROCESSED_DIR)
    .filter(f => f.startsWith(SOURCE_PREFIX) && f.endsWith('.json'));
  
  if (files.length === 0) {
    console.error('❌ No processed designarchive files found. Run transform first.');
    process.exit(1);
  }
  
  console.log(`📦 Found ${files.length} processed designarchive files\n`);
  
  // Open database (read-write, create if not exists)
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  
  // Ensure schema exists (idempotent)
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
  
  // Indexes for common queries
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_mainCategory ON artworks(mainCategory);
    CREATE INDEX IF NOT EXISTS idx_subCategory ON artworks(subCategory);
    CREATE INDEX IF NOT EXISTS idx_source ON artworks(source);
    CREATE INDEX IF NOT EXISTS idx_year_sort ON artworks(year_sort);
    CREATE INDEX IF NOT EXISTS idx_origin ON artworks(origin);
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
        item.id,
        item.title,
        item.author,
        item.year,
        extractYearSort(item.year),
        item.mainCategory,
        item.subCategory || null,
        item.source,
        item.imageUrl,
        item.link,
        item.classification || null,
        item.medium || null,
        item.department || null,
        item.objectType || null,
        item.confidenceScore || null,
        item.origin || null
      );
    }
  });
  
  // Load and insert items in batches
  const batchSize = 500;
  let inserted = 0;
  let errors = 0;
  
  console.log('💾 Inserting into database...');
  
  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files.slice(i, i + batchSize);
    const items = [];
    
    for (const file of batch) {
      try {
        const filePath = path.join(PROCESSED_DIR, file);
        const item = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        items.push(item);
      } catch (e: any) {
        console.warn(`⚠️  Error reading ${file}: ${e.message}`);
        errors++;
      }
    }
    
    if (items.length > 0) {
      insertMany(items);
      inserted += items.length;
      if (inserted % 2000 === 0) {
        console.log(`   ✓ ${inserted} items inserted...`);
      }
    }
  }
  
  // Stats for designarchive only
  const stats = {
    total: db.prepare(`SELECT COUNT() as count FROM artworks WHERE source = ?`).get(SOURCE_PREFIX.replace('-', '')) as { count: number },
    byCategory: db.prepare(`SELECT mainCategory, COUNT() as count FROM artworks WHERE source = ? GROUP BY mainCategory ORDER BY count DESC`).all(SOURCE_PREFIX.replace('-', '')) as Array<{ mainCategory: string; count: number }>,
  };
  
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║  LOAD COMPLETE                                            ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');
  
  console.log(`📊 Design Archive Stats:`);
  console.log(`Total artworks: ${stats.total.count}`);
  console.log(`Errors: ${errors}`);
  
  console.log(`\n🏷️ By Category:`);
  if (stats.byCategory.length > 0) {
    stats.byCategory.forEach(row => {
      console.log(`${row.mainCategory.padEnd(25)} ${row.count}`);
    });
  } else {
    console.log('  (no categorized items yet)');
  }
  
  console.log(`\n📁 Database: artworks.db\n`);
  
  db.close();
}

main().catch(console.error);