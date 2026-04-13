// src/app/api/exhibits/[id]/items/[itemId]/route.js
import { requireAuth } from '@/lib/auth';
import { withDb, requireExhibitOwner, touchExhibit } from '@/lib/db';

// PATCH — update note and/or wallTransform for an item
export async function PATCH(request, { params }) {
  try {
    const { id, itemId, items } = await params;
    const resolvedItemId = itemId || items; // support both folder naming conventions
    const user = await requireAuth();
    const body = await request.json();

    return withDb(db => {
      requireExhibitOwner(db, id, user.id);

      const fields = [];
      const values = [];
      if (body.note          !== undefined) { fields.push('note = ?');          values.push(body.note?.trim() || ''); }
      if (body.wallTransform !== undefined) { fields.push('wallTransform = ?'); values.push(body.wallTransform); }

      if (fields.length > 0) {
        values.push(resolvedItemId, id);
        db.prepare(`UPDATE exhibit_items SET ${fields.join(', ')} WHERE id = ? AND exhibitId = ?`).run(...values);
      }

      touchExhibit(db, id);
      return Response.json({ ok: true });
    });
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

    return withDb(db => {
      requireExhibitOwner(db, id, user.id);
      db.prepare('DELETE FROM exhibit_items WHERE id = ? AND exhibitId = ?').run(resolvedItemId, id);
      touchExhibit(db, id);
      return Response.json({ ok: true });
    });
  } catch (err) {
    if (err instanceof Response) return err;
    return Response.json({ error: err.message }, { status: 500 });
  }
}
