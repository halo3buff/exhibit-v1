// src/app/api/exhibits/route.js
import Database from 'better-sqlite3';
import path from 'path';
import { requireAuth } from '@/lib/auth';

const DB_PATH = path.join(process.cwd(), 'artworks.db');

// GET /api/exhibits — list current user's exhibits
export async function GET(request) {
  try {
    const user = await requireAuth();
    const db = new Database(DB_PATH, { readonly: true });

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

    db.close();
    return Response.json({ exhibits });
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

    const db = new Database(DB_PATH);
    db.pragma('foreign_keys = ON');

    const exhibit = db.prepare(`
      INSERT INTO exhibits (userId, title, description)
      VALUES (?, ?, ?)
      RETURNING id, title, description, isPublic, createdAt, updatedAt
    `).get(user.id, title?.trim() || 'Untitled Exhibit', description?.trim() || '');

    db.close();
    return Response.json({ exhibit });
  } catch (err) {
    if (err instanceof Response) return err;
    return Response.json({ error: err.message }, { status: 500 });
  }
}