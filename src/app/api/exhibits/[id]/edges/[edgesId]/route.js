// src/app/api/exhibits/[id]/edges/[edgesId]/route.js
import { requireAuth } from '@/lib/auth';
import { withDb, requireExhibitOwner } from '@/lib/db';

export async function DELETE(request, { params }) {
  try {
    const { id, edgesId } = await params;
    const user = await requireAuth();

    return withDb(db => {
      requireExhibitOwner(db, id, user.id);
      db.prepare('DELETE FROM exhibit_edges WHERE id = ? AND exhibitId = ?').run(edgesId, id);
      return Response.json({ ok: true });
    });
  } catch (err) {
    if (err instanceof Response) return err;
    return Response.json({ error: err.message }, { status: 500 });
  }
}
