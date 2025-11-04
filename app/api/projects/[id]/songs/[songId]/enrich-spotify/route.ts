import { NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { getTracksKeyTempo } from '@/lib/spotifyAudio';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function extractSpotifyTrackId(url?: string | null): string | null {
  if (!url) return null;
  if (url.startsWith('spotify:track:')) return url.split(':')[2] || null;
  try {
    const u = new URL(url);
    if (u.hostname.includes('open.spotify.com')) {
      const parts = u.pathname.split('/').filter(Boolean);
      const idx = parts.findIndex((p) => p.toLowerCase() === 'track');
      if (idx !== -1 && parts[idx + 1]) return parts[idx + 1].split('?')[0];
    }
  } catch {}
  return null;
}

export async function POST(_req: Request, { params }: { params: { id: string; songId: string } }) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const project = db.getProject(params.id, user.id);
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  const song = db.listSongs(project.id).find((s) => s.id === params.songId);
  if (!song) return NextResponse.json({ error: 'Song not found' }, { status: 404 });

  const trackId = extractSpotifyTrackId(song.url);
  if (!trackId) return NextResponse.json({ error: 'No Spotify track linked' }, { status: 400 });

  try {
    const [res] = await getTracksKeyTempo([trackId]);
    if (!res) return NextResponse.json({ updated: false }, { status: 404 });
    const next = { ...song, key: res.key || song.key, updatedAt: new Date().toISOString() } as any;
    db.updateSong(next);
    return NextResponse.json({ updated: true, key: res.key, song: next });
  } catch (e: any) {
    const msg = String(e?.message || e);
    if (msg.includes('spotify_auth_required') || msg.includes('auth_required')) {
      return NextResponse.json({ error: 'Spotify auth required' }, { status: 401 });
    }
    if (msg.startsWith('spotify_env_missing')) {
      return NextResponse.json({ error: msg }, { status: 500 });
    }
    return NextResponse.json({ error: 'Enrich failed' }, { status: 500 });
  }
}
