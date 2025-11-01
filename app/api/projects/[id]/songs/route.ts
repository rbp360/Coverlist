import { NextResponse } from 'next/server';
import { v4 as uuid } from 'uuid';

import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const project = db.getProject(params.id, user.id);
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  const url = new URL(req.url);
  const q = (url.searchParams.get('q') || '').toLowerCase();
  const artist = (url.searchParams.get('artist') || '').toLowerCase();
  const songs = db
    .listSongs(project.id)
    .filter((s) => (q ? s.title.toLowerCase().includes(q) : true))
    .filter((s) => (artist ? s.artist.toLowerCase().includes(artist) : true));
  return NextResponse.json({ songs });
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const project = db.getProject(params.id, user.id);
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
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
    projectId: project.id,
    title,
    artist,
    durationSec: json?.durationSec as number | undefined,
    mbid: json?.mbid as string | undefined,
    isrc: json?.isrc as string | undefined,
    key: undefined as string | undefined,
    tempo: undefined as number | undefined,
    transposedKey: undefined as string | undefined,
    notes: json?.notes as string | undefined,
    url: json?.url as string | undefined,
    createdAt: now,
    updatedAt: now,
  };
  db.createSong(song as any);

  // Also add to each project member's individual repertoire if not already present
  // Get all project members (including owner)
  const memberIds = [project.ownerId, ...(project.memberIds || [])];
  for (const userId of memberIds) {
    // Check if song already in user's repertoire (by title+artist)
    const rep = db.listRepertoire(userId);
    const exists = rep.some(
      (s) =>
        s.title.trim().toLowerCase() === song.title.trim().toLowerCase() &&
        s.artist.trim().toLowerCase() === song.artist.trim().toLowerCase(),
    );
    if (!exists) {
      db.createRepertoireSong({
        id: uuid(),
        userId,
        title: song.title,
        artist: song.artist,
        durationSec: song.durationSec,
        mbid: song.mbid,
        isrc: song.isrc,
        key: song.key,
        tempo: song.tempo,
        notes: song.notes,
        url: song.url,
        createdAt: song.createdAt,
        updatedAt: song.updatedAt,
      });
    }
  }
  return NextResponse.json(song, { status: 201 });
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const project = db.getProject(params.id, user.id);
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  const payload = await req.json();
  const { id: songId, ...updates } = payload || {};
  if (!songId) return NextResponse.json({ error: 'Missing song id' }, { status: 400 });
  const song = db.listSongs(project.id).find((s) => s.id === songId);
  if (!song) return NextResponse.json({ error: 'Song not found' }, { status: 404 });
  const updated = { ...song, ...updates, updatedAt: new Date().toISOString() };
  db.updateSong(updated);
  return NextResponse.json(updated);
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const project = db.getProject(params.id, user.id);
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  let payload: any = {};
  try {
    payload = await req.json();
  } catch {
    // ignore
  }
  const { songId } = payload || {};
  if (!songId) return NextResponse.json({ error: 'Missing song id' }, { status: 400 });
  const song = db.listSongs(project.id).find((s) => s.id === songId);
  if (!song) return NextResponse.json({ error: 'Song not found' }, { status: 404 });
  db.deleteSong(songId);
  return NextResponse.json({ deleted: true });
}
