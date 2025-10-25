import { NextResponse } from 'next/server';
import { v4 as uuid } from 'uuid';

import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { enrichKeyTempoStub } from '@/lib/enrich';
import { resolveSpotifyTrackUrl } from '@/lib/spotifyTrack';

function norm(s: string) {
  return s.trim().toLowerCase();
}

// Accepts: { items: Array<{ title: string; artist: string; durationSec?: number; mbid?: string; isrc?: string }> }
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const targetProject = db.getProject(params.id, user.id);
  if (!targetProject) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

  let payload: {
    items?: Array<{
      title: string;
      artist: string;
      durationSec?: number;
      mbid?: string;
      isrc?: string;
    }>;
  } = {};
  try {
    payload = (await req.json()) as any;
  } catch {}
  const items = (payload.items || []).filter((x) => x && x.title && x.artist);
  if (items.length === 0) return NextResponse.json({ imported: 0, songs: [] });

  const existing = db.listSongs(targetProject.id);
  const existingKeys = new Set(existing.map((s) => `${norm(s.title)}::${norm(s.artist)}`));
  const settings = db.getSettings();
  const created: any[] = [];

  for (const it of items) {
    const key = `${norm(it.title)}::${norm(it.artist)}`;
    if (existingKeys.has(key)) continue;
    const now = new Date().toISOString();
    const newSong = {
      id: uuid(),
      projectId: targetProject.id,
      title: it.title,
      artist: it.artist,
      durationSec: it.durationSec,
      mbid: it.mbid,
      isrc: it.isrc,
      key: undefined as string | undefined,
      tempo: undefined as number | undefined,
      notes: undefined as string | undefined,
      url: undefined as string | undefined,
      createdAt: now,
      updatedAt: now,
    };

    // Optional key/tempo enrichment
    if (settings.enrichOnImport && settings.enrichmentMode === 'stub') {
      const e = enrichKeyTempoStub({
        title: newSong.title,
        artist: newSong.artist,
        mbid: newSong.mbid,
      });
      newSong.key = e.key;
      newSong.tempo = e.tempo;
    }

    // Try to resolve Spotify URL immediately
    try {
      const resolved = await resolveSpotifyTrackUrl({
        title: newSong.title,
        artist: newSong.artist,
        isrc: newSong.isrc,
      });
      if (resolved?.url) newSong.url = resolved.url;
    } catch {
      // ignore if auth/env missing; UI provides fallback search
    }

    db.createSong(newSong as any);
    existingKeys.add(key);
    created.push(newSong);
  }

  return NextResponse.json({ imported: created.length, songs: created }, { status: 200 });
}
