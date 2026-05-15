// scripts/migrate.mjs
// Run once: node scripts/migrate.mjs
// Adds users, sessions, exhibits, exhibit_items to app.db

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', 'app.db');

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  -- ── Users ──────────────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS users (
    id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    email       TEXT UNIQUE NOT NULL,
    password    TEXT NOT NULL,
    displayName TEXT NOT NULL DEFAULT '',
    createdAt   TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- ── Sessions ───────────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS sessions (
    id        TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(32)))),
    userId    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    expiresAt TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_sessions_userId   ON sessions(userId);
  CREATE INDEX IF NOT EXISTS idx_sessions_expiresAt ON sessions(expiresAt);

  -- ── Exhibits ───────────────────────────────────────────────────
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

  -- ── Exhibit Items ──────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS exhibit_items (
    id         TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    exhibitId  TEXT NOT NULL REFERENCES exhibits(id) ON DELETE CASCADE,
    artworkId  TEXT NOT NULL,
    note       TEXT NOT NULL DEFAULT '',
    position   INTEGER NOT NULL DEFAULT 0,
    addedAt    TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_exhibit_items_exhibitId ON exhibit_items(exhibitId);
  CREATE UNIQUE INDEX IF NOT EXISTS idx_exhibit_items_unique ON exhibit_items(exhibitId, artworkId);
`);

db.close();
console.log('✅ Migration complete — users, sessions, exhibits, exhibit_items tables ready.');
