// src/app/api/auth/me/route.js
import { getSession } from '@/lib/auth';

export async function GET() {
  const user = await getSession();
  if (!user) {
    return Response.json({ user: null }, { status: 401 });
  }
  return Response.json({
    user: {
      id:          user.id,
      email:       user.email,
      displayName: user.displayName,
      createdAt:   user.createdAt,
    },
  });
}