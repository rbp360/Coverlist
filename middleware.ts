import { NextRequest, NextResponse } from 'next/server';

const COOKIE_NAME = 'songdeck_token';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const protectedPaths = ['/entries', '/profile', '/projects', '/setlists'];
  const isProtected = protectedPaths.some((p) => pathname === p || pathname.startsWith(p + '/'));
  if (isProtected) {
    const token = req.cookies.get(COOKIE_NAME)?.value;
    if (!token) {
      const url = new URL('/login', req.url);
      return NextResponse.redirect(url);
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/entries/:path*', '/profile', '/projects/:path*', '/setlists/:path*'],
};
