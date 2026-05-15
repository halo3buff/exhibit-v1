// src/app/api/exhibits/[id]/route.js
import { requireAuth } from '@/lib/auth';
import { getReadDb, withDb, requireExhibitOwner, requireExhibitAccess } from '@/lib/db';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const user = await requireAuth();
    const db = getReadDb();

    requireExhibitAccess(db, id, user.id);

    // wallTransform MUST be in this SELECT or canvas positions are lost on reload
    const items = db.prepare(`
      SELECT
        ei.id, ei.artworkId, ei.note, ei.position, ei.addedAt,
        ei.wallTransform,
        a.title, a.author, a.year, a.imageUrl, a.source,
        a.mainCategory as type, a.subCategory, a.medium, a.link
      FROM exhibit_items ei
      JOIN artworks a ON a.id = ei.artworkId
      WHERE ei.exhibitId = ?
      ORDER BY ei.position ASC, ei.addedAt ASC
    `).all(id);

    // Re-fetch exhibit with full fields (requireExhibitAccess returns minimal row)
    const exhibitFull = db.prepare(`
      SELECT id, userId, title, description, isPublic, createdAt, updatedAt
      FROM exhibits WHERE id = ?
    `).get(id);

    return Response.json({ exhibit: exhibitFull, items });
  } catch (err) {
    if (err instanceof Response) return err;
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const user = await requireAuth();
    const body = await request.json();

    return withDb(db => {
      requireExhibitOwner(db, id, user.id);

      const fields = [];
      const values = [];
      if (body.title       !== undefined) { fields.push('title = ?');       values.push(body.title.trim()); }
      if (body.description !== undefined) { fields.push('description = ?'); values.push(body.description.trim()); }
      if (body.isPublic    !== undefined) { fields.push('isPublic = ?');    values.push(body.isPublic ? 1 : 0); }
      if (fields.length === 0) throw Response.json({ error: 'Nothing to update' }, { status: 400 });

      fields.push("updatedAt = datetime('now')");
      values.push(id);
      db.prepare(`UPDATE exhibits SET ${fields.join(', ')} WHERE id = ?`).run(...values);

      const updated = db.prepare(`
        SELECT id, userId, title, description, isPublic, createdAt, updatedAt
        FROM exhibits WHERE id = ?
      `).get(id);

      return Response.json({ exhibit: updated });
    });
  } catch (err) {
    if (err instanceof Response) return err;
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    const user = await requireAuth();

    return withDb(db => {
      requireExhibitOwner(db, id, user.id);
      db.prepare('DELETE FROM exhibits WHERE id = ?').run(id);
      return Response.json({ ok: true });
    });
  } catch (err) {
    if (err instanceof Response) return err;
    return Response.json({ error: err.message }, { status: 500 });
  }
}
