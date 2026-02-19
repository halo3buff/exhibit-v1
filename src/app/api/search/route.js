/**
 * API ROUTE: /api/search
 * Updated to match the "main_category" column from build-database.js
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
    return null;
  }
}

const cache = new Map();
const CACHE_TTL = 1000 * 60 * 10; 

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const contentType = searchParams.get('type');
  const limit = parseInt(searchParams.get('limit') || '500');
  const offset = parseInt(searchParams.get('offset') || '0');

  const cacheKey = `${contentType}-${limit}-${offset}`;
  if (cache.has(cacheKey)) {
    const cached = cache.get(cacheKey);
    if (Date.now() - cached.timestamp < CACHE_TTL) {
      return Response.json(cached.data);
    }
  }

  const db = getDb();
  if (!db) {
    return Response.json(
      { error: 'Database not found. Run: node scripts/build-database.js' },
      { status: 500 }
    );
  }

  try {
    let results;

    // CHANGED: We now query "main_category" instead of "type"
    // We use "main_category AS type" so your frontend doesn't need to change
    if (contentType && contentType !== 'all') {
      results = db.prepare(`
        SELECT id, title, author, year, imageUrl, source, link,
               main_category AS type, sub_category, classification, medium
        FROM artworks
        WHERE main_category = ?
          AND imageUrl IS NOT NULL
          AND imageUrl != ''
        ORDER BY RANDOM()
        LIMIT ? OFFSET ?
      `).all(contentType, limit, offset);
    } else {
      results = db.prepare(`
        SELECT id, title, author, year, imageUrl, source, link,
               main_category AS type, sub_category, classification, medium
        FROM artworks
        WHERE imageUrl IS NOT NULL
          AND imageUrl != ''
        ORDER BY RANDOM()
        LIMIT ? OFFSET ?
      `).all(limit, offset);
    }

    cache.set(cacheKey, { data: results, timestamp: Date.now() });
    return Response.json(results);

  } catch (e) {
    console.error('[API] Query error:', e.message);
    return Response.json({ error: e.message }, { status: 500 });
  }
}