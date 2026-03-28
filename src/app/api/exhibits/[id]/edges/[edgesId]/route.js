// src/app/api/exhibits/[id]/edges/[edgeId]/route.js
import Database from 'better-sqlite3';
import path from 'path';
import { requireAuth } from '@/lib/auth';

const DB_PATH = path.join(process.cwd(), 'artworks.db');

export async function DELETE(request, { params }) {
  try {
    const { id, edgeId } = await params;
    const user = await requireAuth();

    const db = new Database(DB_PATH);
    db.pragma('foreign_keys = ON');

    const exhibit = db.prepare(`SELECT userId FROM exhibits WHERE id = ?`).get(id);
    if (!exhibit || exhibit.userId !== user.id) {
      db.close(); return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    db.prepare(`DELETE FROM exhibit_edges WHERE id = ? AND exhibitId = ?`).run(edgeId, id);
    db.close();
    return Response.json({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    return Response.json({ error: err.message }, { status: 500 });
  }
}