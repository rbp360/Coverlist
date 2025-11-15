import { NextResponse } from 'next/server';

import { getCurrentUserAsync } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const user = await getCurrentUserAsync();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const url = new URL(request.url);
  const q = url.searchParams.get('q');
  const artist = url.searchParams.get('artist') || '';
  const genre = url.searchParams.get('genre') || '';
  const limitParam = parseInt(url.searchParams.get('limit') || '30', 10) || 30;
  const limit = Math.min(limitParam, 30);

  // MusicBrainz requires a descriptive User-Agent with contact info per their usage policy
  const headers = {
    'User-Agent': 'Coverlist/1.0 (+https://github.com/rbp360/Coverlist)',
  } as const;

  // Helpers
  // Broader pattern to detect "hits" style collections
  const HITS_REGEX =
    /\b(greatest hits|best of|very best|ultimate collection|definitive collection|collection|anthology|essentials?|the singles|singles|hits)\b/i;
  // Detect obvious tribute/karaoke/cover impersonators
  const BAD_ARTIST_REGEX =
    /\b(tribute|karaoke|cover|sound[- ]?alike|originally performed by|made famous by|backing track|re[- ]?record(ed|ing)?|studio group|party hits|the hit crew|sing[- ]?along|instrumental tribute)\b/i;
  const FEAT_REGEX = /\b(feat\.|ft\.|featuring)\b/i;
  const normTitle = (s?: string) =>
    String(s || '')
      .toLowerCase()
      .replace(/\([^\)]*\)/g, '')
      .replace(/\s+-\s+live.*/g, '')
      .replace(/\s+remaster(ed)?\b.*/g, '')
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  const parseDateToMs = (s?: string): number => {
    if (!s || typeof s !== 'string') return Number.POSITIVE_INFINITY;
    const [y, m = '1', d = '1'] = s.split('-');
    const year = Number(y);
    const month = Number(m);
    const day = Number(d);
    if (!Number.isFinite(year) || year <= 0) return Number.POSITIVE_INFINITY;
    return Date.UTC(year, Math.max(0, (month || 1) - 1), Math.max(1, day || 1));
  };
  const normName = (s?: string) =>
    String(s || '')
      .toLowerCase()
      .replace(/^the\s+/, '')
      .trim();
  const releaseStudioRank = (rel: any, recTitle: string, searchArtist?: string): number => {
    const status = String(rel?.status || '').toLowerCase();
    const rg = rel?.['release-group'] ?? {};
    const primary = String(rg['primary-type'] || rg['type'] || '').toLowerCase();
    const secondary: string[] = Array.isArray(rg['secondary-types'])
      ? rg['secondary-types'].map((s: any) => String(s).toLowerCase())
      : [];
    const title = String(rel?.title || '').toLowerCase();
    const rtitle = String(recTitle || '').toLowerCase();
    const ac: any[] = Array.isArray(rel?.['artist-credit']) ? rel['artist-credit'] : [];
    const releaseArtistNames: string[] = ac.map((c: any) => String(c?.name || '')).filter(Boolean);
    const matchesSearchArtist = searchArtist
      ? releaseArtistNames.some((n) => normName(n) === normName(searchArtist))
      : false;
    const isVarious = releaseArtistNames.some((n) => n.toLowerCase() === 'various artists');
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
      titleHas('compilation') ||
      titleHas('collection') ||
      titleHas('definitive collection') ||
      titleHas('ultimate collection') ||
      titleHas('essentials') ||
      titleHas('the singles') ||
      titleHas('singles');
    // Specific boost for "hits" collections (e.g., Greatest Hits, Best Of, Collections)
    const isGreatestHits =
      /\b(greatest hits|best of|very best|collection|ultimate collection|definitive collection|anthology|essentials?|the singles|singles|hits)\b/i.test(
        title,
      );
    const isRemixOrAlt =
      secondary.includes('remix') ||
      titleHas('remix') ||
      titleHas('remastered') ||
      titleHas('deluxe') ||
      titleHas('expanded') ||
      titleHas('bonus');
    // Re-rank: Singles highest, then studio albums, then others. Hits/compilations downweighted.
    let rank = 10;
    const isAlbum = primary === 'album';
    const isSingle = primary === 'single';
    const isEP = primary === 'ep';
    const isStudioAlbum =
      isAlbum && !isCompilation && !isLive && !isRemixOrAlt && !titleHas('soundtrack');

    if (isSingle)
      rank = 0; // singles top priority
    else if (isStudioAlbum)
      rank = 1; // then studio albums
    else if (isAlbum && status === 'official')
      rank = 2; // other official albums
    else if (isEP)
      rank = 3; // EPs next
    else if (isCompilation || isGreatestHits)
      rank = 5; // hits/collections lower
    else if (isLive) rank = 6;
    else if (isRemixOrAlt) rank = 7;

    // Slight nudge if artist matches the search
    if (matchesSearchArtist) rank = Math.max(0, rank - 1);
    // Downweight Various Artists for anything but true studio albums
    if (isVarious && !isStudioAlbum && !isSingle) rank += 1;
    return Math.max(0, rank);
  };
  const isStudioAlbumRelease = (rel: any, recTitle: string): boolean => {
    const rg = rel?.['release-group'] ?? {};
    const primary = String(rg['primary-type'] || rg['type'] || '').toLowerCase();
    const secondary: string[] = Array.isArray(rg['secondary-types'])
      ? rg['secondary-types'].map((s: any) => String(s).toLowerCase())
      : [];
    const title = String(rel?.title || '').toLowerCase();
    const isAlbum = primary === 'album';
    const isCompilation =
      secondary.includes('compilation') ||
      /\b(greatest hits|best of|very best|collection|ultimate collection|definitive collection|anthology|essentials?|the singles|singles|hits)\b/i.test(
        title,
      );
    const isLive = secondary.includes('live') || title.includes(' live') || title.includes('(live');
    const isRemixOrAlt =
      secondary.includes('remix') ||
      title.includes('remix') ||
      title.includes('remastered') ||
      title.includes('deluxe') ||
      title.includes('expanded') ||
      title.includes('bonus');
    return isAlbum && !isCompilation && !isLive && !isRemixOrAlt && !title.includes('soundtrack');
  };

  // Branch 1: recording title provided
  if (q && q.length >= 2) {
    const quotedQ = q.includes(' ') ? `"${q}"` : q;
    const terms = [`recording:${quotedQ}`];
    if (artist) terms.push(`artist:${artist}`);
    if (genre) terms.push(`tag:${genre}`);
    const query = terms.join(' ');
    const mbUrl = `https://musicbrainz.org/ws/2/recording?fmt=json&limit=${limit}&inc=releases+isrcs&query=${encodeURIComponent(
      query,
    )}`;
    const res = await fetch(mbUrl, { headers });
    if (!res.ok) return NextResponse.json({ results: [] });
    const data = await res.json();
    const results = (data.recordings || [])
      .map((r: any) => {
        const title = r.title as string;
        const artistCredit: any[] = Array.isArray(r['artist-credit']) ? r['artist-credit'] : [];
        const a = artistCredit?.[0]?.name ?? 'Unknown';
        const artistNames = artistCredit.map((c: any) => String(c?.name || '')).filter(Boolean);
        const durationSec = r.length ? Math.round(r.length / 1000) : undefined;
        const releases: any[] = Array.isArray(r.releases) ? r.releases : [];
        const hasBadArtist = artistNames.some((nm) => BAD_ARTIST_REGEX.test(nm));
        const titleHasFeat = FEAT_REGEX.test(title);
        const matchesSearchArtistExact = artist ? normName(a) === normName(artist) : false;
        const isVariousRecording = artistNames.some((nm) => nm.toLowerCase() === 'various artists');
        const artistPenalty =
          (hasBadArtist ? 5 : 0) +
          (artist && !matchesSearchArtistExact ? 2 : 0) +
          (isVariousRecording && artist ? 2 : 0) +
          (titleHasFeat && artist && !matchesSearchArtistExact ? 1 : 0);
        const hitsCount = releases.reduce((n, rel) => {
          const relTitle = String(rel?.title || '');
          if (!HITS_REGEX.test(relTitle)) return n;
          const ac: any[] = Array.isArray(rel?.['artist-credit']) ? rel['artist-credit'] : [];
          const names: string[] = ac.map((c: any) => String(c?.name || '')).filter(Boolean);
          const matches = artist ? names.some((nm) => normName(nm) === normName(artist)) : false;
          const isVarious = names.some((nm) => nm.toLowerCase() === 'various artists');
          const weight = matches ? 1 : isVarious ? 0.1 : 0.25;
          return n + weight;
        }, 0);
        const bestRelease = releases.slice().sort((ra, rb) => {
          const rka = releaseStudioRank(ra, title, artist || undefined);
          const rkb = releaseStudioRank(rb, title, artist || undefined);
          if (rka !== rkb) return rka - rkb;
          const da = parseDateToMs(ra?.date);
          const db = parseDateToMs(rb?.date);
          return da - db;
        })[0];
        const release = bestRelease?.title as string | undefined;
        const rg = bestRelease?.['release-group'] ?? {};
        const releaseTypePrimary = String(rg['primary-type'] || rg['type'] || '') || undefined;
        const releaseTypeSecondary: string[] = Array.isArray(rg['secondary-types'])
          ? rg['secondary-types'].map((s: any) => String(s))
          : [];
        const earliestDateMs = releases.length
          ? Math.min(...releases.map((rel) => parseDateToMs(rel?.date)))
          : Number.POSITIVE_INFINITY;
        const bestRank = bestRelease ? releaseStudioRank(bestRelease, title) : 999;
        let finalRank = bestRank + artistPenalty;
        const qLower = q.toLowerCase();
        const recLower = title.toLowerCase();
        const exactRecordingMatch = recLower === qLower;
        const partialRecordingMatch = recLower.includes(qLower);
        // Strong boost for exact recording title match
        if (exactRecordingMatch) finalRank -= 5;
        // Moderate boost for partial recording title match
        else if (partialRecordingMatch) finalRank -= 2;
        const isStudio = bestRelease ? isStudioAlbumRelease(bestRelease, title) : false;
        const isLive = releaseTypeSecondary.map((s) => s.toLowerCase()).includes('live');
        const isCompilation = releaseTypeSecondary
          .map((s) => s.toLowerCase())
          .includes('compilation');
        let score = 0;
        if (exactRecordingMatch) score += 10;
        else if (partialRecordingMatch) score += 5;
        if (artist && a.toLowerCase().includes(artist.toLowerCase())) score += 2;
        if (durationSec) score += 1;
        const isrcs: string[] = Array.isArray(r.isrcs) ? r.isrcs : [];
        const isrc = isrcs[0];
        return {
          mbid: r.id,
          title,
          artist: a,
          durationSec,
          release,
          isrc,
          releaseTypePrimary,
          releaseTypeSecondary,
          releaseIsStudio: isStudio,
          releaseIsLive: isLive,
          releaseIsCompilation: isCompilation,
          _hitsCount: hitsCount,
          _score: score,
          _rank: finalRank,
          _earliest: earliestDateMs,
          _isStudio: isStudio,
        };
      })
      .sort((x: any, y: any) => {
        // By computed rank (singles highest, then studio albums, etc.)
        if ((x._rank ?? 999) !== (y._rank ?? 999)) return (x._rank ?? 999) - (y._rank ?? 999);
        // Earlier releases preferred
        if ((x._earliest ?? Infinity) !== (y._earliest ?? Infinity))
          return (x._earliest ?? Infinity) - (y._earliest ?? Infinity);
        // Soft score next
        if ((y._score ?? 0) !== (x._score ?? 0)) return (y._score ?? 0) - (x._score ?? 0);
        // Finally, hits/collections count as the last tie-breaker (de-emphasized)
        return (y._hitsCount ?? 0) - (x._hitsCount ?? 0);
      })
      .map(({ _score, _rank, _earliest, _isStudio, ...rest }: any) => rest);
    return NextResponse.json({ results });
  }

  // Branch 2: artist-only search — return top 20 unique song titles for this artist
  if (artist && artist.length >= 2) {
    const fetchLimit = 100; // fetch more to allow deduplication
    const terms = [`artist:${artist}`];
    if (genre) terms.push(`tag:${genre}`);
    const query = terms.join(' ');
    const mbUrl = `https://musicbrainz.org/ws/2/recording?fmt=json&limit=${fetchLimit}&inc=releases+isrcs&query=${encodeURIComponent(
      query,
    )}`;
    const res = await fetch(mbUrl, { headers });
    if (!res.ok) return NextResponse.json({ results: [] });
    const data = await res.json();

    const candidates = (data.recordings || [])
      .map((r: any) => {
        const title = r.title as string;
        const artistCredit: any[] = Array.isArray(r['artist-credit']) ? r['artist-credit'] : [];
        const a = artistCredit?.[0]?.name ?? 'Unknown';
        const artistNames = artistCredit.map((c: any) => String(c?.name || '')).filter(Boolean);
        const durationSec = r.length ? Math.round(r.length / 1000) : undefined;
        const releases: any[] = Array.isArray(r.releases) ? r.releases : [];
        const hasBadArtist = artistNames.some((nm) => BAD_ARTIST_REGEX.test(nm));
        const titleHasFeat = FEAT_REGEX.test(title);
        const matchesSearchArtistExact = artist ? normName(a) === normName(artist) : false;
        const isVariousRecording = artistNames.some((nm) => nm.toLowerCase() === 'various artists');
        const artistPenalty =
          (hasBadArtist ? 5 : 0) +
          (artist && !matchesSearchArtistExact ? 2 : 0) +
          (isVariousRecording && artist ? 2 : 0) +
          (titleHasFeat && artist && !matchesSearchArtistExact ? 1 : 0);
        const hitsCount = releases.reduce((n, rel) => {
          const relTitle = String(rel?.title || '');
          if (!HITS_REGEX.test(relTitle)) return n;
          const ac: any[] = Array.isArray(rel?.['artist-credit']) ? rel['artist-credit'] : [];
          const names: string[] = ac.map((c: any) => String(c?.name || '')).filter(Boolean);
          const matches = artist ? names.some((nm) => normName(nm) === normName(artist)) : false;
          const isVarious = names.some((nm) => nm.toLowerCase() === 'various artists');
          const weight = matches ? 1 : isVarious ? 0.1 : 0.25;
          return n + weight;
        }, 0);
        const bestRelease = releases.slice().sort((ra, rb) => {
          const rka = releaseStudioRank(ra, title, artist || undefined);
          const rkb = releaseStudioRank(rb, title, artist || undefined);
          if (rka !== rkb) return rka - rkb;
          const da = parseDateToMs(ra?.date);
          const db = parseDateToMs(rb?.date);
          return da - db;
        })[0];
        const release = bestRelease?.title as string | undefined;
        const rg = bestRelease?.['release-group'] ?? {};
        const releaseTypePrimary = String(rg['primary-type'] || rg['type'] || '') || undefined;
        const releaseTypeSecondary: string[] = Array.isArray(rg['secondary-types'])
          ? rg['secondary-types'].map((s: any) => String(s))
          : [];
        const earliestDateMs = releases.length
          ? Math.min(...releases.map((rel) => parseDateToMs(rel?.date)))
          : Number.POSITIVE_INFINITY;
        const bestRank = bestRelease ? releaseStudioRank(bestRelease, title) : 999;
        const finalRank = bestRank + artistPenalty;
        const isStudio = bestRelease ? isStudioAlbumRelease(bestRelease, title) : false;
        const isLive = releaseTypeSecondary.map((s) => s.toLowerCase()).includes('live');
        const isCompilation = releaseTypeSecondary
          .map((s) => s.toLowerCase())
          .includes('compilation');
        let score = 0;
        if (artist && a.toLowerCase().includes(artist.toLowerCase())) score += 2;
        if (durationSec) score += 1;
        const isrcs: string[] = Array.isArray(r.isrcs) ? r.isrcs : [];
        const isrc = isrcs[0];
        return {
          mbid: r.id,
          title,
          artist: a,
          durationSec,
          release,
          isrc,
          releaseTypePrimary,
          releaseTypeSecondary,
          releaseIsStudio: isStudio,
          releaseIsLive: isLive,
          releaseIsCompilation: isCompilation,
          _hitsCount: hitsCount,
          _score: score,
          _rank: finalRank,
          _earliest: earliestDateMs,
          _isStudio: isStudio,
        };
      })
      .sort((x: any, y: any) => {
        // By computed rank (singles highest, then studio albums, etc.)
        if ((x._rank ?? 999) !== (y._rank ?? 999)) return (x._rank ?? 999) - (y._rank ?? 999);
        // Then by earliest release date
        if ((x._earliest ?? Infinity) !== (y._earliest ?? Infinity))
          return (x._earliest ?? Infinity) - (y._earliest ?? Infinity);
        // Then by soft score
        if ((y._score ?? 0) !== (x._score ?? 0)) return (y._score ?? 0) - (x._score ?? 0);
        // Hits/collections count at the very end
        return (y._hitsCount ?? 0) - (x._hitsCount ?? 0);
      });

    // Deduplicate by normalized title and take top 20
    const seen = new Set<string>();
    const unique: any[] = [];
    for (const r of candidates) {
      const key = normTitle(r.title);
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(r);
      if (unique.length >= 20) break;
    }
    const results = unique.map(({ _score, _rank, _earliest, _isStudio, ...rest }: any) => rest);
    return NextResponse.json({ results });
  }

  // Neither a valid recording query nor artist — nothing to do
  return NextResponse.json({ results: [] });
}
