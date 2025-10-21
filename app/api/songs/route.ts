import { NextResponse } from 'next/server';
import { v4 as uuid } from 'uuid';

import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
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
    createdAt: now,
    updatedAt: now,
  };
  db.createSong(song);
  return NextResponse.json(song, { status: 201 });
}
