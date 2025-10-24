import { NextResponse } from 'next/server';

// Removed diagnostics route; returning 404 to restore prior state.
export const runtime = 'nodejs';
export async function GET() {
  return NextResponse.json({ ok: false, removed: true }, { status: 404 });
}
