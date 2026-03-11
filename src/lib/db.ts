import Database from 'better-sqlite3';
import path from 'path';

let _db: Database.Database | null = null;

export function getDb() {
  if (_db) return _db;
  
  const DB_PATH = path.join(process.cwd(), 'artworks.db');
  _db = new Database(DB_PATH, { readonly: true });
  
  // Performance optimizations
  _db.pragma('journal_mode = WAL');
  _db.pragma('cache_size = -64000');
  _db.pragma('temp_store = memory');
  _db.pragma('synchronous = NORMAL');
  
  return _db;
}

export function closeDb() {
  if (_db) {
    _db.close();
    _db = null;
  }
}