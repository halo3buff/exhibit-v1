// src/app/api/exhibits/[id]/strokes/[strokeId]/route.js
import { requireAuth } from '@/lib/auth';
import { withDb, requireExhibitOwner } from '@/lib/db';

export async function DELETE(request, { params }) {
  try {
    const { id, strokeId } = await params;
    const user = await requireAuth();

    return withDb(db => {
      requireExhibitOwner(db, id, user.id);
      db.prepare('DELETE FROM exhibit_strokes WHERE id = ? AND exhibitId = ?').run(strokeId, id);
      return Response.json({ ok: true });
    });
  } catch (err) {
    if (err instanceof Response) return err;
    return Response.json({ error: err.message }, { status: 500 });
  }
}
