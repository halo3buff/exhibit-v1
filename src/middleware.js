// src/middleware.js
// Edge middleware — runs before every matched request.
//
// Responsibility: fast early rejection of unauthenticated requests to protected
// API routes. Checking cookie *existence* here (no DB — Edge runtime can't use
// better-sqlite3). Actual session validity is confirmed in requireAuth() via the
// getReadDb() singleton, which now shares the connection with the route handler.
//
// Protected pattern: /api/exhibits/** (all exhibit mutation + read routes)
// Public patterns:   /api/auth/**, /api/search/**, /api/img/**, everything else

import { NextResponse } from 'next/server';

const SESSION_COOKIE = 'exhibit_session';

export function middleware(request) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;

  if (!token) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/exhibits/:path*'],
};
