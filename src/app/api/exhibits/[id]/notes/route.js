// src/app/api/exhibits/[id]/notes/route.js
import Database from 'better-sqlite3';
import path from 'path';
import { requireAuth } from '@/lib/auth';

const DB_PATH = path.join(process.cwd(), 'artworks.db');

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const user = await requireAuth();
    const db = new Database(DB_PATH, { readonly: true });

    const exhibit = db.prepare(`SELECT userId, isPublic FROM exhibits WHERE id = ?`).get(id);
    if (!exhibit) { db.close(); return Response.json({ error: 'Not found' }, { status: 404 }); }
    if (exhibit.userId !== user.id && !exhibit.isPublic) {
      db.close(); return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const notes = db.prepare(`SELECT * FROM exhibit_notes WHERE exhibitId = ? ORDER BY createdAt ASC`).all(id);
    db.close();
    return Response.json({ notes });
  } catch (err) {
    if (err instanceof Response) return err;
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const user = await requireAuth();
    const { x = 100, y = 100, content = '', fontSize = 13, bold = 0, italic = 0 } = await request.json();

    const db = new Database(DB_PATH);
    db.pragma('foreign_keys = ON');

    const exhibit = db.prepare(`SELECT userId FROM exhibits WHERE id = ?`).get(id);
    if (!exhibit || exhibit.userId !== user.id) {
      db.close(); return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const note = db.prepare(`
      INSERT INTO exhibit_notes (exhibitId, x, y, content, fontSize, bold, italic)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      RETURNING *
    `).get(id, x, y, content, fontSize, bold ? 1 : 0, italic ? 1 : 0);

    db.close();
    return Response.json({ note });
  } catch (err) {
    if (err instanceof Response) return err;
    return Response.json({ error: err.message }, { status: 500 });
  }
}