import { fetchSpotify } from './spotifyAuth';

export type PlaylistSongInput = {
  title: string;
  artist: string;
  spotifyId?: string; // if provided, we skip search
};

export async function ensureTrackUris(songs: PlaylistSongInput[]): Promise<string[]> {
  const uris: string[] = [];
  for (const s of songs) {
    if (s.spotifyId) {
      uris.push(`spotify:track:${s.spotifyId}`);
      continue;
    }
    const q = `track:${s.title} artist:${s.artist}`;
    const params = new URLSearchParams({ q, type: 'track', limit: '1' });
    const res = await fetchSpotify(`/v1/search?${params.toString()}`, { method: 'GET' });
    if (!res.ok) continue;
    const json = await res.json();
    const item = json?.tracks?.items?.[0];
    if (item?.uri) uris.push(item.uri);
  }
  return uris;
}

export async function createPlaylist(
  name: string,
  description = '',
): Promise<{ id: string; url: string }> {
  // Get current user id
  const meRes = await fetchSpotify('/v1/me', { method: 'GET' });
  if (!meRes.ok) throw new Error('failed_me');
  const me = await meRes.json();
  const userId = me.id as string;

  const body = { name, description, public: false }; // default private; user can toggle later
  const createRes = await fetchSpotify(`/v1/users/${encodeURIComponent(userId)}/playlists`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  if (!createRes.ok) {
    const t = await createRes.text();
    throw new Error(`failed_create:${createRes.status}:${t}`);
  }
  const created = await createRes.json();
  return {
    id: created.id,
    url: created.external_urls?.spotify || `https://open.spotify.com/playlist/${created.id}`,
  };
}

export async function addTracks(playlistId: string, uris: string[]): Promise<void> {
  // Spotify limits to 100 items per request
  for (let i = 0; i < uris.length; i += 100) {
    const chunk = uris.slice(i, i + 100);
    const res = await fetchSpotify(`/v1/playlists/${encodeURIComponent(playlistId)}/tracks`, {
      method: 'POST',
      body: JSON.stringify({ uris: chunk }),
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`failed_add:${res.status}:${t}`);
    }
  }
}
