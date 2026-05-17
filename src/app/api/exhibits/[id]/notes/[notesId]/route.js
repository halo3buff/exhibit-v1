// src/app/api/exhibits/[id]/notes/[notesId]/route.js
import { requireAuth } from '@/lib/auth';
import { withDb, requireExhibitOwner, touchExhibit } from '@/lib/db';
import { NotePatchSchema, parseBody } from '@/lib/schemas';

export async function PATCH(request, { params }) {
  try {
    const { id, notesId, noteId } = await params;
    const resolvedNoteId = notesId || noteId;
    const user = await requireAuth();
    const body = parseBody(NotePatchSchema, await request.json());

    return withDb(db => {
      requireExhibitOwner(db, id, user.id);

      const fields = [];
      const values = [];
      if (body.x        !== undefined) { fields.push('x = ?');        values.push(body.x); }
      if (body.y        !== undefined) { fields.push('y = ?');        values.push(body.y); }
      if (body.content  !== undefined) { fields.push('content = ?');  values.push(body.content); }
      if (body.fontSize !== undefined) { fields.push('fontSize = ?'); values.push(body.fontSize); }
      if (body.bold     !== undefined) { fields.push('bold = ?');     values.push(body.bold ? 1 : 0); }
      if (body.italic   !== undefined) { fields.push('italic = ?');   values.push(body.italic ? 1 : 0); }

      if (fields.length > 0) {
        fields.push("updatedAt = datetime('now')");
        values.push(resolvedNoteId, id);
        db.prepare(`UPDATE exhibit_notes SET ${fields.join(', ')} WHERE id = ? AND exhibitId = ?`).run(...values);
        touchExhibit(db, id);
      }

      return Response.json({ ok: true });
    });
  } catch (err) {
    if (err instanceof Response) return err;
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id, notesId, noteId } = await params;
    const resolvedNoteId = notesId || noteId;
    const user = await requireAuth();

    return withDb(db => {
      requireExhibitOwner(db, id, user.id);
      db.prepare('DELETE FROM exhibit_notes WHERE id = ? AND exhibitId = ?').run(resolvedNoteId, id);
      touchExhibit(db, id);
      return Response.json({ ok: true });
    });
  } catch (err) {
    if (err instanceof Response) return err;
    return Response.json({ error: err.message }, { status: 500 });
  }
}
