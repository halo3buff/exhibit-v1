// scripts/migrate-canvas-v2.mjs
// Run: node scripts/migrate-canvas-v2.mjs
//
// - Drops exhibit_edges (item-to-item connections, replaced by freehand strokes)
// - Creates exhibit_strokes (freehand SVG paths, canvas-level)
// - Creates exhibit_notes v2 (invisible card, rich text: fontSize, bold, italic)

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH   = path.join(__dirname, '..', 'app.db');

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  -- Remove old item-to-item edge table if it exists
  DROP TABLE IF EXISTS exhibit_edges;

  -- Freehand strokes: each row is one continuous pen stroke
  CREATE TABLE IF NOT EXISTS exhibit_strokes (
    id         TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
    exhibitId  TEXT NOT NULL REFERENCES exhibits(id) ON DELETE CASCADE,
    pathData   TEXT NOT NULL,
    color      TEXT NOT NULL DEFAULT 'rgba(0,0,0,0.55)',
    width      REAL NOT NULL DEFAULT 1.5,
    createdAt  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_exhibit_strokes_exhibit ON exhibit_strokes(exhibitId);

  -- Notes v2: invisible background, rich inline text
  CREATE TABLE IF NOT EXISTS exhibit_notes (
    id         TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
    exhibitId  TEXT NOT NULL REFERENCES exhibits(id) ON DELETE CASCADE,
    x          REAL NOT NULL DEFAULT 100,
    y          REAL NOT NULL DEFAULT 100,
    content    TEXT NOT NULL DEFAULT '',
    fontSize   REAL NOT NULL DEFAULT 13,
    bold       INTEGER NOT NULL DEFAULT 0,
    italic     INTEGER NOT NULL DEFAULT 0,
    createdAt  TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_exhibit_notes_exhibit ON exhibit_notes(exhibitId);
`);

db.close();
console.log('✓ exhibit_strokes + exhibit_notes tables ready');
