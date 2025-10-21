import { NextResponse } from 'next/server';
import { v4 as uuid } from 'uuid';

import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { setlistCreateSchema } from '@/lib/schemas';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const project = db.getProject(params.id, user.id);
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  const setlists = db.listSetlists(project.id);
  return NextResponse.json({ setlists });
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const project = db.getProject(params.id, user.id);
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

  const body = await request.json();
  const parsed = setlistCreateSchema.safeParse({ ...body, projectId: params.id });
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });

  const now = new Date().toISOString();
  const items = (parsed.data.items || []).map((it, idx) => ({
    id: it.id ?? uuid(),
    type: it.type,
    order: it.order ?? idx,
    songId: it.songId,
    title: it.title,
    artist: it.artist,
    durationSec: it.durationSec,
    note: it.note,
  }));
  const setlist = {
    id: uuid(),
    projectId: project.id,
    name: parsed.data.name,
    showArtist: parsed.data.showArtist ?? true,
    date: parsed.data.date,
    venue: parsed.data.venue,
    addGapAfterEachSong: parsed.data.addGapAfterEachSong ?? false,
    items,
    createdAt: now,
    updatedAt: now,
  };
  db.createSetlist(setlist);
  return NextResponse.json(setlist, { status: 201 });
}
