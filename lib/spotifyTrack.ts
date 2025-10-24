import { fetchSpotify } from './spotifyAuth';

type TrackItem = {
  id: string;
  external_urls?: { spotify?: string };
};

export async function findSpotifyTrackByISRC(isrc: string): Promise<TrackItem | null> {
  const q = `isrc:${isrc}`;
  const params = new URLSearchParams({ q, type: 'track', limit: '1' });
  const res = await fetchSpotify(`/v1/search?${params.toString()}`, { method: 'GET' });
  if (!res.ok) return null;
  const json = await res.json().catch(() => ({}));
  const item = json?.tracks?.items?.[0];
  return item || null;
}

export async function findSpotifyTrackByQuery(
  title: string,
  artist: string,
): Promise<TrackItem | null> {
  const q = `track:${title} artist:${artist}`;
  const params = new URLSearchParams({ q, type: 'track', limit: '1' });
  const res = await fetchSpotify(`/v1/search?${params.toString()}`, { method: 'GET' });
  if (!res.ok) return null;
  const json = await res.json().catch(() => ({}));
  const item = json?.tracks?.items?.[0];
  return item || null;
}

export async function resolveSpotifyTrackUrl(opts: {
  title: string;
  artist: string;
  isrc?: string;
}): Promise<{ id: string; url: string } | null> {
  // Prefer ISRC for exactness
  if (opts.isrc) {
    const byIsrc = await findSpotifyTrackByISRC(opts.isrc);
    if (byIsrc?.id) {
      return {
        id: byIsrc.id,
        url: byIsrc.external_urls?.spotify || `https://open.spotify.com/track/${byIsrc.id}`,
      };
    }
  }
  // Fallback to title+artist search
  const byQuery = await findSpotifyTrackByQuery(opts.title, opts.artist);
  if (byQuery?.id) {
    return {
      id: byQuery.id,
      url: byQuery.external_urls?.spotify || `https://open.spotify.com/track/${byQuery.id}`,
    };
  }
  return null;
}
