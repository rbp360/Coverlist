import { NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { resolveSpotifyTrackUrl } from '@/lib/spotifyTrack';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const project = db.getProject(params.id, user.id);
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

  const songs = db.listSongs(project.id);
  const updated: Array<{ songId: string; url: string }> = [];
  const skipped: string[] = [];
  const errors: Array<{ songId: string; error: string }> = [];

  for (const s of songs) {
    if (s.url) {
      skipped.push(s.id);
      continue;
    }
    try {
      const resolved = await resolveSpotifyTrackUrl({
        title: s.title,
        artist: s.artist,
        isrc: s.isrc,
      });
      if (resolved) {
        const next = { ...s, url: resolved.url, updatedAt: new Date().toISOString() } as any;
        db.updateSong(next);
        updated.push({ songId: s.id, url: resolved.url });
      }
    } catch (e: any) {
      errors.push({ songId: s.id, error: String(e?.message || e) });
    }
  }

  return NextResponse.json({
    updatedCount: updated.length,
    updated,
    skippedCount: skipped.length,
    errors,
  });
}
