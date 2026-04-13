// src/lib/db.js
// Shared database helpers for API routes.
// All exhibit and auth routes should use withDb() instead of opening connections
// directly, so that db.close() is always guaranteed by the finally block.
//
// NOTE: /api/search/route.js and /api/search/artwork/[id]/route.js intentionally
// use a persistent singleton DB connection with aggressive read-optimization pragmas
// (cache_size, mmap_size, temp_store). Do NOT migrate those routes to withDb().

import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'artworks.db');

/**
 * Open a DB connection, run fn(db), then always close in a finally block.
 * fn must be synchronous (better-sqlite3 is sync).
 * Async work (requireAuth, request.json, bcrypt) must happen BEFORE calling withDb.
 *
 * @param {(db: Database) => T} fn
 * @param {{ readonly?: boolean }} options
 * @returns {T}
 */
export function withDb(fn, { readonly = false } = {}) {
  const db = new Database(DB_PATH, readonly ? { readonly: true } : undefined);
  if (!readonly) {
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
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
 * Call this after any mutation to exhibit_items, exhibit_notes, exhibit_strokes, exhibit_edges.
 *
 * @param {Database} db
 * @param {string} exhibitId
 */
export function touchExhibit(db, exhibitId) {
  db.prepare("UPDATE exhibits SET updatedAt = datetime('now') WHERE id = ?").run(exhibitId);
}
