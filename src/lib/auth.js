// src/lib/auth.js
// Session-based auth utilities — no external auth library needed.
// Uses httpOnly cookies + sessions table in artworks.db.

import Database from 'better-sqlite3';
import path from 'path';
import { cookies } from 'next/headers';

const DB_PATH = path.join(process.cwd(), 'artworks.db');
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
  const db = getDb();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000)
    .toISOString();

  const sessionId = db
    .prepare(`INSERT INTO sessions (userId, expiresAt) VALUES (?, ?) RETURNING id`)
    .get(userId, expiresAt).id;

  db.close();

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: new Date(expiresAt),
    path: '/',
  });

  return sessionId;
}

// ── Get the current user from the session cookie ──────────────────
// Returns user object or null
export async function getSession() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;
  if (!sessionId) return null;

  const db = getDb();
  const row = db.prepare(`
    SELECT u.id, u.email, u.displayName, u.createdAt, s.expiresAt
    FROM sessions s
    JOIN users u ON u.id = s.userId
    WHERE s.id = ?
      AND s.expiresAt > datetime('now')
  `).get(sessionId);
  db.close();

  return row || null;
}

// ── Delete the session (logout) ───────────────────────────────────
export async function destroySession() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;

  if (sessionId) {
    const db = getDb();
    db.prepare(`DELETE FROM sessions WHERE id = ?`).run(sessionId);
    db.close();
  }

  cookieStore.delete(SESSION_COOKIE);
}

// ── Require auth — returns user or throws 401 response ───────────
export async function requireAuth() {
  const user = await getSession();
  if (!user) {
    throw new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return user;
}