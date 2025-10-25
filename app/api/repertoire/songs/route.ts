import { NextResponse } from 'next/server';
import { v4 as uuid } from 'uuid';

import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { resolveSpotifyTrackUrl } from '@/lib/spotifyTrack';

export async function GET(req: Request) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const q = (url.searchParams.get('q') || '').toLowerCase();
  const artist = (url.searchParams.get('artist') || '').toLowerCase();

  // Songs from projects
  const projects = db.listProjects(user.id);
  const projectSongs = projects.flatMap((p) =>
    db
      .listSongs(p.id)
      .map((s) => ({ ...s, projectId: p.id, projectName: p.name }))
      .filter((s) => (q ? s.title.toLowerCase().includes(q) : true))
      .filter((s) => (artist ? s.artist.toLowerCase().includes(artist) : true)),
  );

  // Songs from the user's global repertoire
  const rep = db
    .listRepertoire(user.id)
    .filter((s) => (q ? s.title.toLowerCase().includes(q) : true))
    .filter((s) => (artist ? s.artist.toLowerCase().includes(artist) : true))
    .map((s) => ({
      ...s,
      projectId: '',
      projectName: '(Repertoire)',
    }));

  const songs = [...rep, ...projectSongs];

  return NextResponse.json({ songs });
}

export async function POST(req: Request) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  let json: any = {};
  try {
    json = await req.json();
  } catch {}
  const title = String(json?.title || '').trim();
  const artist = String(json?.artist || '').trim();
  if (!title || !artist) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  const now = new Date().toISOString();
  const song = {
    id: uuid(),
    userId: user.id,
    title,
    artist,
    durationSec: json?.durationSec as number | undefined,
    mbid: json?.mbid as string | undefined,
    isrc: json?.isrc as string | undefined,
    key: undefined as string | undefined,
    tempo: undefined as number | undefined,
    notes: undefined as string | undefined,
    url: undefined as string | undefined,
    createdAt: now,
    updatedAt: now,
  };
  // Try to resolve a Spotify URL immediately
  try {
    const resolved = await resolveSpotifyTrackUrl({
      title: song.title,
      artist: song.artist,
      isrc: song.isrc,
    });
    if (resolved?.url) song.url = resolved.url;
  } catch {
    // If Spotify auth/env missing, ignore; UI still provides a search option
  }
  db.createRepertoireSong(song as any);
  return NextResponse.json(song, { status: 201 });
}
