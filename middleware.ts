import { NextRequest, NextResponse } from 'next/server';
const LEGACY_COOKIE_NAME = 'songdeck_token';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const protectedPaths = ['/profile', '/projects', '/setlists'];
  const isProtected = protectedPaths.some((p) => pathname === p || pathname.startsWith(p + '/'));
  if (isProtected) {
    const hasLegacy = !!req.cookies.get(LEGACY_COOKIE_NAME)?.value;
    if (!hasLegacy) {
      const url = new URL('/login', req.url);
      return NextResponse.redirect(url);
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/profile', '/projects/:path*', '/setlists/:path*'],
};
