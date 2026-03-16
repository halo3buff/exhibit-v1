// src/app/api/exhibits/[id]/items/route.js
import Database from 'better-sqlite3';
import path from 'path';
import { requireAuth } from '@/lib/auth';

const DB_PATH = path.join(process.cwd(), 'artworks.db');

// POST /api/exhibits/[id]/items — add an artwork to an exhibit
export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const user = await requireAuth();
    const { artworkId, note } = await request.json();

    if (!artworkId) return Response.json({ error: 'artworkId required' }, { status: 400 });

    const db = new Database(DB_PATH);
    db.pragma('foreign_keys = ON');

    const exhibit = db.prepare(`SELECT id, userId FROM exhibits WHERE id = ?`).get(id);
    if (!exhibit) { db.close(); return Response.json({ error: 'Not found' }, { status: 404 }); }
    if (exhibit.userId !== user.id) { db.close(); return Response.json({ error: 'Forbidden' }, { status: 403 }); }

    // Check artwork exists
    const artwork = db.prepare(`SELECT id FROM artworks WHERE id = ?`).get(artworkId);
    if (!artwork) { db.close(); return Response.json({ error: 'Artwork not found' }, { status: 404 }); }

    // Get next position
    const maxPos = db.prepare(`SELECT MAX(position) as m FROM exhibit_items WHERE exhibitId = ?`).get(id);
    const position = (maxPos?.m ?? -1) + 1;

    // Upsert — if already in exhibit, just update the note
    const item = db.prepare(`
      INSERT INTO exhibit_items (exhibitId, artworkId, note, position)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(exhibitId, artworkId) DO UPDATE SET note = excluded.note
      RETURNING id, exhibitId, artworkId, note, position, addedAt
    `).get(id, artworkId, note?.trim() || '', position);

    // Update exhibit's updatedAt
    db.prepare(`UPDATE exhibits SET updatedAt = datetime('now') WHERE id = ?`).run(id);

    db.close();
    return Response.json({ item });
  } catch (err) {
    if (err instanceof Response) return err;
    return Response.json({ error: err.message }, { status: 500 });
  }
}