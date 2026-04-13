// src/app/api/exhibits/[id]/items/route.js
import { requireAuth } from '@/lib/auth';
import { withDb, requireExhibitOwner, touchExhibit } from '@/lib/db';

// POST /api/exhibits/[id]/items — add an artwork to an exhibit
export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const user = await requireAuth();
    const { artworkId, note } = await request.json();

    if (!artworkId) return Response.json({ error: 'artworkId required' }, { status: 400 });

    return withDb(db => {
      requireExhibitOwner(db, id, user.id);

      const artwork = db.prepare('SELECT id FROM artworks WHERE id = ?').get(artworkId);
      if (!artwork) throw Response.json({ error: 'Artwork not found' }, { status: 404 });

      const maxPos = db.prepare('SELECT MAX(position) as m FROM exhibit_items WHERE exhibitId = ?').get(id);
      const position = (maxPos?.m ?? -1) + 1;

      // Upsert — if already in exhibit, just update the note
      const item = db.prepare(`
        INSERT INTO exhibit_items (exhibitId, artworkId, note, position)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(exhibitId, artworkId) DO UPDATE SET note = excluded.note
        RETURNING id, exhibitId, artworkId, note, position, addedAt
      `).get(id, artworkId, note?.trim() || '', position);

      touchExhibit(db, id);
      return Response.json({ item });
    });
  } catch (err) {
    if (err instanceof Response) return err;
    return Response.json({ error: err.message }, { status: 500 });
  }
}
