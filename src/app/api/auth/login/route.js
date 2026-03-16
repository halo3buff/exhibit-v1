// src/app/api/auth/login/route.js
import Database  from 'better-sqlite3';
import bcrypt    from 'bcryptjs';
import path      from 'path';
import { createSession } from '@/lib/auth';

const DB_PATH = path.join(process.cwd(), 'artworks.db');

export async function POST(request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return Response.json({ error: 'Email and password are required.' }, { status: 400 });
    }

    const db = new Database(DB_PATH);
    const user = db.prepare(`SELECT id, email, password, displayName FROM users WHERE email = ?`)
      .get(email.toLowerCase().trim());
    db.close();

    if (!user) {
      return Response.json({ error: 'Invalid email or password.' }, { status: 401 });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return Response.json({ error: 'Invalid email or password.' }, { status: 401 });
    }

    await createSession(user.id);

    return Response.json({
      ok: true,
      user: { id: user.id, email: user.email, displayName: user.displayName },
    });

  } catch (err) {
    console.error('[login]', err);
    return Response.json({ error: 'Login failed.' }, { status: 500 });
  }
}