/**
 * API ROUTE: /api/search
 * Queries artworks.db (SQLite) instead of live APIs
 */

import Database from 'better-sqlite3';
import path from 'path';

let _db = null;

function getDb() {
  if (_db) return _db;
  
  const DB_PATH = path.join(process.cwd(), 'artworks.db');
  
  try {
    _db = new Database(DB_PATH, { readonly: true });
    _db.pragma('journal_mode = WAL');
    return _db;
  } catch (e) {
    console.error('[API] Could not open artworks.db:', e.message);
    console.error('[API] Run: node scripts/build-database.js');
    return null;
  }
}

const cache = new Map();
const CACHE_TTL = 1000 * 60 * 10; // 10 minutes

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const contentType = searchParams.get('type');
  const limit = parseInt(searchParams.get('limit') || '500');
  const offset = parseInt(searchParams.get('offset') || '0');

  console.log(`[API] type=${contentType || 'ALL'} limit=${limit} offset=${offset}`);

  // Check cache
  const cacheKey = `${contentType}-${limit}-${offset}`;
  if (cache.has(cacheKey)) {
    const cached = cache.get(cacheKey);
    if (Date.now() - cached.timestamp < CACHE_TTL) {
      console.log(`[API] Cache hit: ${cached.data.length} items`);
      return Response.json(cached.data);
    }
  }

  // Open database
  const db = getDb();
  if (!db) {
    return Response.json(
      { error: 'Database not found. Run: node scripts/build-database.js' },
      { status: 500 }
    );
  }

  try {
    let results;

    if (contentType) {
      results = db.prepare(`
        SELECT id, title, author, year, imageUrl, source, link,
               type, classification, objectType, medium
        FROM artworks
        WHERE type = ?
          AND imageUrl IS NOT NULL
          AND imageUrl != ''
        ORDER BY RANDOM()
        LIMIT ? OFFSET ?
      `).all(contentType, limit, offset);
    } else {
      results = db.prepare(`
        SELECT id, title, author, year, imageUrl, source, link,
               type, classification, objectType, medium
        FROM artworks
        WHERE imageUrl IS NOT NULL
          AND imageUrl != ''
        ORDER BY RANDOM()
        LIMIT ? OFFSET ?
      `).all(limit, offset);
    }

    console.log(`[API] Returned ${results.length} items`);

    // Cache results
    cache.set(cacheKey, { data: results, timestamp: Date.now() });

    return Response.json(results);

  } catch (e) {
    console.error('[API] Query error:', e.message);
    return Response.json({ error: e.message }, { status: 500 });
  }
}