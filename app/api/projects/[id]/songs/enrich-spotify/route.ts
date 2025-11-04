import { NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { getTracksKeyTempo } from '@/lib/spotifyAudio';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function extractSpotifyTrackId(url?: string | null): string | null {
  if (!url) return null;
  // spotify:track:ID
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

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const project = db.getProject(params.id, user.id);
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

  const songs = db.listSongs(project.id);
  const candidates = songs
    .map((s) => ({ song: s, trackId: extractSpotifyTrackId(s.url) }))
    .filter((x): x is { song: (typeof songs)[number]; trackId: string } => !!x.trackId);

  if (candidates.length === 0) {
    return NextResponse.json({ updatedCount: 0, updated: [], skippedCount: songs.length });
  }

  try {
    const ids = candidates.map((c) => c.trackId);
    const keyResults = await getTracksKeyTempo(ids);
    const byId = new Map(keyResults.map((r) => [r.id, r] as const));

    const updated: Array<{ songId: string; key?: string }> = [];
    for (const { song, trackId } of candidates) {
      const res = byId.get(trackId);
      if (!res) continue;
      const next = {
        ...song,
        key: res.key || song.key,
        updatedAt: new Date().toISOString(),
      } as any;
      db.updateSong(next);
      updated.push({ songId: song.id, key: res.key });
    }

    return NextResponse.json({ updatedCount: updated.length, updated });
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
