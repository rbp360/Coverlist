import { NextResponse } from 'next/server';

import { hashPassword, setAuthCookie, signToken } from '@/lib/auth';
import { db } from '@/lib/db';

// Legacy/local signup endpoint used when Firebase is not configured.
// Accepts { email, password } and creates a local user in the JSON DB.
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = (body?.email || '').toString().trim().toLowerCase();
    const password = (body?.password || '').toString();
    if (!email || !password || password.length < 6) {
      return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
    }
    const existing = db.getUserByEmail(email);
    if (existing) return NextResponse.json({ error: 'email_in_use' }, { status: 400 });
    const id = `u_${Math.random().toString(36).slice(2)}${Date.now()}`;
    const user = {
      id,
      email,
      passwordHash: await hashPassword(password),
      createdAt: new Date().toISOString(),
    } as any;
    db.createUser(user);
    const token = signToken(user);
    setAuthCookie(token);
    const res = NextResponse.json({ ok: true });
    // Also set cookie explicitly on the response for reliability in route handlers
    res.cookies.set('songdeck_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });
    return res;
  } catch (e) {
    return NextResponse.json({ error: 'signup_error' }, { status: 400 });
  }
}
