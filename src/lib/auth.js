// src/lib/auth.js
// Session-based auth utilities — no external auth library needed.
// Uses httpOnly cookies + sessions table in artworks.db.
// Session tokens are cryptographically random hex strings (not sequential IDs).

import Database from 'better-sqlite3';
import crypto   from 'crypto';
import path     from 'path';
import { cookies } from 'next/headers';

const DB_PATH        = path.join(process.cwd(), 'artworks.db');
const SESSION_COOKIE = 'exhibit_session';
const SESSION_DAYS   = 30;

function getDb() {
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  return db;
}

// ── Create a new session and set the cookie ───────────────────────
export async function createSession(userId) {
  const db        = getDb();
  const token     = crypto.randomBytes(32).toString('hex'); // 64-char random hex
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString();

  db.prepare(`INSERT INTO sessions (id, userId, expiresAt) VALUES (?, ?, ?)`)
    .run(token, userId, expiresAt);
  db.close();

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
// Returns user object or null
export async function getSession() {
  const cookieStore = await cookies();
  const token       = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const db  = getDb();
  const row = db.prepare(`
    SELECT u.id, u.email, u.displayName, u.createdAt, s.expiresAt
    FROM sessions s
    JOIN users u ON u.id = s.userId
    WHERE s.id = ?
      AND s.expiresAt > datetime('now')
  `).get(token);
  db.close();

  return row || null;
}

// ── Delete the session (logout) ───────────────────────────────────
export async function destroySession() {
  const cookieStore = await cookies();
  const token       = cookieStore.get(SESSION_COOKIE)?.value;

  if (token) {
    const db = getDb();
    db.prepare(`DELETE FROM sessions WHERE id = ?`).run(token);
    db.close();
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
  const db = getDb();
  const { changes } = db.prepare(`DELETE FROM sessions WHERE expiresAt <= datetime('now')`).run();
  db.close();
  return changes;
}