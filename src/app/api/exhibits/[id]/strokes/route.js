// src/app/api/exhibits/[id]/strokes/route.js
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

    const strokes = db.prepare(`SELECT * FROM exhibit_strokes WHERE exhibitId = ? ORDER BY createdAt ASC`).all(id);
    db.close();
    return Response.json({ strokes });
  } catch (err) {
    if (err instanceof Response) return err;
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const user = await requireAuth();
    const { pathData, color, width } = await request.json();

    if (!pathData) return Response.json({ error: 'pathData required' }, { status: 400 });

    const db = new Database(DB_PATH);
    db.pragma('foreign_keys = ON');

    const exhibit = db.prepare(`SELECT userId FROM exhibits WHERE id = ?`).get(id);
    if (!exhibit || exhibit.userId !== user.id) {
      db.close(); return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const stroke = db.prepare(`
      INSERT INTO exhibit_strokes (exhibitId, pathData, color, width)
      VALUES (?, ?, ?, ?)
      RETURNING *
    `).get(id, pathData, color ?? 'rgba(0,0,0,0.55)', width ?? 1.5);

    db.close();
    return Response.json({ stroke });
  } catch (err) {
    if (err instanceof Response) return err;
    return Response.json({ error: err.message }, { status: 500 });
  }
}