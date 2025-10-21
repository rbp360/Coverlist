import { NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth';

export async function GET(request: Request) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const url = new URL(request.url);
  const q = url.searchParams.get('q');
  const artist = url.searchParams.get('artist') || '';
  const genre = url.searchParams.get('genre') || '';
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '30', 10) || 30, 30);
  if (!q || q.length < 2) return NextResponse.json({ results: [] });
  // Build MB query: recording name plus optional artist/genre terms
  const terms = [`recording:${q}`];
  if (artist) terms.push(`artist:${artist}`);
  if (genre) terms.push(`tag:${genre}`);
  const query = terms.join(' ');
  const mbUrl = `https://musicbrainz.org/ws/2/recording?fmt=json&limit=${limit}&inc=releases&query=${encodeURIComponent(query)}`;
  const res = await fetch(mbUrl, { headers: { 'User-Agent': 'SongDeck/0.1 (demo)' } });
  if (!res.ok) return NextResponse.json({ results: [] });
  const data = await res.json();
  // helpers for ranking releases and dates
  const parseDateToMs = (s?: string): number => {
    if (!s || typeof s !== 'string') return Number.POSITIVE_INFINITY;
    const [y, m = '1', d = '1'] = s.split('-');
    const year = Number(y);
    const month = Number(m);
    const day = Number(d);
    if (!Number.isFinite(year) || year <= 0) return Number.POSITIVE_INFINITY;
    return Date.UTC(year, Math.max(0, (month || 1) - 1), Math.max(1, day || 1));
  };
  const releaseStudioRank = (rel: any, recTitle: string): number => {
    const status = String(rel?.status || '').toLowerCase(); // e.g., Official, Bootleg, Promotion
    const rg = rel?.['release-group'] ?? {};
    const primary = String(rg['primary-type'] || rg['type'] || '').toLowerCase(); // Album, Single, EP
    const secondary: string[] = Array.isArray(rg['secondary-types'])
      ? rg['secondary-types'].map((s: any) => String(s).toLowerCase())
      : [];
    const title = String(rel?.title || '').toLowerCase();
    const rtitle = String(recTitle || '').toLowerCase();
    const titleHas = (needle: string) => title.includes(needle);
    const recHas = (needle: string) => rtitle.includes(needle);
    const isLive =
      secondary.includes('live') ||
      titleHas(' live') ||
      titleHas('(live') ||
      recHas(' live') ||
      recHas('(live');
    const isCompilation =
      secondary.includes('compilation') ||
      titleHas('greatest hits') ||
      titleHas('best of') ||
      titleHas('anthology') ||
      titleHas('compilation');
    const isRemixOrAlt =
      secondary.includes('remix') ||
      titleHas('remix') ||
      titleHas('remastered') ||
      titleHas('deluxe') ||
      titleHas('expanded') ||
      titleHas('bonus');
    // Lower is better
    let rank = 3; // default unknown
    if (status === 'official') rank -= 1;
    if (primary === 'album') rank -= 1;
    if (primary === 'single' || primary === 'ep') rank += 0; // neutral
    if (isCompilation) rank += 1;
    if (isRemixOrAlt) rank += 1;
    if (isLive) rank += 3; // push live lower
    return Math.max(0, rank);
  };
  const results = (data.recordings || [])
    .map((r: any) => {
      const title = r.title as string;
      const a = r['artist-credit']?.[0]?.name ?? 'Unknown';
      const durationSec = r.length ? Math.round(r.length / 1000) : undefined;
      const releases: any[] = Array.isArray(r.releases) ? r.releases : [];
      // choose the best release for display and compute earliest date
      const bestRelease = releases.slice().sort((ra, rb) => {
        const rka = releaseStudioRank(ra, title);
        const rkb = releaseStudioRank(rb, title);
        if (rka !== rkb) return rka - rkb;
        const da = parseDateToMs(ra?.date);
        const db = parseDateToMs(rb?.date);
        return da - db;
      })[0];
      const release = bestRelease?.title as string | undefined;
      const earliestDateMs = releases.length
        ? Math.min(...releases.map((rel) => parseDateToMs(rel?.date)))
        : Number.POSITIVE_INFINITY;
      const bestRank = bestRelease ? releaseStudioRank(bestRelease, title) : 999;
      // naive score: title match + artist match + has duration
      let score = 0;
      if (q && title.toLowerCase().includes(q.toLowerCase())) score += 2;
      if (artist && a.toLowerCase().includes(artist.toLowerCase())) score += 2;
      if (durationSec) score += 1;
      return {
        mbid: r.id,
        title,
        artist: a,
        durationSec,
        release,
        _score: score,
        _rank: bestRank,
        _earliest: earliestDateMs,
      };
    })
    // Prefer studio/official album, then earliest release date, then our heuristic score
    .sort((x: any, y: any) => {
      if ((x._rank ?? 999) !== (y._rank ?? 999)) return (x._rank ?? 999) - (y._rank ?? 999);
      if ((x._earliest ?? Infinity) !== (y._earliest ?? Infinity))
        return (x._earliest ?? Infinity) - (y._earliest ?? Infinity);
      return (y._score ?? 0) - (x._score ?? 0);
    })
    .map(({ _score, _rank, _earliest, ...rest }: any) => rest);
  return NextResponse.json({ results });
}
