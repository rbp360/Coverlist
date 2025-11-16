export type LyricLine = {
  time: number; // milliseconds from start
  text: string;
};

export type LRCLibResponse = {
  syncedLyrics?: string | null;
  plainLyrics?: string | null;
  /** Additional fields are ignored here */
};

/**
 * Parse an LRC string into a sorted array of { time(ms), text }.
 * Supports multiple time tags per line and mm:ss(.ff) or mm:ss:ms formats.
 */
export function parseLRC(lrc: string): LyricLine[] {
  if (!lrc) return [];
  const lines = lrc.split(/\r?\n/);
  const result: LyricLine[] = [];
  const timeTagRe = /\[(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?]/g; // [mm:ss.xx] or [mm:ss:ms]

  for (const raw of lines) {
    if (!raw) continue;
    // Skip metadata like [ar:], [ti:], [al:], [by:], [offset:]
    if (/^\s*\[(ar|ti|al|by|offset):/i.test(raw)) continue;

    let text = raw.replace(timeTagRe, '').trim();
    if (!text) text = '';

    let m: RegExpExecArray | null;
    timeTagRe.lastIndex = 0;
    const matches: number[] = [];
    while ((m = timeTagRe.exec(raw))) {
      const mm = parseInt(m[1], 10) || 0;
      const ss = parseInt(m[2], 10) || 0;
      const frac = m[3] ? parseInt(m[3].padEnd(3, '0').slice(0, 3), 10) : 0; // normalize to ms
      const t = mm * 60_000 + ss * 1000 + frac;
      matches.push(t);
    }
    if (matches.length === 0) continue;
    for (const t of matches) {
      result.push({ time: t, text });
    }
  }

  // Sort and de-duplicate by time while preserving first occurrence's text
  result.sort((a, b) => a.time - b.time);
  const dedup: LyricLine[] = [];
  let prevTime = -1;
  for (const line of result) {
    if (line.time !== prevTime) {
      dedup.push(line);
      prevTime = line.time;
    }
  }
  return dedup;
}

/**
 * Fetch lyrics from LRCLib. Prefer isrc when available.
 * If nothing is found, returns { lines: [], plain } where plain is unsynced text if available.
 */
export async function fetchSyncedLyricsLRCLib(params: {
  isrc?: string;
  title?: string;
  artist?: string;
  album?: string;
  durationMs?: number;
}): Promise<{ lines: LyricLine[]; plain?: string }> {
  const qs = new URLSearchParams();
  if (params.isrc) qs.set('isrc', params.isrc);
  if (params.title) qs.set('track_name', params.title);
  if (params.artist) qs.set('artist_name', params.artist);
  if (params.album) qs.set('album_name', params.album);
  if (params.durationMs) qs.set('duration', String(Math.round(params.durationMs / 1000)));

  const url = `https://lrclib.net/api/get?${qs.toString()}`;
  try {
    const res = await fetch(url, { method: 'GET' });
    if (!res.ok) {
      return { lines: [] };
    }
    const json = (await res.json()) as LRCLibResponse | null;
    const synced = json?.syncedLyrics?.trim();
    const plain = json?.plainLyrics?.trim() || undefined;
    if (synced) {
      return { lines: parseLRC(synced), plain };
    }
    return { lines: [], plain };
  } catch {
    return { lines: [] };
  }
}

/**
 * Utility to compute the active lyric index for a given time.
 */
export function findActiveIndex(lines: LyricLine[], currentMs: number): number {
  if (lines.length === 0) return -1;
  let lo = 0;
  let hi = lines.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (lines[mid].time <= currentMs) lo = mid + 1;
    else hi = mid - 1;
  }
  return Math.max(0, lo - 1);
}

// --------------------- Robust Fetch (multi-attempt) ---------------------

export type LyricAttempt = {
  url: string;
  variant: VariantMeta;
  ok: boolean;
  hadSynced: boolean;
  hadPlain: boolean;
};

type VariantMeta = {
  reason: string; // description of transformation
  isrc?: string;
  track_name?: string;
  artist_name?: string;
  album_name?: string;
  duration?: number; // seconds
};

function sanitize(str: string | undefined): string | undefined {
  if (!str) return str;
  let s = str
    .replace(/\u2018|\u2019/g, "'")
    .replace(/\u201C|\u201D/g, '"')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, ' ') // collapse whitespace
    .trim();
  // Remove trailing version descriptors
  s = s
    .replace(/\b-\s*(live|remaster(?:ed)? ?\d{4}?|mono|stereo|album\s+version)\b.*$/i, '')
    .trim();
  // Remove parentheses/brackets content often variant-specific
  s = s
    .replace(
      /\s*[\[(][^\])]*(mix|version|live|remaster(?:ed)?|mono|stereo|edit|feat\.?)[^\])]*[\])]\s*/gi,
      ' ',
    )
    .trim();
  // Remove multiple featuring parts -> keep primary artist
  s = s
    .replace(/\s+feat\..*$/i, '')
    .replace(/\s+ft\..*$/i, '')
    .trim();
  return s;
}

