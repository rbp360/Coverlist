import { NextResponse } from 'next/server';

import { clearAuthCookie } from '@/lib/auth';
import { FIREBASE_SESSION_COOKIE, clearServerSessionCookie } from '@/lib/firebaseSession';

export async function POST() {
  // Clear cookies using Next.js cookies API
  try {
    clearAuthCookie();
  } catch {}
  try {
    clearServerSessionCookie();
  } catch {}
  // Also ensure deletion headers are present on the response for reliability
  const res = NextResponse.json({ ok: true });
  res.cookies.set('songdeck_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  res.cookies.set(FIREBASE_SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return res;
}
