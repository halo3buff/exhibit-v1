// scripts/migrate-to-app-db.mjs
// One-time migration: copy user tables from artworks.db → app.db
// Run ONCE after upgrading to the split-DB layout:
//   node scripts/migrate-to-app-db.mjs
//
// Safe to re-run — uses INSERT OR IGNORE so existing rows are preserved.

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC_PATH  = path.join(__dirname, '..', 'artworks.db');
const DEST_PATH = path.join(__dirname, '..', 'app.db');

const src  = new Database(SRC_PATH,  { readonly: true });
const dest = new Database(DEST_PATH);
dest.pragma('journal_mode = WAL');
dest.pragma('foreign_keys = ON');

// Create schema in app.db
dest.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    email       TEXT UNIQUE NOT NULL,
    password    TEXT NOT NULL,
    displayName TEXT NOT NULL DEFAULT '',
    createdAt   TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS sessions (
    id        TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(32)))),
    userId    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    expiresAt TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_sessions_userId    ON sessions(userId);
  CREATE INDEX IF NOT EXISTS idx_sessions_expiresAt ON sessions(expiresAt);
  CREATE TABLE IF NOT EXISTS exhibits (
    id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    userId      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title       TEXT NOT NULL DEFAULT 'Untitled Exhibit',
    description TEXT NOT NULL DEFAULT '',
    isPublic    INTEGER NOT NULL DEFAULT 0,
    coverItemId TEXT,
    createdAt   TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt   TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_exhibits_userId ON exhibits(userId);
  CREATE TABLE IF NOT EXISTS exhibit_items (
    id            TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    exhibitId     TEXT NOT NULL REFERENCES exhibits(id) ON DELETE CASCADE,
    artworkId     TEXT NOT NULL,
    note          TEXT NOT NULL DEFAULT '',
    position      INTEGER NOT NULL DEFAULT 0,
    wallTransform TEXT NOT NULL DEFAULT '{}',
    addedAt       TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_exhibit_items_exhibitId ON exhibit_items(exhibitId);
  CREATE UNIQUE INDEX IF NOT EXISTS idx_exhibit_items_unique ON exhibit_items(exhibitId, artworkId);
  CREATE TABLE IF NOT EXISTS exhibit_strokes (
    id        TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
    exhibitId TEXT NOT NULL REFERENCES exhibits(id) ON DELETE CASCADE,
    pathData  TEXT NOT NULL,
    color     TEXT NOT NULL DEFAULT 'rgba(0,0,0,0.55)',
    width     REAL NOT NULL DEFAULT 1.5,
    createdAt TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_exhibit_strokes_exhibit ON exhibit_strokes(exhibitId);
  CREATE TABLE IF NOT EXISTS exhibit_notes (
    id        TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
    exhibitId TEXT NOT NULL REFERENCES exhibits(id) ON DELETE CASCADE,
    x         REAL NOT NULL DEFAULT 100,
    y         REAL NOT NULL DEFAULT 100,
    content   TEXT NOT NULL DEFAULT '',
    fontSize  REAL NOT NULL DEFAULT 13,
    bold      INTEGER NOT NULL DEFAULT 0,
    italic    INTEGER NOT NULL DEFAULT 0,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_exhibit_notes_exhibit ON exhibit_notes(exhibitId);
`);

function tableExists(db, name) {
  return !!db.prepare(`SELECT 1 FROM sqlite_master WHERE type='table' AND name=?`).get(name);
}

function copyTable(tableName, columns) {
  if (!tableExists(src, tableName)) {
    console.log(`  ⏭  ${tableName} — not found in artworks.db, skipping`);
    return 0;
  }
  const rows = src.prepare(`SELECT * FROM ${tableName}`).all();
  if (rows.length === 0) {
    console.log(`  ○  ${tableName} — empty`);
    return 0;
  }
  const placeholders = columns.map(() => '?').join(', ');
  const stmt = dest.prepare(
    `INSERT OR IGNORE INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`
  );
  const insert = dest.transaction(rows => {
    let n = 0;
    for (const row of rows) {
      stmt.run(columns.map(c => row[c]));
      n++;
    }
    return n;
  });
  const n = insert(rows);
  console.log(`  ✓  ${tableName} — ${n} rows copied`);
  return n;
}

console.log('\nMigrating user tables from artworks.db → app.db\n');

copyTable('users',          ['id', 'email', 'password', 'displayName', 'createdAt']);
copyTable('sessions',       ['id', 'userId', 'createdAt', 'expiresAt']);
copyTable('exhibits',       ['id', 'userId', 'title', 'description', 'isPublic', 'coverItemId', 'createdAt', 'updatedAt']);
copyTable('exhibit_items',  ['id', 'exhibitId', 'artworkId', 'note', 'position', 'wallTransform', 'addedAt']);
copyTable('exhibit_strokes',['id', 'exhibitId', 'pathData', 'color', 'width', 'createdAt']);
copyTable('exhibit_notes',  ['id', 'exhibitId', 'x', 'y', 'content', 'fontSize', 'bold', 'italic', 'createdAt', 'updatedAt']);

src.close();
dest.close();

console.log('\n✅ Migration complete. app.db is ready.\n');
console.log('Next steps:');
console.log('  1. Verify the app works: pnpm dev');
console.log('  2. After confirming data is intact, you can remove user tables from artworks.db');
console.log('     (optional — the pipeline will rebuild artworks.db without them anyway)\n');
