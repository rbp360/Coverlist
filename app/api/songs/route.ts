import { NextResponse } from 'next/server';
import { v4 as uuid } from 'uuid';

import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { enrichKeyTempoStub, enrichKeyTempoGetSong } from '@/lib/enrich';
import { songImportSchema } from '@/lib/schemas';

export async function POST(request: Request) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const json = await request.json();
  const parsed = songImportSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  const project = db.getProject(parsed.data.projectId, user.id);
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  const now = new Date().toISOString();
  const song = {
    id: uuid(),
    projectId: project.id,
    title: parsed.data.title,
    artist: parsed.data.artist,
    durationSec: parsed.data.durationSec,
    mbid: parsed.data.mbid,
    key: undefined as string | undefined,
    tempo: undefined as number | undefined,
    createdAt: now,
    updatedAt: now,
  };
  const settings = db.getSettings();
  if (settings.enrichOnImport && settings.enrichmentMode === 'stub') {
    const enriched = enrichKeyTempoStub({
      title: song.title,
      artist: song.artist,
      mbid: song.mbid,
    });
    song.key = enriched.key;
    song.tempo = enriched.tempo;
  } else if (settings.enrichOnImport && settings.enrichmentMode === 'getSong') {
    try {
      const enriched = await enrichKeyTempoGetSong({
        title: song.title,
        artist: song.artist,
        mbid: song.mbid,
      });
      song.key = enriched.key ?? song.key;
      song.tempo = enriched.tempo ?? song.tempo;
    } catch {
      // ignore API errors on import
    }
  }
  db.createSong(song);
  return NextResponse.json(song, { status: 201 });
}

export async function PUT(request: Request) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const json = await request.json();
  const { id: songId } = json || {};
  if (!songId) return NextResponse.json({ error: 'Missing song id' }, { status: 400 });
  // This endpoint enriches a single song by ID, used when we don't want to go through project scoping
  // For safety, keep behavior minimal and rely on project-scoped update for most edits.
  const songs = (db as any).listSongs ? (db as any).listSongs : null;
  if (!songs) return NextResponse.json({ error: 'Unsupported operation' }, { status: 400 });
  // We need to scan all projects' songs; db.listSongs requires projectId, so skip this for now.
  return NextResponse.json({ error: 'Not implemented' }, { status: 400 });
}
