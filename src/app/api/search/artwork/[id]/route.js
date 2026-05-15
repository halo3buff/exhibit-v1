// src/app/api/artwork/[id]/route.js
import Database from 'better-sqlite3';
import path from 'path';

let _db = null;

function getDb() {
  if (_db) return _db;
  const DB_PATH = path.join(process.cwd(), 'artworks.db');
  try {
    _db = new Database(DB_PATH, { readonly: true });
    _db.pragma('journal_mode = WAL');
    _db.pragma('cache_size = -64000');
    _db.pragma('temp_store = memory');
    return _db;
  } catch (e) {
    console.error('[API] Could not open artworks.db:', e.message);
    return null;
  }
}

export async function GET(request, { params }) {
  const { id: rawId } = await params;
  const id = decodeURIComponent(rawId);
  const db = getDb();
  if (!db) return Response.json({ error: 'Database unavailable' }, { status: 500 });

  try {
    const item = db.prepare(`
      SELECT id, title, author, year, imageUrl, source, link,
             mainCategory AS type, subCategory, classification, medium, department
      FROM artworks
      WHERE id = ?
    `).get(id);

    if (!item) return Response.json({ error: 'Not found' }, { status: 404 });
    return Response.json({ item });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}