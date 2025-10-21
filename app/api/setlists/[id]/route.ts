import { NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { setlistUpdateSchema } from '@/lib/schemas';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const setlist = db.getSetlist(params.id);
  if (!setlist) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const project = db.getProject(setlist.projectId, user.id);
  if (!project) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return NextResponse.json(setlist);
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const existing = db.getSetlist(params.id);
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const project = db.getProject(existing.projectId, user.id);
  if (!project) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json();
  const parsed = setlistUpdateSchema.safeParse({ ...body, id: params.id });
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });

  const updated = {
    ...existing,
    ...('name' in parsed.data ? { name: parsed.data.name } : {}),
    ...('showArtist' in parsed.data ? { showArtist: parsed.data.showArtist } : {}),
    ...('showTransposedKey' in parsed.data
      ? { showTransposedKey: parsed.data.showTransposedKey }
      : {}),
    ...('items' in parsed.data ? { items: parsed.data.items } : {}),
    ...('date' in parsed.data ? { date: parsed.data.date } : {}),
    ...('venue' in parsed.data ? { venue: parsed.data.venue } : {}),
    ...('time' in parsed.data ? { time: parsed.data.time } : {}),
    ...('addGapAfterEachSong' in parsed.data
      ? { addGapAfterEachSong: parsed.data.addGapAfterEachSong }
      : {}),
    updatedAt: new Date().toISOString(),
  };
  db.updateSetlist(updated);
  return NextResponse.json(updated);
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const existing = db.getSetlist(params.id);
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const project = db.getProject(existing.projectId, user.id);
  if (!project) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  db.deleteSetlist(existing.id);
  return NextResponse.json({ ok: true });
}
