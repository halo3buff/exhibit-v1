// src/app/api/auth/register/route.js
import bcrypt from 'bcryptjs';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import { createSession } from '@/lib/auth';
import { withDb } from '@/lib/db';

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

    const normalizedEmail = email.toLowerCase().trim();
    const name = displayName?.trim() || email.split('@')[0];

    // Check for existing user (DB closed before async bcrypt)
    const existing = withDb(db =>
      db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail),
      { readonly: true }
    );
    if (existing) {
      return Response.json({ error: 'An account with this email already exists.' }, { status: 409 });
    }

    // Hash password (no DB connection held during this async operation)
    const hash = await bcrypt.hash(password, 12);

    // Create user
    const userId = withDb(db =>
      db.prepare('INSERT INTO users (email, password, displayName) VALUES (?, ?, ?) RETURNING id')
        .get(normalizedEmail, hash, name).id
    );

    await createSession(userId);

    return Response.json({ ok: true, user: { id: userId, email: normalizedEmail, displayName: name } });

  } catch (err) {
    console.error('[register]', err);
    return Response.json({ error: 'Registration failed.' }, { status: 500 });
  }
}
