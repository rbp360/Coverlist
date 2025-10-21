import { NextResponse } from 'next/server';

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
