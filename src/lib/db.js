// src/lib/db.js
// Shared database helpers for API routes.
// All exhibit and auth routes should use withDb() instead of opening connections
// directly, so that db.close() is always guaranteed by the finally block.
//
// NOTE: /api/search/route.js and /api/search/artwork/[id]/route.js intentionally
// use a persistent singleton DB connection with aggressive read-optimization pragmas
// (cache_size, mmap_size, temp_store). Do NOT migrate those routes to withDb().
//
// DATABASE SPLIT:
//   app.db     — user data: users, sessions, exhibits, exhibit_items, exhibit_notes, exhibit_strokes
//   artworks.db — artwork catalog, owned by the pipeline (never wiped on load)
// withDb() opens app.db and ATTACHes artworks.db as "catalog" so existing
// JOIN artworks queries continue to work unchanged (SQLite resolves unqualified
// table names by searching attached schemas after main).

import Database from 'better-sqlite3';
import path from 'path';

const APP_DB_PATH      = path.join(process.cwd(), 'app.db');
// Forward-slashes work on Windows in SQLite file paths
const ARTWORKS_DB_SQL  = path.join(process.cwd(), 'artworks.db').replace(/\\/g, '/');

// ── Schema bootstrap ─────────────────────────────────────────────────────────
// Creates all user-data tables in app.db if they don't exist.
// Called once per process. Safe to re-call (all statements use IF NOT EXISTS).
let _schemaReady = false;
export function ensureSchema() {
  if (_schemaReady) return;
  const db = new Database(APP_DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(`
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
  db.close();
  _schemaReady = true;
}

/**
 * Open app.db, attach artworks.db as "catalog", run fn(db), always close.
 * fn must be synchronous (better-sqlite3 is sync).
 * Async work (requireAuth, request.json, bcrypt) must happen BEFORE calling withDb.
 *
 * @param {(db: Database) => T} fn
 * @param {{ readonly?: boolean }} options
 * @returns {T}
 */
export function withDb(fn, { readonly = false } = {}) {
  ensureSchema();
  const db = new Database(APP_DB_PATH, readonly ? { readonly: true } : undefined);
  if (!readonly) {
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  try {
    db.exec(`ATTACH DATABASE '${ARTWORKS_DB_SQL}' AS catalog`);
  } catch (_) {
    // artworks.db may not exist before the pipeline has run — queries against
    // catalog.artworks will simply fail at query time with "no such table"
  }
  try {
    return fn(db);
  } finally {
    db.close();
  }
}

/**
 * Assert the current user owns an exhibit.
 * Throws a 404 or 403 Response if not — caught by the route's catch block.
 *
 * @param {Database} db
 * @param {string} exhibitId
 * @param {string} userId
 * @returns {{ id: string, userId: string }} The exhibit row
 */
export function requireExhibitOwner(db, exhibitId, userId) {
  const exhibit = db.prepare('SELECT id, userId FROM exhibits WHERE id = ?').get(exhibitId);
  if (!exhibit) throw Response.json({ error: 'Not found' }, { status: 404 });
  if (exhibit.userId !== userId) throw Response.json({ error: 'Forbidden' }, { status: 403 });
  return exhibit;
}

/**
 * Assert the current user can access an exhibit (owner OR public).
 * Throws a 404 or 403 Response if not.
 *
 * @param {Database} db
 * @param {string} exhibitId
 * @param {string} userId
 * @returns {{ id: string, userId: string, isPublic: number }} The exhibit row
 */
export function requireExhibitAccess(db, exhibitId, userId) {
  const exhibit = db.prepare('SELECT id, userId, isPublic FROM exhibits WHERE id = ?').get(exhibitId);
  if (!exhibit) throw Response.json({ error: 'Not found' }, { status: 404 });
  if (exhibit.userId !== userId && !exhibit.isPublic) {
    throw Response.json({ error: 'Forbidden' }, { status: 403 });
  }
  return exhibit;
}

/**
 * Bump the updatedAt timestamp on an exhibit.
 * Call this after any mutation to exhibit_items, exhibit_notes, exhibit_strokes.
 *
 * @param {Database} db
 * @param {string} exhibitId
 */
export function touchExhibit(db, exhibitId) {
  db.prepare("UPDATE exhibits SET updatedAt = datetime('now') WHERE id = ?").run(exhibitId);
}
