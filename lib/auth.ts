import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

import { db } from './db';
import { authAdmin } from './firebaseAdmin';
import { FIREBASE_SESSION_COOKIE } from './firebaseSession';
import { User } from './types';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const COOKIE_NAME = 'songdeck_token';

export async function hashPassword(password: string) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export function signToken(user: User) {
  return jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
}

export function setAuthCookie(token: string) {
  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
}

export function clearAuthCookie() {
  // Clear legacy cookie
  try {
    cookies().delete(COOKIE_NAME);
  } catch {}
  // Clear Firebase session cookie
  try {
    cookies().delete(FIREBASE_SESSION_COOKIE);
  } catch {}
}

export async function getCurrentUserAsync(): Promise<User | null> {
  // Prefer Firebase session
  const fb = cookies().get(FIREBASE_SESSION_COOKIE)?.value;
  if (fb && authAdmin) {
    try {
      const decoded = await authAdmin.verifySessionCookie(fb, true);
      const uid = decoded.sub || decoded.uid;
      const email = (decoded as any).email as string | undefined;
      if (!uid || !email) return null;
      // Find or create local user mirror keyed by uid
      let user = db.getUserById(uid) || (email ? db.getUserByEmail(email) : undefined);
      if (!user) {
        user = {
          id: uid,
          email,
          passwordHash: 'firebase',
          createdAt: new Date().toISOString(),
        } as User;
        db.createUser(user);
      } else if (user.id !== uid) {
        // Migrate to use uid as id if needed, updating all cross-references
        db.migrateUserId(user.id, uid);
        user = db.getUserById(uid) || user;
      }
      return user;
    } catch (e) {
      // fall through to legacy cookie
    }
  }
  // Legacy JWT cookie (for backward compatibility during migration)
  const legacy = cookies().get(COOKIE_NAME)?.value;
  if (!legacy) return null;
  try {
    const payload = jwt.verify(legacy, JWT_SECRET) as { sub: string };
    const user = db.getUserById(payload.sub);
    return user ?? null;
  } catch (e) {
    return null;
  }
}

// Temporary shim until all callers move to async
export function getCurrentUser(): User | null {
  // Using deopt: synchronous wrapper calling deasync is not ideal; instead, best-effort legacy cookie
  const legacy = cookies().get(COOKIE_NAME)?.value;
  if (!legacy) return null;
  try {
    const payload = jwt.verify(legacy, JWT_SECRET) as { sub: string };
    const user = db.getUserById(payload.sub);
    return user ?? null;
  } catch (e) {
    return null;
  }
}
