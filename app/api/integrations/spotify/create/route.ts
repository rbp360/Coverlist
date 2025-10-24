import { NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth';
import { fetchSpotify } from '@/lib/spotifyAuth';
import { addTracks, createPlaylist, ensureTrackUris } from '@/lib/spotifyPlaylist';

export async function POST(req: Request) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  let body: any = {};
  try {
    body = await req.json();
  } catch {}
  const name = String(body?.name || '').trim();
  const description = String(body?.description || '').trim();
  const songs = Array.isArray(body?.songs) ? body.songs : [];
  if (!name || songs.length === 0)
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });

  try {
    const uris = await ensureTrackUris(songs);
    const { id: playlistId, url } = await createPlaylist(name, description);
    if (uris.length > 0) await addTracks(playlistId, uris);
    return NextResponse.json({ id: playlistId, url });
  } catch (e: any) {
    const msg = e?.message || 'unknown_error';
    if (msg.includes('auth_required') || msg.includes('spotify_auth_required')) {
      return NextResponse.json({ error: 'spotify_auth_required' }, { status: 401 });
    }
    return NextResponse.json({ error: 'create_failed', detail: msg }, { status: 500 });
  }
}
