import crypto from 'crypto';

import { NextResponse } from 'next/server';

import { db } from '@/lib/db';

// TODO: Replace with real email sending logic
async function sendResetEmail(email: string, token: string) {
  // For now, just log the reset link
  console.log(`Password reset for ${email}: http://localhost:3000/reset/confirm?token=${token}`);
}

export async function POST(request: Request) {
  const { email } = await request.json();
  if (!email) return NextResponse.json({ error: 'missing_email' }, { status: 400 });
  const user = db.getUserByEmail(email);
  if (!user) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + 1000 * 60 * 30; // 30 min expiry
  db.setUserPasswordReset(user.id, token, expiresAt);
  await sendResetEmail(email, token);
  return NextResponse.json({ ok: true });
}
