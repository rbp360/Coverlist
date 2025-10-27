import { NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { rehearsalUpdateSchema } from '@/lib/schemas';

import type { PracticeEntry } from '@/lib/types';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const project = db.getProject(params.id, user.id);
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  const entries = db.listPracticeForUser(project.id, user.id);
  return NextResponse.json({ entries });
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const project = db.getProject(params.id, user.id);
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  const role = db.getProjectRole(project.id, user.id);
  const json = await req.json().catch(() => ({}));
  const parsed = rehearsalUpdateSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  const { songId, passes, rating, lastRehearsed } = parsed.data;
  // Ensure song belongs to this project
  const song = db.listSongs(project.id).find((s) => s.id === songId);
  if (!song) return NextResponse.json({ error: 'Song not found' }, { status: 404 });
  // Enforce: only bandLeader may change rating; others can update passes/lastRehearsed
  const patch: Partial<Pick<PracticeEntry, 'passes' | 'rating' | 'lastRehearsed'>> = {
    passes,
    lastRehearsed,
  };
  if (role === 'bandLeader' && rating != null) {
    patch.rating = rating as PracticeEntry['rating'];
  }
  if (role !== 'bandLeader' && rating != null) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const updated = db.upsertPractice(project.id, songId, user.id, patch);
  return NextResponse.json(updated);
}