function buildVariants(params: {
  isrc?: string;
  title?: string;
  artist?: string;
  album?: string;
  durationMs?: number;
}): VariantMeta[] {
  const { isrc, title, artist, album, durationMs } = params;
  const duration = durationMs ? Math.round(durationMs / 1000) : undefined;
  const base: VariantMeta[] = [];
  if (isrc) {
    base.push({ reason: 'Primary (ISRC only)', isrc });
  }
  // Full metadata
  base.push({
    reason: 'Full metadata',
    isrc,
    track_name: title,
    artist_name: artist,
    album_name: album,
    duration,
  });
  // Without album
  base.push({ reason: 'No album', isrc, track_name: title, artist_name: artist, duration });
  // Sanitized title/artist
  const st = sanitize(title);
  const sa = sanitize(artist);
  if (st !== title || sa !== artist) {
    base.push({ reason: 'Sanitized title/artist', track_name: st, artist_name: sa, duration });
  }
  // Title without punctuation
  if (title) {
    const noPunct = title.replace(/[.,!?]/g, '').trim();
    if (noPunct && noPunct !== title) {
      base.push({
        reason: 'Title no punctuation',
        track_name: noPunct,
        artist_name: artist,
        duration,
      });
    }
  }
  // Shortened artist first token
  if (artist) {
    const firstArtist = artist
      .split(/[,;&]/)[0]
      .split(/feat\.|ft\./i)[0]
      .trim();
    if (firstArtist && firstArtist !== artist) {
      base.push({
        reason: 'Primary artist only',
        track_name: title,
        artist_name: firstArtist,
        duration,
      });
    }
  }
  // Duration removed (sometimes mismatch)
  base.push({ reason: 'No duration', track_name: title, artist_name: artist });
  // Sanitized + no duration
  if (st || sa) {
    base.push({ reason: 'Sanitized no duration', track_name: st, artist_name: sa });
  }
  // Deduplicate identical variant keys
  const seen = new Set<string>();
  const dedup: VariantMeta[] = [];
  for (const v of base) {
    const key = [v.isrc, v.track_name, v.artist_name, v.album_name, v.duration].join('||');
    if (!seen.has(key)) {
      seen.add(key);
      dedup.push(v);
    }
  }
  return dedup;
}

export async function fetchLyricsLRCLibRobust(params: {
  isrc?: string;
  title?: string;
  artist?: string;
  album?: string;
  durationMs?: number;
  maxAttempts?: number;
}): Promise<{
  lines: LyricLine[];
  plain?: string;
  attempts: LyricAttempt[];
  usedVariantIndex: number | null;
  warning?: string;
}> {
  const variants = buildVariants(params);
  const maxAttempts = params.maxAttempts ?? 8; // cap to avoid excessive queries
  const attempts: LyricAttempt[] = [];
  for (let i = 0; i < variants.length && i < maxAttempts; i++) {
    const v = variants[i];
    const qs = new URLSearchParams();
    if (v.isrc) qs.set('isrc', v.isrc);
    if (v.track_name) qs.set('track_name', v.track_name);
    if (v.artist_name) qs.set('artist_name', v.artist_name);
    if (v.album_name) qs.set('album_name', v.album_name);
    if (typeof v.duration === 'number') qs.set('duration', String(v.duration));
    const url = `https://lrclib.net/api/get?${qs.toString()}`;
    try {
      const res = await fetch(url, { method: 'GET' });
      if (!res.ok) {
        attempts.push({ url, variant: v, ok: false, hadSynced: false, hadPlain: false });
        continue;
      }
      const json = (await res.json()) as LRCLibResponse | null;
      const synced = json?.syncedLyrics?.trim();
      const plain = json?.plainLyrics?.trim() || undefined;
      attempts.push({
        url,
        variant: v,
        ok: true,
        hadSynced: !!synced,
        hadPlain: !!plain,
      });
      if (synced) {
        return { lines: parseLRC(synced), plain, attempts, usedVariantIndex: i };
      }
      if (plain) {
        // keep searching for synced, but return plain if last attempt
        if (i === variants.length - 1 || i + 1 >= maxAttempts) {
          return {
            lines: [],
            plain,
            attempts,
            usedVariantIndex: null,
            warning: 'Synced lyrics unavailable; showing plain text.',
          };
        }
      }
    } catch {
      attempts.push({ url, variant: v, ok: false, hadSynced: false, hadPlain: false });
      continue;
    }
  }
  return {
    lines: [],
    plain: undefined,
    attempts,
    usedVariantIndex: null,
    warning: 'No lyrics found after variant attempts. Consider selecting a standard release.',
  };
}
