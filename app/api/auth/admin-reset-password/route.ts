import { NextResponse } from 'next/server';

import { hashPassword } from '@/lib/auth';
import { db } from '@/lib/db';

// Usage: POST /api/auth/admin-reset-password { email, newPassword }
export async function POST(request: Request) {
  const { email, newPassword } = await request.json();
  if (!email || !newPassword || newPassword.length < 6) {
    return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
  }
  const user = db.getUserByEmail(email);
  if (!user) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  user.passwordHash = await hashPassword(newPassword);
  db.updateUser(user);
  return NextResponse.json({ ok: true, email });
}
