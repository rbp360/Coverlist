import { NextResponse } from 'next/server';

import { verifyPassword } from '@/lib/auth';
import { db } from '@/lib/db';

// Usage: /api/auth/debug-user?email=foo@bar.com&password=optional
export async function GET(request: Request) {
  const url = new URL(request.url);
  const email = (url.searchParams.get('email') || '').toLowerCase().trim();
  const password = url.searchParams.get('password') || '';
  if (!email) return NextResponse.json({ error: 'missing_email' }, { status: 400 });
  const user = db.getUserByEmail(email);
  if (!user) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  let passwordValid: boolean | null = null;
  if (password && user.passwordHash) {
    try {
      passwordValid = await verifyPassword(password, user.passwordHash);
    } catch {}
  }
  return NextResponse.json({
    id: user.id,
    email: user.email,
    passwordHash: user.passwordHash,
    passwordValid,
    createdAt: user.createdAt,
    avatarUrl: user.avatarUrl || null,
    name: user.name || null,
    raw: user,
  });
}
