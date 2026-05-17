// src/app/api/auth/login/route.js
import bcrypt from 'bcryptjs';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import { createSession } from '@/lib/auth';
import { withDb } from '@/lib/db';
import { LoginSchema, parseBody } from '@/lib/schemas';

// 10 attempts per IP per 15 minutes
const rateLimiter = new RateLimiterMemory({
  points:   10,
  duration: 60 * 15,
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
      { error: 'Too many login attempts. Please wait 15 minutes.' },
      { status: 429, headers: { 'Retry-After': '900' } }
    );
  }

  try {
    const { email, password } = parseBody(LoginSchema, await request.json());

    // Fetch user (DB closed before async bcrypt)
    const user = withDb(db =>
      db.prepare('SELECT id, email, password, displayName FROM users WHERE email = ?')
        .get(email.toLowerCase().trim()),
      { readonly: true }
    );

    if (!user) {
      return Response.json({ error: 'Invalid email or password.' }, { status: 401 });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return Response.json({ error: 'Invalid email or password.' }, { status: 401 });
    }

    await createSession(user.id);

    return Response.json({
      ok:   true,
      user: { id: user.id, email: user.email, displayName: user.displayName },
    });

  } catch (err) {
    console.error('[login]', err);
    return Response.json({ error: 'Login failed.' }, { status: 500 });
  }
}
