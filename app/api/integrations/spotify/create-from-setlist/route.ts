import { NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { ensureTrackUris, createPlaylist, addTracks } from '@/lib/spotifyPlaylist';

export async function POST(req: Request) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  let body: any = {};
  try {
    body = await req.json();
  } catch {}
  const setlistId = String(body?.setlistId || '').trim();
  if (!setlistId) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });

  const setlist = db.getSetlist(setlistId);
  if (!setlist) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const project = db.getProject(setlist.projectId, user.id);
  if (!project) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // Build name as "Project name - setlist title - date"
  const date = setlist.date || new Date().toISOString().slice(0, 10);
  const name = `${project.name} - ${setlist.name} - ${date}`;

  // Collect songs
  const songs = (setlist.items || [])
    .filter((it) => it.type === 'song' && it.songId)
    .map((it) => db.listSongs(project.id).find((s) => s.id === it.songId))
    .filter(Boolean)
    .map((s) => ({ title: s!.title, artist: s!.artist }));

  if (songs.length === 0)
    return NextResponse.json({ error: 'No songs in setlist' }, { status: 400 });

  try {
    const uris = await ensureTrackUris(songs);
    const { id: playlistId, url } = await createPlaylist(
      name,
      `Created from setlist ${setlist.name}`,
    );
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
