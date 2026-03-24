// src/app/api/exhibits/[id]/items/[itemId]/route.js
// NOTE: your folder is named [items] not [itemId] — rename it to [itemId]
import Database from 'better-sqlite3';
import path from 'path';
import { requireAuth } from '@/lib/auth';

const DB_PATH = path.join(process.cwd(), 'artworks.db');

// PATCH — handles both `note` and `wallTransform`
export async function PATCH(request, { params }) {
  try {
    const { id, itemId, items } = await params;
    // Support both folder naming conventions
    const resolvedItemId = itemId || items;

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

    if (body.note          !== undefined) { fields.push('note = ?');          values.push(body.note?.trim() || ''); }
    if (body.wallTransform !== undefined) { fields.push('wallTransform = ?'); values.push(body.wallTransform); }

    if (fields.length > 0) {
      values.push(resolvedItemId, id);
      db.prepare(`UPDATE exhibit_items SET ${fields.join(', ')} WHERE id = ? AND exhibitId = ?`).run(...values);
    }

    db.prepare(`UPDATE exhibits SET updatedAt = datetime('now') WHERE id = ?`).run(id);
    db.close();
    return Response.json({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id, itemId, items } = await params;
    const resolvedItemId = itemId || items;

    const user = await requireAuth();
    const db = new Database(DB_PATH);
    db.pragma('foreign_keys = ON');

    const exhibit = db.prepare(`SELECT userId FROM exhibits WHERE id = ?`).get(id);
    if (!exhibit || exhibit.userId !== user.id) {
      db.close(); return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    db.prepare(`DELETE FROM exhibit_items WHERE id = ? AND exhibitId = ?`).run(resolvedItemId, id);
    db.prepare(`UPDATE exhibits SET updatedAt = datetime('now') WHERE id = ?`).run(id);

    db.close();
    return Response.json({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    return Response.json({ error: err.message }, { status: 500 });
  }
}