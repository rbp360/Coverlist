import { NextResponse } from 'next/server';

import { clearAuthCookie } from '@/lib/auth';
import { clearServerSessionCookie } from '@/lib/firebaseSession';

export async function POST() {
  clearAuthCookie();
  try {
    clearServerSessionCookie();
  } catch {}
  return NextResponse.json({ ok: true });
}
