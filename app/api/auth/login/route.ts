import { NextResponse } from 'next/server';

import { setAuthCookie, signToken, verifyPassword } from '@/lib/auth';
import { db } from '@/lib/db';

// Legacy/local login endpoint used when Firebase is not configured.
// Accepts { email, password } and validates against the JSON DB.
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = (body?.email || '').toString().trim().toLowerCase();
    const password = (body?.password || '').toString();
    if (!email || !password) return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
    const user = db.getUserByEmail(email);
    if (!user || !user.passwordHash) {
      return NextResponse.json({ error: 'invalid_credentials' }, { status: 400 });
    }
    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) return NextResponse.json({ error: 'invalid_credentials' }, { status: 400 });
    const token = signToken(user as any);
    // set via Next cookies API; no need to duplicate on response
    setAuthCookie(token);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: 'login_error' }, { status: 400 });
  }
}
