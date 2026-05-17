// src/app/api/exhibits/[id]/notes/route.js
import { requireAuth } from '@/lib/auth';
import { withDb, requireExhibitOwner, requireExhibitAccess, touchExhibit } from '@/lib/db';
import { NoteCreateSchema, parseBody } from '@/lib/schemas';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const user = await requireAuth();

    return withDb(db => {
      requireExhibitAccess(db, id, user.id);
      const notes = db.prepare('SELECT * FROM exhibit_notes WHERE exhibitId = ? ORDER BY createdAt ASC').all(id);
      return Response.json({ notes });
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
    const { x, y, content, fontSize, bold, italic } = parseBody(NoteCreateSchema, await request.json());

    return withDb(db => {
      requireExhibitOwner(db, id, user.id);
      const note = db.prepare(`
        INSERT INTO exhibit_notes (exhibitId, x, y, content, fontSize, bold, italic)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        RETURNING *
      `).get(id, x, y, content, fontSize, bold ? 1 : 0, italic ? 1 : 0);
      touchExhibit(db, id);
      return Response.json({ note });
    });
  } catch (err) {
    if (err instanceof Response) return err;
    return Response.json({ error: err.message }, { status: 500 });
  }
}
