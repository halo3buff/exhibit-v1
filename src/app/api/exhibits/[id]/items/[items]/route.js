// src/app/api/exhibits/[id]/items/[itemId]/route.js
import Database from 'better-sqlite3';
import path from 'path';
import { requireAuth } from '@/lib/auth';

const DB_PATH = path.join(process.cwd(), 'artworks.db');

// PATCH /api/exhibits/[id]/items/[itemId] — update note
export async function PATCH(request, { params }) {
  try {
    const { id, itemId } = await params;
    const user = await requireAuth();
    const { note } = await request.json();

    const db = new Database(DB_PATH);
    db.pragma('foreign_keys = ON');

    const exhibit = db.prepare(`SELECT userId FROM exhibits WHERE id = ?`).get(id);
    if (!exhibit || exhibit.userId !== user.id) {
      db.close(); return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    db.prepare(`UPDATE exhibit_items SET note = ? WHERE id = ? AND exhibitId = ?`)
      .run(note?.trim() || '', itemId, id);
    db.prepare(`UPDATE exhibits SET updatedAt = datetime('now') WHERE id = ?`).run(id);

    db.close();
    return Response.json({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    return Response.json({ error: err.message }, { status: 500 });
  }
}

// DELETE /api/exhibits/[id]/items/[itemId]
export async function DELETE(request, { params }) {
  try {
    const { id, itemId } = await params;
    const user = await requireAuth();

    const db = new Database(DB_PATH);
    db.pragma('foreign_keys = ON');

    const exhibit = db.prepare(`SELECT userId FROM exhibits WHERE id = ?`).get(id);
    if (!exhibit || exhibit.userId !== user.id) {
      db.close(); return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    db.prepare(`DELETE FROM exhibit_items WHERE id = ? AND exhibitId = ?`).run(itemId, id);
    db.prepare(`UPDATE exhibits SET updatedAt = datetime('now') WHERE id = ?`).run(id);

    db.close();
    return Response.json({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    return Response.json({ error: err.message }, { status: 500 });
  }
}