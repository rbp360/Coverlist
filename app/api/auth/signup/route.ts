import { NextResponse } from 'next/server';
import { v4 as uuid } from 'uuid';

import { hashPassword, setAuthCookie, signToken } from '@/lib/auth';
import { db } from '@/lib/db';
import { signupSchema } from '@/lib/schemas';

export async function POST(request: Request) {
  const json = await request.json();
  const parsed = signupSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  const { email, password } = parsed.data;
  const existing = db.getUserByEmail(email);
  if (existing) return NextResponse.json({ error: 'Email already in use' }, { status: 409 });
  const passwordHash = await hashPassword(password);
  const user = { id: uuid(), email, passwordHash, createdAt: new Date().toISOString() };
  db.createUser(user);
  const token = signToken(user);
  setAuthCookie(token);
  return NextResponse.json({ ok: true });
}
