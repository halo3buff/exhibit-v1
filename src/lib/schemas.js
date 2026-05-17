// src/lib/schemas.js
// Zod validation schemas for all API route bodies.
// Import parseBody() + the relevant schema into each write route.

import { z } from 'zod';

// ── Exhibits ──────────────────────────────────────────────────────────────────

export const ExhibitCreateSchema = z.object({
  title:       z.string().max(200).optional(),
  description: z.string().max(2000).optional(),
});

export const ExhibitPatchSchema = z.object({
  title:       z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  isPublic:    z.boolean().optional(),
});

// ── Exhibit items ─────────────────────────────────────────────────────────────

export const ItemCreateSchema = z.object({
  artworkId: z.string().min(1),
  note:      z.string().max(2000).optional().default(''),
});

export const ItemPatchSchema = z.object({
  note:          z.string().max(2000).optional(),
  wallTransform: z.string().optional(),
});

// ── Canvas notes ──────────────────────────────────────────────────────────────

export const NoteCreateSchema = z.object({
  x:        z.number().default(100),
  y:        z.number().default(100),
  content:  z.string().max(5000).default(''),
  fontSize: z.number().min(8).max(72).default(13),
  bold:     z.union([z.boolean(), z.number()]).default(0),
  italic:   z.union([z.boolean(), z.number()]).default(0),
});

export const NotePatchSchema = z.object({
  x:        z.number().optional(),
  y:        z.number().optional(),
  content:  z.string().max(5000).optional(),
  fontSize: z.number().min(8).max(72).optional(),
  bold:     z.union([z.boolean(), z.number()]).optional(),
  italic:   z.union([z.boolean(), z.number()]).optional(),
});

// ── Strokes ───────────────────────────────────────────────────────────────────

export const StrokeCreateSchema = z.object({
  pathData: z.string().min(1),
  color:    z.string().max(100).optional().default('rgba(0,0,0,0.55)'),
  width:    z.number().min(0.1).max(50).optional().default(1.5),
});

// ── Edges ─────────────────────────────────────────────────────────────────────

export const EdgeCreateSchema = z.object({
  fromItemId: z.string().min(1),
  toItemId:   z.string().min(1),
}).refine(d => d.fromItemId !== d.toItemId, { message: 'Cannot connect item to itself' });

// ── Auth ──────────────────────────────────────────────────────────────────────

export const LoginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
});

export const RegisterSchema = z.object({
  email:       z.string().email().max(320),
  password:    z.string().min(8).max(128),
  displayName: z.string().max(100).optional(),
});

// ── Helper ────────────────────────────────────────────────────────────────────

/**
 * Parse body with a Zod schema. Throws a 400 Response on failure.
 * Call BEFORE withDb() so the DB connection is never opened for invalid input.
 */
export function parseBody(schema, body) {
  const result = schema.safeParse(body);
  if (!result.success) {
    throw Response.json(
      { error: result.error.issues[0]?.message ?? 'Invalid request body' },
      { status: 400 }
    );
  }
  return result.data;
}
