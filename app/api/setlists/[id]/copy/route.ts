import { NextResponse } from 'next/server';
import { v4 as uuid } from 'uuid';

import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const source = db.getSetlist(params.id);
  if (!source) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const project = db.getProject(source.projectId, user.id);
  if (!project) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const now = new Date().toISOString();
  const newId = uuid();
  const copied = {
    id: newId,
    projectId: source.projectId,
    name: `${source.name} (Copy)`,
    showArtist: source.showArtist,
    items: (source.items || []).map((it, idx) => ({
      id: uuid(),
      type: it.type,
      order: idx,
      songId: it.songId,
      title: it.title,
      artist: it.artist,
      durationSec: it.durationSec,
      note: it.note,
    })),
    createdAt: now,
    updatedAt: now,
  };
  db.createSetlist(copied);
  return NextResponse.json(copied, { status: 201 });
}
