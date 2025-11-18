import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// Lightweight debug endpoint (remove for production if desired)
export async function GET() {
  const list = cookies()
    .getAll()
    .map((c) => c.name);
  const hasLegacy = list.includes('songdeck_token');
  const hasFirebase = list.includes('firebase_session');
  return NextResponse.json({ hasLegacy, hasFirebase, list });
}
