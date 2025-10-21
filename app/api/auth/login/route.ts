import { NextResponse } from 'next/server';

import { getCurrentUser, setAuthCookie, signToken, verifyPassword } from '@/lib/auth';
import { db } from '@/lib/db';
import { loginSchema } from '@/lib/schemas';

export async function POST(request: Request) {
  // If already logged in, just return ok
  if (getCurrentUser()) return NextResponse.json({ ok: true });
  const json = await request.json();
  const parsed = loginSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  const { email, password } = parsed.data;
  const user = db.getUserByEmail(email);
  if (!user) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  const token = signToken(user);
  setAuthCookie(token);
  return NextResponse.json({ ok: true });
}
