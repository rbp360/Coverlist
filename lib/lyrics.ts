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
