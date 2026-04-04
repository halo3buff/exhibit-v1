// src/app/api/auth/register/route.js
import Database  from 'better-sqlite3';
import bcrypt    from 'bcryptjs';
import path      from 'path';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import { createSession } from '@/lib/auth';

const DB_PATH = path.join(process.cwd(), 'artworks.db');

// 5 registrations per IP per hour
const rateLimiter = new RateLimiterMemory({
  points:   5,
  duration: 60 * 60,
});

export async function POST(request) {
  // ── Rate limit by IP ──────────────────────────────────────────
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
          || request.headers.get('x-real-ip')
          || 'unknown';
  try {
    await rateLimiter.consume(ip);
  } catch {
    return Response.json(
      { error: 'Too many registration attempts. Please try again later.' },
      { status: 429, headers: { 'Retry-After': '3600' } }
    );
  }

  try {
    const { email, password, displayName } = await request.json();

    if (!email || !password) {
      return Response.json({ error: 'Email and password are required.' }, { status: 400 });
    }
    if (password.length < 8) {
      return Response.json({ error: 'Password must be at least 8 characters.' }, { status: 400 });
    }

    const db = new Database(DB_PATH);
    db.pragma('foreign_keys = ON');

    const existing = db.prepare(`SELECT id FROM users WHERE email = ?`).get(email.toLowerCase().trim());
    if (existing) {
      db.close();
      return Response.json({ error: 'An account with this email already exists.' }, { status: 409 });
    }

    const hash = await bcrypt.hash(password, 12);
    const name = displayName?.trim() || email.split('@')[0];

    const userId = db.prepare(`
      INSERT INTO users (email, password, displayName)
      VALUES (?, ?, ?)
      RETURNING id
    `).get(email.toLowerCase().trim(), hash, name).id;

    db.close();

    await createSession(userId);

    return Response.json({ ok: true, user: { id: userId, email, displayName: name } });

  } catch (err) {
    console.error('[register]', err);
    return Response.json({ error: 'Registration failed.' }, { status: 500 })
  }
}