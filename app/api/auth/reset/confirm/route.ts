import { NextResponse } from 'next/server';

import { hashPassword, setAuthCookie, signToken } from '@/lib/auth';
import { db } from '@/lib/db';

export async function POST(req: Request) {
  let token = '';
  let newPassword = '';
  const ct = req.headers.get('content-type') || '';
  try {
    if (ct.includes('application/json')) {
      const body = await req.json();
      token = String(body?.token || '').trim();
      newPassword = String(body?.newPassword || '');
    } else if (ct.includes('application/x-www-form-urlencoded')) {
      const txt = await req.text();
      const p = new URLSearchParams(txt);
      token = String(p.get('token') || '').trim();
      newPassword = String(p.get('newPassword') || '');
    }
  } catch {}
  if (!token || newPassword.length < 6)
    return NextResponse.json({ error: 'invalid_input' }, { status: 400 });

  const user = db.getUserByPasswordResetToken(token);
  if (!user) return NextResponse.json({ error: 'invalid_token' }, { status: 400 });
  if (!user.passwordResetExpiresAt || Date.now() > user.passwordResetExpiresAt)
    return NextResponse.json({ error: 'expired_token' }, { status: 400 });

  const passwordHash = await hashPassword(newPassword);
  db.updateUser({
    ...user,
    passwordHash,
    passwordResetToken: undefined,
    passwordResetExpiresAt: undefined,
  });

  // Auto-login after reset
  const jwt = signToken({ ...user, passwordHash });
  setAuthCookie(jwt);

  return NextResponse.json({ ok: true });
}
