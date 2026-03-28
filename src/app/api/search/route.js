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
      SELECT id, title, author, year, year_sort, imageUrl, source, link,
             mainCategory AS type, subCategory, classification, medium, department, origin
      FROM artworks
      WHERE id IN (${ids.map(() => '?').join(',')})
        AND imageUrl IS NOT NULL AND imageUrl != ''
    `));
  }
  return stmtCache.get(key).all(...ids);
}

// Build a source-filter aware WHERE clause
function buildWhere(params) {
  const {
    contentType, subCategory, sources,
    yearMin, yearMax, noDate,
  } = params;

  const clauses = [
    `imageUrl IS NOT NULL AND imageUrl != ''`,
    `source NOT IN ('letterformarchive', 'europeana')`,
  ];
  const values = [];

  if (contentType && contentType !== 'all') {
    if (subCategory) {
      clauses.push(`mainCategory = ? AND subCategory = ?`);
      values.push(contentType, subCategory);
    } else {
      clauses.push(`mainCategory = ?`);
      values.push(contentType);
    }
  }

  // Source filter — if any sources selected, restrict to them
  if (sources && sources.length > 0) {
    clauses.push(`source IN (${sources.map(() => '?').join(',')})`);
    values.push(...sources);
  }

  // Year range filter
  // year_sort is an integer (YYYY). NULL = no date.
  if (yearMin !== null || yearMax !== null || noDate === false) {
    const yearClauses = [];

    if (yearMin !== null && yearMax !== null) {
      yearClauses.push(`(year_sort >= ? AND year_sort <= ?)`);
      values.push(yearMin, yearMax);
    } else if (yearMin !== null) {
      yearClauses.push(`year_sort >= ?`);
      values.push(yearMin);
    } else if (yearMax !== null) {
      yearClauses.push(`year_sort <= ?`);
      values.push(yearMax);
    }

    if (noDate === true) {
      // Include dateless pieces alongside the year range
      if (yearClauses.length > 0) {
        yearClauses[0] = `(${yearClauses[0]} OR year_sort IS NULL)`;
      } else {
        yearClauses.push(`year_sort IS NULL`);
      }
    } else if (yearMin !== null || yearMax !== null) {
      // Exclude dateless pieces when a range is set and noDate is off
      yearClauses.push(`year_sort IS NOT NULL`);
    }

    if (yearClauses.length > 0) {
      clauses.push(`(${yearClauses.join(' AND ')})`);
    }
  }

  return { where: clauses.join(' AND '), values };
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const db = getDb();
  if (!db) return Response.json({ error: 'Database unavailable', results: [] }, { status: 500 });

  // ── Counts endpoint ──────────────────────────────────────────────────────
  if (searchParams.get('counts') === '1') {
    const rows = db.prepare(`
      SELECT mainCategory, COUNT(*) as n
      FROM artworks
      WHERE imageUrl IS NOT NULL AND imageUrl != ''
      GROUP BY mainCategory
    `).all();
    return Response.json({ counts: Object.fromEntries(rows.map(r => [r.mainCategory, r.n])) });
  }

  // ── Sources list endpoint — distinct sources for a category ──────────────
  if (searchParams.get('sources') === '1') {
    const contentType = searchParams.get('type');
    const clause = contentType && contentType !== 'all'
      ? `mainCategory = ? AND imageUrl IS NOT NULL AND imageUrl != '' AND source NOT IN ('letterformarchive','europeana')`
      : `imageUrl IS NOT NULL AND imageUrl != '' AND source NOT IN ('letterformarchive','europeana')`;
    const params = contentType && contentType !== 'all' ? [contentType] : [];
    const rows = db.prepare(`SELECT DISTINCT source, COUNT(*) as n FROM artworks WHERE ${clause} GROUP BY source ORDER BY n DESC`).all(...params);
    return Response.json({ sources: rows });
  }

  // ── Year range endpoint — min/max year_sort for a category ───────────────
  if (searchParams.get('yearRange') === '1') {
    const contentType = searchParams.get('type');
    const clause = contentType && contentType !== 'all'
      ? `mainCategory = ? AND year_sort IS NOT NULL AND imageUrl IS NOT NULL AND imageUrl != ''`
      : `year_sort IS NOT NULL AND imageUrl IS NOT NULL AND imageUrl != ''`;
    const params = contentType && contentType !== 'all' ? [contentType] : [];
    const row = db.prepare(`SELECT MIN(year_sort) as minYear, MAX(year_sort) as maxYear FROM artworks WHERE ${clause}`).get(...params);
    return Response.json({ minYear: row?.minYear ?? 1000, maxYear: row?.maxYear ?? 2025 });
  }

  // ── Normal search ────────────────────────────────────────────────────────
  const contentType  = searchParams.get('type');
  const subCategory  = searchParams.get('sub');
  const limit        = Math.min(parseInt(searchParams.get('limit') || '50'), 200);
  const pageParam    = searchParams.get('page');
  const page         = pageParam ? Math.max(1, parseInt(pageParam)) : null;

  // New filter params
  const sourcesParam = searchParams.get('source'); // comma-separated
  const sources      = sourcesParam ? sourcesParam.split(',').filter(Boolean) : [];
  const yearMinParam = searchParams.get('yearMin');
  const yearMaxParam = searchParams.get('yearMax');
  const yearMin      = yearMinParam ? parseInt(yearMinParam) : null;
  const yearMax      = yearMaxParam ? parseInt(yearMaxParam) : null;
  const noDate       = searchParams.get('noDate') === '1';

  try {
    const { where, values } = buildWhere({ contentType, subCategory, sources, yearMin, yearMax, noDate });
    const ids = getIds(db, where, values);

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