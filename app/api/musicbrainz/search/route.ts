import { NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth';

export async function GET(request: Request) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const url = new URL(request.url);
  const q = url.searchParams.get('q');
  const artist = url.searchParams.get('artist') || '';
  const genre = url.searchParams.get('genre') || '';
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '10', 10) || 10, 25);
  if (!q || q.length < 2) return NextResponse.json({ results: [] });
  // Build MB query: recording name plus optional artist/genre terms
  const terms = [`recording:${q}`];
  if (artist) terms.push(`artist:${artist}`);
  if (genre) terms.push(`tag:${genre}`);
  const query = terms.join(' ');
  const mbUrl = `https://musicbrainz.org/ws/2/recording?fmt=json&limit=${limit}&query=${encodeURIComponent(query)}`;
  const res = await fetch(mbUrl, { headers: { 'User-Agent': 'SongDeck/0.1 (demo)' } });
  if (!res.ok) return NextResponse.json({ results: [] });
  const data = await res.json();
  const results = (data.recordings || [])
    .map((r: any) => {
      const title = r.title as string;
      const a = r['artist-credit']?.[0]?.name ?? 'Unknown';
      const durationSec = r.length ? Math.round(r.length / 1000) : undefined;
      // naive score: title match + artist match + has duration
      let score = 0;
      if (q && title.toLowerCase().includes(q.toLowerCase())) score += 2;
      if (artist && a.toLowerCase().includes(artist.toLowerCase())) score += 2;
      if (durationSec) score += 1;
      return { mbid: r.id, title, artist: a, durationSec, _score: score };
    })
    .sort((x: any, y: any) => (y._score ?? 0) - (x._score ?? 0))
    .map(({ _score, ...rest }: any) => rest);
  return NextResponse.json({ results });
}
