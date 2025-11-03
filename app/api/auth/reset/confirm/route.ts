import { NextResponse } from 'next/server';

// Deprecated: password reset confirmation is handled on /auth/action via Firebase.
export async function POST() {
  return NextResponse.json({ error: 'use_firebase_reset' }, { status: 400 });
}
