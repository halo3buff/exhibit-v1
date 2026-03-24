// scripts/migrate-v2.mjs
// Run once: node scripts/migrate-v2.mjs
// Adds wallTransform column to exhibit_items for pinboard drag/rotate/scale

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', 'artworks.db');

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

// Add wallTransform column if it doesn't exist
try {
  db.exec(`ALTER TABLE exhibit_items ADD COLUMN wallTransform TEXT NOT NULL DEFAULT '{}'`);
  console.log('✅ Added wallTransform column to exhibit_items');
} catch (e) {
  if (e.message.includes('duplicate column')) {
    console.log('ℹ️  wallTransform column already exists, skipping');
  } else {
    throw e;
  }
}

db.close();
console.log('✅ Migration v2 complete');
