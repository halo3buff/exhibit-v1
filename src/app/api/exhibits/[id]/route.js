// src/app/api/exhibits/[id]/route.js
import Database from 'better-sqlite3';
import path from 'path';
import { requireAuth } from '@/lib/auth';

const DB_PATH = path.join(process.cwd(), 'artworks.db');

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const user = await requireAuth();
    const db = new Database(DB_PATH, { readonly: true });

    const exhibit = db.prepare(`
      SELECT id, userId, title, description, isPublic, createdAt, updatedAt
      FROM exhibits WHERE id = ?
    `).get(id);
    if (!exhibit) { db.close(); return Response.json({ error: 'Not found' }, { status: 404 }); }
    if (exhibit.userId !== user.id && !exhibit.isPublic) {
      db.close(); return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // wallTransform MUST be in this SELECT or positions are lost on reload
    const items = db.prepare(`
      SELECT
        ei.id, ei.artworkId, ei.note, ei.position, ei.addedAt,
        ei.wallTransform,
        a.title, a.author, a.year, a.imageUrl, a.source,
        a.mainCategory as type, a.subCategory, a.medium, a.link
      FROM exhibit_items ei
      JOIN artworks a ON a.id = ei.artworkId
      WHERE ei.exhibitId = ?
      ORDER BY ei.position ASC, ei.addedAt ASC
    `).all(id);

    db.close();
    return Response.json({ exhibit, items });
  } catch (err) {
    if (err instanceof Response) return err;
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const user = await requireAuth();
    const body = await request.json();

    const db = new Database(DB_PATH);
    db.pragma('foreign_keys = ON');

    const exhibit = db.prepare(`SELECT id, userId FROM exhibits WHERE id = ?`).get(id);
    if (!exhibit) { db.close(); return Response.json({ error: 'Not found' }, { status: 404 }); }
    if (exhibit.userId !== user.id) { db.close(); return Response.json({ error: 'Forbidden' }, { status: 403 }); }

    const fields = [];
    const values = [];
    if (body.title       !== undefined) { fields.push('title = ?');       values.push(body.title.trim()); }
    if (body.description !== undefined) { fields.push('description = ?'); values.push(body.description.trim()); }
    if (body.isPublic    !== undefined) { fields.push('isPublic = ?');    values.push(body.isPublic ? 1 : 0); }
    if (fields.length === 0) { db.close(); return Response.json({ error: 'Nothing to update' }, { status: 400 }); }

    fields.push(`updatedAt = datetime('now')`);
    values.push(id);
    db.prepare(`UPDATE exhibits SET ${fields.join(', ')} WHERE id = ?`).run(...values);

    const updated = db.prepare(`
      SELECT id, userId, title, description, isPublic, createdAt, updatedAt
      FROM exhibits WHERE id = ?
    `).get(id);
    db.close();
    return Response.json({ exhibit: updated });
  } catch (err) {
    if (err instanceof Response) return err;
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    const user = await requireAuth();
    const db = new Database(DB_PATH);
    db.pragma('foreign_keys = ON');

    const exhibit = db.prepare(`SELECT id, userId FROM exhibits WHERE id = ?`).get(id);
    if (!exhibit) { db.close(); return Response.json({ error: 'Not found' }, { status: 404 }); }
    if (exhibit.userId !== user.id) { db.close(); return Response.json({ error: 'Forbidden' }, { status: 403 }); }

    db.prepare(`DELETE FROM exhibits WHERE id = ?`).run(id);
    db.close();
    return Response.json({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    return Response.json({ error: err.message }, { status: 500 });
  }
}