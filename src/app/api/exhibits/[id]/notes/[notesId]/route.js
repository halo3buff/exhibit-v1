// src/app/api/exhibits/[id]/notes/[noteId]/route.js
import Database from 'better-sqlite3';
import path from 'path';
import { requireAuth } from '@/lib/auth';

const DB_PATH = path.join(process.cwd(), 'artworks.db');

export async function PATCH(request, { params }) {
  try {
    const { id, noteId } = await params;
    const user = await requireAuth();
    const body = await request.json();

    const db = new Database(DB_PATH);
    db.pragma('foreign_keys = ON');

    const exhibit = db.prepare(`SELECT userId FROM exhibits WHERE id = ?`).get(id);
    if (!exhibit || exhibit.userId !== user.id) {
      db.close(); return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const fields = [];
    const values = [];

    if (body.x        !== undefined) { fields.push('x = ?');        values.push(body.x); }
    if (body.y        !== undefined) { fields.push('y = ?');        values.push(body.y); }
    if (body.content  !== undefined) { fields.push('content = ?');  values.push(body.content); }
    if (body.fontSize !== undefined) { fields.push('fontSize = ?'); values.push(Math.max(8, Math.min(72, body.fontSize))); }
    if (body.bold     !== undefined) { fields.push('bold = ?');     values.push(body.bold ? 1 : 0); }
    if (body.italic   !== undefined) { fields.push('italic = ?');   values.push(body.italic ? 1 : 0); }

    if (fields.length > 0) {
      fields.push(`updatedAt = datetime('now')`);
      values.push(noteId, id);
      db.prepare(`UPDATE exhibit_notes SET ${fields.join(', ')} WHERE id = ? AND exhibitId = ?`).run(...values);
    }

    db.close();
    return Response.json({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id, noteId } = await params;
    const user = await requireAuth();

    const db = new Database(DB_PATH);
    db.pragma('foreign_keys = ON');

    const exhibit = db.prepare(`SELECT userId FROM exhibits WHERE id = ?`).get(id);
    if (!exhibit || exhibit.userId !== user.id) {
      db.close(); return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    db.prepare(`DELETE FROM exhibit_notes WHERE id = ? AND exhibitId = ?`).run(noteId, id);
    db.close();
    return Response.json({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    return Response.json({ error: err.message }, { status: 500 });
  }
}