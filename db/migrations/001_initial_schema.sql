-- Migration 001: Initial schema (v2.0.0)
-- All tables for app.db (user data).
-- artworks.db is owned by the pipeline and never altered here.

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

CREATE TABLE IF NOT EXISTS exhibit_edges (
  id         TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  exhibitId  TEXT NOT NULL REFERENCES exhibits(id) ON DELETE CASCADE,
  fromItemId TEXT NOT NULL,
  toItemId   TEXT NOT NULL,
  createdAt  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_exhibit_edges_exhibit ON exhibit_edges(exhibitId);
CREATE UNIQUE INDEX IF NOT EXISTS idx_exhibit_edges_unique ON exhibit_edges(exhibitId, fromItemId, toItemId);
