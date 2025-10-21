import { NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth';

export async function GET(request: Request) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const url = new URL(request.url);
  const q = url.searchParams.get('q');
  if (!q || q.length < 2) return NextResponse.json({ results: [] });
  // Search MB recordings by recording name; limit results to reduce noise
  const mbUrl = `https://musicbrainz.org/ws/2/recording?fmt=json&limit=10&query=${encodeURIComponent(q)}`;
  const res = await fetch(mbUrl, { headers: { 'User-Agent': 'SongDeck/0.1 (demo)' } });
  if (!res.ok) return NextResponse.json({ results: [] });
  const data = await res.json();
  const results = (data.recordings || []).map((r: any) => ({
    mbid: r.id,
    title: r.title,
    artist: r['artist-credit']?.[0]?.name ?? 'Unknown',
    durationSec: r.length ? Math.round(r.length / 1000) : undefined
  }));
  return NextResponse.json({ results });
}
