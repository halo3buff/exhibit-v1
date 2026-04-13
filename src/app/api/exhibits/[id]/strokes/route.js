// src/app/api/exhibits/[id]/strokes/route.js
import { requireAuth } from '@/lib/auth';
import { withDb, requireExhibitOwner, requireExhibitAccess, touchExhibit } from '@/lib/db';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const user = await requireAuth();

    return withDb(db => {
      requireExhibitAccess(db, id, user.id);
      const strokes = db.prepare('SELECT * FROM exhibit_strokes WHERE exhibitId = ? ORDER BY createdAt ASC').all(id);
      return Response.json({ strokes });
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
    const { pathData, color, width } = await request.json();

    if (!pathData) return Response.json({ error: 'pathData required' }, { status: 400 });

    return withDb(db => {
      requireExhibitOwner(db, id, user.id);
      const stroke = db.prepare(`
        INSERT INTO exhibit_strokes (exhibitId, pathData, color, width)
        VALUES (?, ?, ?, ?)
        RETURNING *
      `).get(id, pathData, color ?? 'rgba(0,0,0,0.55)', width ?? 1.5);
      touchExhibit(db, id);
      return Response.json({ stroke });
    });
  } catch (err) {
    if (err instanceof Response) return err;
    return Response.json({ error: err.message }, { status: 500 });
  }
}
