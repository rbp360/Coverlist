// Simple deterministic stub enrichment for key and tempo based on title/artist
export type EnrichInput = { title: string; artist: string; mbid?: string };
export type EnrichResult = { key?: string; tempo?: number };

const KEYS = [
  'C',
  'G',
  'D',
  'A',
  'E',
  'B',
  'F#',
  'C#',
  'F',
  'Bb',
  'Eb',
  'Ab',
  'Am',
  'Em',
  'Bm',
  'F#m',
  'C#m',
  'G#m',
  'Dm',
  'Gm',
  'Cm',
  'Fm',
  'Bbm',
  'Ebm',
];

function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h >>> 0;
}

export function enrichKeyTempoStub(input: EnrichInput): EnrichResult {
  const seed = hash(`${input.title}|${input.artist}|${input.mbid || ''}`);
  const key = KEYS[seed % KEYS.length];
  // Tempo between 72 and 168 bpm
  const tempo = 72 + (seed % 97);
  return { key, tempo };
}

// Attempt to enrich key/tempo using the GetSong BPM API.
// Configuration via environment variables:
// - GETSONG_API_KEY (required)
// - GETSONG_EMAIL (optional; sent when API expects an identifying email)
export async function enrichKeyTempoGetSong(input: EnrichInput): Promise<EnrichResult> {
  const apiKey = process.env.GETSONG_API_KEY || process.env.GETSONG_APIKEY;
  const email = process.env.GETSONG_EMAIL;
  if (!apiKey) {
    throw new Error('GETSONG_API_KEY is not set');
  }

  const title = input.title.trim();
  const artist = input.artist.trim();
  const baseUrl = (process.env.GETSONG_BASE_URL || 'https://api.getsongbpm.com').replace(/\/$/, '');
  // Some deployments (api.getsong.co) expect the API key in headers; official getsongbpm.com expects query param
  const headerAuth = /api\.getsong\.co$/i.test(baseUrl);
  // User-Agent may help with some protections; include contact email when available.
  const ua = email ? `Coverlist/1.0 (${email})` : 'Coverlist/1.0';
  const defaultHeaders: Record<string, string> = {
    'User-Agent': ua,
    Accept: 'application/json',
    Referer: 'https://getsongbpm.com/api',
    'Accept-Language': 'en-US,en;q=0.8',
  };

  const norm = (s: string) =>
    s
      .toLowerCase()
      .replace(/\([^\)]*\)/g, '')
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  const nt = norm(title);
  const na = norm(artist);

  type Candidate = {
    bpm?: number;
    tempo?: number;
    key?: string;
    scale?: string;
    musical_key?: string;
    title?: string;
    song?: string;
    artist?: string;
    id?: string | number;
  };
  const pickBpm = (obj: any): number | undefined => {
    const n = Number(obj?.bpm ?? obj?.tempo);
    return Number.isFinite(n) && n > 0 ? Math.round(n) : undefined;
  };
  const pickKey = (obj: any): string | undefined => {
    // Prefer documented field names for GetSong BPM
    const k = String(obj?.key_of ?? obj?.key ?? '').trim();
    if (k) return k;
    const open = String(obj?.open_key ?? '').trim();
    if (open) return open;
    const scale = String(obj?.scale ?? '').trim();
    if (scale) return scale;
    return undefined;
  };

  // Helper to select best match from a list of items with title/artist
  const bestMatch = (items: any[]): (EnrichResult & { _id?: string | number }) | undefined => {
    let best: { score: number; r: EnrichResult & { _id?: string | number } } | null = null;
    for (const it of items) {
      const t = norm(String(it.title || it.song || ''));
      const a = norm(String(it.artist || ''));
      let score = 0;
      if (t && nt && (t === nt || t.includes(nt) || nt.includes(t))) score += 2;
      if (a && na && (a === na || a.includes(na) || na.includes(a))) score += 2;
      const bpm = pickBpm(it);
      if (bpm) score += 1;
      const key = pickKey(it);
      if (key) score += 1;
      if (score > 0) {
        const r: EnrichResult & { _id?: string | number } = {
          tempo: bpm,
          key,
          _id: (it as any)?.id,
        };
        if (!best || score > best.score) best = { score, r };
      }
    }
    return best?.r;
  };

  // Helper for GET with header/query auth depending on baseUrl
  const authFetch = async (url: string) => {
    const u = new URL(url);
    const headers = { ...defaultHeaders };
    if (!headerAuth) {
      // getsongbpm.com style: api_key in query
      if (!u.searchParams.get('api_key')) u.searchParams.set('api_key', apiKey);
    } else {
      headers['x-api-key'] = apiKey;
      if (email) headers['x-user-email'] = email;
    }
    const res = await fetch(u.toString(), { headers, next: { revalidate: 0 } as any }).catch(
      () => undefined,
    );
    const debug = /^(1|true)$/i.test(String(process.env.GETSONG_DEBUG || ''));
    if (debug && res && !res.ok) {
      try {
        const rawUrl = u.toString();
        const sanitized = rawUrl.replace(/(api_key=)[^&]+/i, '$1<redacted>');
        const body = await res.text();
        const excerpt = body.slice(0, 300).replace(/\s+/g, ' ').trim();
        // eslint-disable-next-line no-console
        console.warn(`GetSongBPM HTTP ${res.status} for ${sanitized} :: ${excerpt}`);
      } catch {
        // ignore debug errors
      }
    }
    return res;
  };

  // Try a few endpoint variants defensively
  let attempts: Array<() => Promise<EnrichResult | undefined>> = [
    // Primary: type=song using just the title, we will pick best match by artist client-side
    async () => {
      const lookup = encodeURIComponent(title);
      const url = `${baseUrl}/search/?type=song&lookup=${lookup}`;
      const res = await authFetch(url);
      if (!res || !res.ok) return undefined;
      const data: any = await res.json().catch(() => undefined);
      if (!data) return undefined;
      const items: any[] = Array.isArray(data?.search) ? data.search : [];
      const flat = items.map((x) => (x?.song ? { ...x.song } : x));
      return bestMatch(flat);
    },
    // getsongbpm.com search: type=both with formatted lookup
    async () => {
      const lookup = encodeURIComponent(`song:${title} artist:${artist}`);
      const url = `${baseUrl}/search/?type=both&lookup=${lookup}`;
      const res = await authFetch(url);
      if (!res || !res.ok) return undefined;
      const data: any = await res.json().catch(() => undefined);
      if (!data) return undefined;
      const items: any[] = Array.isArray(data?.search) ? data.search : [];
      // Normalize: { song: { id, tempo, key, title, artist } }
      const flat = items.map((x) => (x?.song ? { ...x.song } : x));
      return bestMatch(flat);
    },
    // If we got an id but no tempo, fetch full song details by id
    async () => {
      const lookup = encodeURIComponent(`song:${title} artist:${artist}`);
      const searchUrl = `${baseUrl}/search/?type=both&lookup=${lookup}`;
      const sres = await authFetch(searchUrl);
      if (!sres || !sres.ok) return undefined;
      const sdata: any = await sres.json().catch(() => undefined);
      const items: any[] = Array.isArray(sdata?.search) ? sdata.search : [];
      const flat = items.map((x) => (x?.song ? { ...x.song } : x));
      const best = bestMatch(flat);
      if (!best || !best._id) return best ?? undefined;
      const songUrl = `${baseUrl}/song/?id=${encodeURIComponent(String(best._id))}`;
      const dres = await authFetch(songUrl);
      if (!dres || !dres.ok) return best;
      const ddata: any = await dres.json().catch(() => undefined);
      const detail = ddata?.song ?? ddata;
      const bpm = pickBpm(detail);
      const key = pickKey(detail);
      return { tempo: bpm ?? best.tempo, key: key ?? best.key };
    },
  ];

  // Strict mode: only try the first attempt (no secondary detail lookups)
  const strict = /^(1|true)$/i.test(String(process.env.GETSONG_STRICT || ''));
  if (strict) attempts = attempts.slice(0, 1);

  for (const fn of attempts) {
    try {
      const r = await fn();
      if (r && (r.key || r.tempo)) return r;
    } catch {
      // ignore attempt errors, continue
    }
  }
  return {};
}
