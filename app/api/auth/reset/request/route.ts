import crypto from 'crypto';

import { NextResponse } from 'next/server';

import { db } from '@/lib/db';

export async function POST(req: Request) {
  let email = '';
  const ct = req.headers.get('content-type') || '';
  try {
    if (ct.includes('application/json')) {
      const body = await req.json();
      email = String(body?.email || '')
        .trim()
        .toLowerCase();
    } else if (ct.includes('application/x-www-form-urlencoded')) {
      const txt = await req.text();
      const p = new URLSearchParams(txt);
      email = String(p.get('email') || '')
        .trim()
        .toLowerCase();
    }
  } catch {}
  if (!email) return NextResponse.json({ error: 'invalid_input' }, { status: 400 });

  const user = db.getUserByEmail(email);
  // Always respond 200 to avoid user enumeration
  if (!user) return NextResponse.json({ ok: true });

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes
  db.setUserPasswordReset(user.id, token, expiresAt);

  // Build reset URL using request host/protocol; prefer loopback consistency
  const u = new URL(req.url);
  const proto = u.protocol; // http:
  const host = u.hostname === 'localhost' ? '127.0.0.1' : u.hostname;
  const port = u.port ? `:${u.port}` : '';
  const resetUrl = `${proto}//${host}${port}/reset/${token}`;

  // In production you'd send an email; for dev we return the URL
  const body =
    process.env.NODE_ENV === 'production'
      ? { ok: true }
      : { ok: true, resetUrl, note: 'Use this link within 15 minutes to set a new password.' };
  return NextResponse.json(body);
}
