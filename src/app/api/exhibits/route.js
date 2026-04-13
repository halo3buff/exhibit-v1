// src/app/api/exhibits/route.js
//
// UPDATED: previewImages now returns objects { url, width, height } instead of
// plain URL strings. Dimensions are read from the artworks.db `imageWidth` and
// `imageHeight` columns if they exist, with a graceful fallback to null.
// If your DB doesn't have those columns yet, run the backfill script:
//   node scripts/backfill-dimensions.mjs
// Until then the formation engine falls back to its bucket defaults.

import { requireAuth } from '@/lib/auth';
import { withDb } from '@/lib/db';

// Check once whether the dimension columns exist (cached for process lifetime)
let _hasDimensions = null;
function hasDimensionColumns(db) {
  if (_hasDimensions !== null) return _hasDimensions;
  try {
    const info = db.prepare('PRAGMA table_info(artworks)').all();
    const cols = new Set(info.map(c => c.name));
    _hasDimensions = cols.has('imageWidth') && cols.has('imageHeight');
  } catch {
    _hasDimensions = false;
  }
  return _hasDimensions;
}

// GET /api/exhibits — list current user's exhibits with preview images
export async function GET(request) {
  try {
    const user = await requireAuth();

    return withDb(db => {
      const withDims = hasDimensionColumns(db);

      const exhibits = db.prepare(`
        SELECT
          e.id, e.title, e.description, e.isPublic, e.createdAt, e.updatedAt,
          COUNT(ei.id) as itemCount,
          (SELECT a.imageUrl FROM exhibit_items ei2
           JOIN artworks a ON a.id = ei2.artworkId
           WHERE ei2.exhibitId = e.id AND a.imageUrl IS NOT NULL AND a.imageUrl != ''
           ORDER BY ei2.addedAt ASC LIMIT 1) as coverImageUrl
        FROM exhibits e
        LEFT JOIN exhibit_items ei ON ei.exhibitId = e.id
        WHERE e.userId = ?
        GROUP BY e.id
        ORDER BY e.updatedAt DESC
      `).all(user.id);

      const previewStmt = withDims
        ? db.prepare(`
            SELECT a.imageUrl, a.imageWidth as width, a.imageHeight as height
            FROM exhibit_items ei
            JOIN artworks a ON a.id = ei.artworkId
            WHERE ei.exhibitId = ? AND a.imageUrl IS NOT NULL AND a.imageUrl != ''
            ORDER BY ei.addedAt ASC
          `)
        : db.prepare(`
            SELECT a.imageUrl, NULL as width, NULL as height
            FROM exhibit_items ei
            JOIN artworks a ON a.id = ei.artworkId
            WHERE ei.exhibitId = ? AND a.imageUrl IS NOT NULL AND a.imageUrl != ''
            ORDER BY ei.addedAt ASC
          `);

      const result = exhibits.map(ex => ({
        ...ex,
        previewImages: previewStmt.all(ex.id).map(r => ({
          url:    r.imageUrl,
          width:  r.width  || null,
          height: r.height || null,
        })),
      }));

      return Response.json({ exhibits: result });
    }, { readonly: true });
  } catch (err) {
    if (err instanceof Response) return err;
    return Response.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/exhibits — create a new exhibit
export async function POST(request) {
  try {
    const user = await requireAuth();
    const { title, description } = await request.json();

    return withDb(db => {
      const exhibit = db.prepare(`
        INSERT INTO exhibits (userId, title, description)
        VALUES (?, ?, ?)
        RETURNING id, title, description, isPublic, createdAt, updatedAt
      `).get(user.id, title?.trim() || 'Untitled Exhibit', description?.trim() || '');

      return Response.json({ exhibit });
    });
  } catch (err) {
    if (err instanceof Response) return err;
    return Response.json({ error: err.message }, { status: 500 });
  }
}
