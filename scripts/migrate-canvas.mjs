// scripts/migrate-canvas.mjs
// Run once: node scripts/migrate-canvas.mjs
// Adds exhibit_edges and exhibit_notes tables for the infinite canvas feature.

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH   = path.join(__dirname, '..', 'app.db');

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  -- Connection lines between exhibit items on the canvas
  CREATE TABLE IF NOT EXISTS exhibit_edges (
    id         TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
    exhibitId  TEXT NOT NULL REFERENCES exhibits(id) ON DELETE CASCADE,
    fromItemId TEXT NOT NULL,
    toItemId   TEXT NOT NULL,
    createdAt  TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(exhibitId, fromItemId, toItemId)
  );

  CREATE INDEX IF NOT EXISTS idx_exhibit_edges_exhibit ON exhibit_edges(exhibitId);

  -- Freestanding text notes on the canvas
  CREATE TABLE IF NOT EXISTS exhibit_notes (
    id        TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
    exhibitId TEXT NOT NULL REFERENCES exhibits(id) ON DELETE CASCADE,
    x         REAL NOT NULL DEFAULT 100,
    y         REAL NOT NULL DEFAULT 100,
    width     REAL NOT NULL DEFAULT 220,
    content   TEXT NOT NULL DEFAULT '',
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_exhibit_notes_exhibit ON exhibit_notes(exhibitId);
`);

db.close();
console.log('✓ exhibit_edges and exhibit_notes tables created');
