// src/app/api/exhibits/[id]/edges/route.js
import { requireAuth } from '@/lib/auth';
import { withDb, requireExhibitOwner, requireExhibitAccess } from '@/lib/db';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const user = await requireAuth();

    return withDb(db => {
      requireExhibitAccess(db, id, user.id);
      const edges = db.prepare('SELECT * FROM exhibit_edges WHERE exhibitId = ?').all(id);
      return Response.json({ edges });
    }, { readonly: true });
  } catch (err) {
    if (err instanceof Response) return err;
    return Response.json({ error: err.message }, { status: 500 });
  }
}

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

    // Normalise order so (A→B) and (B→A) are the same edge
    const [a, b] = [fromItemId, toItemId].sort();

    return withDb(db => {
      requireExhibitOwner(db, id, user.id);

      const edge = db.prepare(`
        INSERT INTO exhibit_edges (exhibitId, fromItemId, toItemId)
        VALUES (?, ?, ?)
        ON CONFLICT(exhibitId, fromItemId, toItemId) DO NOTHING
        RETURNING *
      `).get(id, a, b);

      // ON CONFLICT fired — fetch the existing edge
      if (!edge) {
        const existing = db.prepare(
          'SELECT * FROM exhibit_edges WHERE exhibitId = ? AND fromItemId = ? AND toItemId = ?'
        ).get(id, a, b);
        return Response.json({ edge: existing });
      }

      return Response.json({ edge });
    });
  } catch (err) {
    if (err instanceof Response) return err;
    return Response.json({ error: err.message }, { status: 500 });
  }
}
