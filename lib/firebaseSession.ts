import { cookies } from 'next/headers';

import { authAdmin } from './firebaseAdmin';

export const FIREBASE_SESSION_COOKIE = 'firebase_session';
const SESSION_EXPIRES_DAYS = 7;

export async function createServerSessionCookie(idToken: string) {
  if (!authAdmin) throw new Error('Firebase admin not initialized');
  const expiresIn = SESSION_EXPIRES_DAYS * 24 * 60 * 60 * 1000;
  const sessionCookie = await authAdmin.createSessionCookie(idToken, { expiresIn });
  // Set cookie (httpOnly) for server usage
  cookies().set(FIREBASE_SESSION_COOKIE, sessionCookie, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: expiresIn / 1000,
  });
  return sessionCookie;
}

export function clearServerSessionCookie() {
  cookies().delete(FIREBASE_SESSION_COOKIE);
}
