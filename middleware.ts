import { NextRequest, NextResponse } from 'next/server';
const LEGACY_COOKIE_NAME = 'songdeck_token';
// Duplicate of FIREBASE_SESSION_COOKIE to avoid importing server-only code in Edge middleware
const FIREBASE_SESSION_COOKIE = 'firebase_session';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const protectedPaths = ['/profile', '/projects', '/setlists'];
  const isProtected = protectedPaths.some((p) => pathname === p || pathname.startsWith(p + '/'));
  if (isProtected) {
    const hasLegacy = !!req.cookies.get(LEGACY_COOKIE_NAME)?.value;
    const hasFirebase = !!req.cookies.get(FIREBASE_SESSION_COOKIE)?.value;
    if (!(hasLegacy || hasFirebase)) {
      const url = new URL('/login', req.url);
      return NextResponse.redirect(url);
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/profile', '/projects/:path*', '/setlists/:path*'],
};
