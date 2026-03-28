// src/app/api/exhibits/[id]/edges/route.js
import Database from 'better-sqlite3';
import path from 'path';
import { requireAuth } from '@/lib/auth';

const DB_PATH = path.join(process.cwd(), 'artworks.db');

// GET — fetch all edges for an exhibit
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

    const edges = db.prepare(`SELECT * FROM exhibit_edges WHERE exhibitId = ?`).all(id);
    db.close();
    return Response.json({ edges });
  } catch (err) {
    if (err instanceof Response) return err;
    return Response.json({ error: err.message }, { status: 500 });
  }
}

// POST — create a new edge
export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const user = await requireAuth();
    const { fromItemId, toItemId } = await request.json();

    if (!fromItemId || !toItemId) {
      return Response.json({ error: 'fromItemId and toItemId required' }, { status: 400 });
    }
    if (fromItemId === toItemId) {
      return Response.json({ error: 'Cannot connect item to itself' }, { status: 400 });
    }

    const db = new Database(DB_PATH);
    db.pragma('foreign_keys = ON');

    const exhibit = db.prepare(`SELECT userId FROM exhibits WHERE id = ?`).get(id);
    if (!exhibit || exhibit.userId !== user.id) {
      db.close(); return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Normalise order so (A→B) and (B→A) are the same edge
    const [a, b] = [fromItemId, toItemId].sort();

    const edge = db.prepare(`
      INSERT INTO exhibit_edges (exhibitId, fromItemId, toItemId)
      VALUES (?, ?, ?)
      ON CONFLICT(exhibitId, fromItemId, toItemId) DO NOTHING
      RETURNING *
    `).get(id, a, b);

    db.close();
    // If ON CONFLICT fired, edge already exists — fetch it
    if (!edge) {
      const db2 = new Database(DB_PATH, { readonly: true });
      const existing = db2.prepare(
        `SELECT * FROM exhibit_edges WHERE exhibitId = ? AND fromItemId = ? AND toItemId = ?`
      ).get(id, a, b);
      db2.close();
      return Response.json({ edge: existing });
    }
    return Response.json({ edge });
  } catch (err) {
    if (err instanceof Response) return err;
    return Response.json({ error: err.message }, { status: 500 });
  }
}