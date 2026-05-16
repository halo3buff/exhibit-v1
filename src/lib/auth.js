// src/lib/auth.js
// Session-based auth utilities — no external auth library needed.
// Uses httpOnly cookies + sessions table in app.db.
// Session tokens are cryptographically random hex strings (not sequential IDs).
//
// Connection strategy:
//   getSession()   → getReadDb() singleton (no extra connection alongside withDb)
//   createSession(), destroySession(), pruneExpiredSessions() → withDb() (writes)
//
// Unauthenticated requests to /api/exhibits/** are rejected early by middleware.js
// before reaching these helpers.

import crypto from 'crypto';
import { cookies } from 'next/headers';
import { getReadDb, withDb } from '@/lib/db';

const SESSION_COOKIE = 'exhibit_session';
const SESSION_DAYS   = 30;

// ── Create a new session and set the cookie ───────────────────────
export async function createSession(userId) {
  const token     = crypto.randomBytes(32).toString('hex'); // 64-char random hex
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString();

  withDb(db => {
    db.prepare(`INSERT INTO sessions (id, userId, expiresAt) VALUES (?, ?, ?)`)
      .run(token, userId, expiresAt);
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires:  new Date(expiresAt),
    path:     '/',
  });

  return token;
}

// ── Get the current user from the session cookie ──────────────────
// Uses getReadDb() singleton — no extra connection on top of any withDb() in the route.
export async function getSession() {
  const cookieStore = await cookies();
  const token       = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const db  = getReadDb();
  const row = db.prepare(`
    SELECT u.id, u.email, u.displayName, u.createdAt, s.expiresAt
    FROM sessions s
    JOIN users u ON u.id = s.userId
    WHERE s.id = ?
      AND s.expiresAt > datetime('now')
  `).get(token);

  return row || null;
}

// ── Delete the session (logout) ───────────────────────────────────
export async function destroySession() {
  const cookieStore = await cookies();
  const token       = cookieStore.get(SESSION_COOKIE)?.value;

  if (token) {
    withDb(db => {
      db.prepare(`DELETE FROM sessions WHERE id = ?`).run(token);
    });
  }

  cookieStore.delete(SESSION_COOKIE);
}

// ── Require auth — returns user or throws 401 response ───────────
export async function requireAuth() {
  const user = await getSession();
  if (!user) {
    throw new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status:  401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return user;
}

// ── Prune expired sessions (call this occasionally) ───────────────
export function pruneExpiredSessions() {
  return withDb(db => {
    const { changes } = db.prepare(`DELETE FROM sessions WHERE expiresAt <= datetime('now')`).run();
    return changes;
  });
}
