import { NextResponse } from 'next/server';

// Deprecated: client now calls Firebase sendPasswordResetEmail directly.
export async function POST() {
  return NextResponse.json({ error: 'use_firebase_reset' }, { status: 400 });
}
