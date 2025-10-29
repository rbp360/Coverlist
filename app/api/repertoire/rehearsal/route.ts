import { NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { rehearsalUpdateSchema } from '@/lib/schemas';

export async function GET() {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const entries = db.listPersonalPracticeForUser(user.id);
  return NextResponse.json({ entries });
}

export async function PUT(req: Request) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const json = await req.json().catch(() => ({}));
  const parsed = rehearsalUpdateSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  const { songId, passes, rating, lastRehearsed } = parsed.data;
  // Allow any song the user can play (in their repertoire or in a project they are a member of)
  const inRepertoire = db.listRepertoire(user.id).some((s) => s.id === songId);
  const inProjects = db
    .listProjects(user.id)
    .some((p) => db.listSongs(p.id).some((s) => s.id === songId));
  if (!inRepertoire && !inProjects)
    return NextResponse.json({ error: 'Song not found' }, { status: 404 });
  const updated = db.upsertPersonalPractice(songId, user.id, {
    passes,
    rating: rating as any,
    lastRehearsed,
  });
  return NextResponse.json(updated);
}
