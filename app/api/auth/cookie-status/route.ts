import crypto from 'crypto';

import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { FIREBASE_SESSION_COOKIE } from '@/lib/firebaseSession';

const LEGACY_COOKIE = 'songdeck_token';

function hashValue(v: string | undefined) {
  if (!v) return null;
  return crypto.createHash('sha256').update(v).digest('hex').slice(0, 16);
}

export async function GET() {
  const fb = cookies().get(FIREBASE_SESSION_COOKIE)?.value;
  const legacy = cookies().get(LEGACY_COOKIE)?.value;
  const res = NextResponse.json({
    firebase_session_present: !!fb,
    firebase_session_hash16: hashValue(fb),
    legacy_cookie_present: !!legacy,
    legacy_cookie_hash16: hashValue(legacy),
  });
  res.headers.set('Cache-Control', 'no-store');
  return res;
}
