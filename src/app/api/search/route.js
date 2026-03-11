// src/app/api/search/route.js
import Database from 'better-sqlite3';
import path from 'path';

let _db = null;
const idCache = new Map();

function getDb() {
  if (_db) return _db;
  try {
    const DB_PATH = path.join(process.cwd(), 'artworks.db');
    _db = new Database(DB_PATH, { readonly: true });
    _db.pragma('journal_mode = WAL');
    _db.pragma('cache_size = -64000');
    _db.pragma('temp_store = memory');
    _db.pragma('mmap_size = 268435456');
    return _db;
  } catch (err) {
    return null;
  }
}

function getIds(db, where, params) {
  const key = where + JSON.stringify(params);
  if (idCache.has(key)) return idCache.get(key);
  const ids = db.prepare(`SELECT id FROM artworks WHERE ${where}`).all(...params).map(r => r.id);
  idCache.set(key, ids);
  setTimeout(() => idCache.delete(key), 10 * 60 * 1000);
  return ids;
}

function pickRandom(arr, limit) {
  if (!arr || arr.length === 0) return [];
  const result = [...arr];
  const n = Math.min(limit, result.length);
  for (let i = 0; i < n; i++) {
    const j = i + Math.floor(Math.random() * (result.length - i));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result.slice(0, n);
}

const stmtCache = new Map();
function fetchByIds(db, ids) {
  if (!ids || ids.length === 0) return [];
  const key = ids.length;
  if (!stmtCache.has(key)) {
    stmtCache.set(key, db.prepare(`
      SELECT id, title, author, year, imageUrl, source, link,
             mainCategory AS type, subCategory, classification, medium, department
      FROM artworks
      WHERE id IN (${ids.map(() => '?').join(',')})
        AND imageUrl IS NOT NULL AND imageUrl != ''
    `));
  }
  return stmtCache.get(key).all(...ids);
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);

  const db = getDb();
  if (!db) return Response.json({ error: 'Database unavailable', results: [] }, { status: 500 });

  // ── Counts endpoint ──────────────────────────────────────────────────────────
  if (searchParams.get('counts') === '1') {
    const rows = db.prepare(`
      SELECT mainCategory, COUNT(*) as n
      FROM artworks
      WHERE imageUrl IS NOT NULL AND imageUrl != ''
      GROUP BY mainCategory
    `).all();
    return Response.json({ counts: Object.fromEntries(rows.map(r => [r.mainCategory, r.n])) });
  }

  // ── Normal search ────────────────────────────────────────────────────────────
  const contentType = searchParams.get('type');
  const subCategory = searchParams.get('sub');
  const limit       = Math.min(parseInt(searchParams.get('limit') || '50'), 200);
  const pageParam   = searchParams.get('page');
  const page        = pageParam ? Math.max(1, parseInt(pageParam)) : null;

  try {
    const baseWhere = `imageUrl IS NOT NULL AND imageUrl != ''`;
    let ids;

    if (contentType && contentType !== 'all' && subCategory) {
      ids = getIds(db, `mainCategory = ? AND subCategory = ? AND ${baseWhere}`, [contentType, subCategory]);
    } else if (contentType && contentType !== 'all') {
      ids = getIds(db, `mainCategory = ? AND ${baseWhere}`, [contentType]);
    } else {
      ids = getIds(db, baseWhere, []);
    }

    let selectedIds, pagination = null;

    if (page !== null) {
      const offset = (page - 1) * limit;
      selectedIds  = ids.slice(offset, offset + limit);
      pagination   = { page, limit, total: ids.length, hasMore: offset + limit < ids.length };
    } else {
      selectedIds = pickRandom(ids, limit);
    }

    const results = fetchByIds(db, selectedIds);
    return Response.json({ results: results || [], ...(pagination ? { pagination } : {}) });

  } catch (error) {
    return Response.json({ error: error.message, results: [] }, { status: 500 });
  }
}