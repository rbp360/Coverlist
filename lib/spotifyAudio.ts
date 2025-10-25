import { fetchSpotify } from './spotifyAuth';

// Map Spotify key (0-11) and mode (0 major, 1 minor per docs: actually mode 1=major, 0=minor)
const PITCH_CLASSES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function readableKeyFromSpotify(
  key?: number | null,
  mode?: number | null,
): string | undefined {
  if (key == null || key < 0 || key > 11) return undefined;
  const root = PITCH_CLASSES[key];
  if (mode === 1) return `${root} Major`;
  if (mode === 0) return `${root} Minor`;
  // Unknown mode, just return root
  return root;
}

export type TrackKeyTempo = { id: string; key?: string; tempo?: number };

/**
 * Fetch key (readable) and tempo (BPM) for Spotify tracks using Audio Features API.
 * - Accepts any number of track IDs; batches requests into chunks of 100.
 * - Uses the existing authenticated fetch (refreshes tokens, handles 429s).
 * - Returns results aligned to the input order; missing/unknown items will have undefined fields.
 */
export async function getTracksKeyTempo(trackIds: string[]): Promise<TrackKeyTempo[]> {
  const ids = (trackIds || []).filter(Boolean);
  if (ids.length === 0) return [];

  // De-duplicate to minimize API calls, but preserve output order later
  const unique: string[] = [];
  const seen = new Set<string>();
  for (const id of ids) {
    if (!seen.has(id)) {
      seen.add(id);
      unique.push(id);
    }
  }

  const chunks: string[][] = [];
  for (let i = 0; i < unique.length; i += 100) chunks.push(unique.slice(i, i + 100));

  // Fetch all batches in parallel
  const batchResults = await Promise.all(
    chunks.map(async (chunk) => {
      const query = encodeURIComponent(chunk.join(','));
      const res = await fetchSpotify(`/v1/audio-features?ids=${query}`);
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`spotify_audio_features_failed:${res.status} ${text}`);
      }
      const data = (await res.json()) as { audio_features: Array<any | null> };
      return (data.audio_features || []).filter(Boolean) as Array<{
        id: string;
        key?: number | null;
        mode?: number | null;
        tempo?: number | null;
      }>;
    }),
  );

  // Index by id
  const byId = new Map<string, TrackKeyTempo>();
  for (const list of batchResults) {
    for (const f of list) {
      if (!f?.id) continue;
      const keyName = readableKeyFromSpotify(f.key ?? null, f.mode ?? null);
      const tempo =
        typeof f.tempo === 'number' && isFinite(f.tempo) ? Math.round(f.tempo) : undefined;
      byId.set(f.id, { id: f.id, key: keyName, tempo });
    }
  }

  // Build aligned output
  return ids.map((id) => byId.get(id) || { id });
}
