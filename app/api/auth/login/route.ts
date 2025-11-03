import { NextResponse } from 'next/server';

// Deprecated route: login is now handled client-side with Firebase Auth.
export async function POST() {
  return NextResponse.json({ error: 'use_firebase_login' }, { status: 400 });
}
