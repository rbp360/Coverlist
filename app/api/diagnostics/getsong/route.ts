import { NextResponse } from 'next/server';

// This diagnostics endpoint has been retired. GetSongBPM integration was removed.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ error: 'GetSong diagnostics removed' }, { status: 410 });
}
