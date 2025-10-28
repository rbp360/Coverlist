import { NextResponse } from 'next/server';
import { v4 as uuid } from 'uuid';

import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const project = db.getProject(params.id, user.id);
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  const items = db.listProjectTodo(project.id);
  return NextResponse.json({ items });
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const project = db.getProject(params.id, user.id);
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

  let payload: any = {};
  try {
    payload = await req.json();
  } catch {}

  const now = new Date().toISOString();

  const normalizeOne = (x: any) => {
    const title = String(x?.title || '').trim();
    const artist = String(x?.artist || '').trim();
    if (!title || !artist) return null;
    return {
      id: uuid(),
      projectId: project.id,
      title,
      artist,
      durationSec: x?.durationSec as number | undefined,
      mbid: x?.mbid as string | undefined,
      isrc: x?.isrc as string | undefined,
      suggestedBy: user.id,
      notes: x?.notes as string | undefined,
      createdAt: now,
    };
  };

  // Support one or many
  if (Array.isArray(payload?.items)) {
    const items = payload.items.map(normalizeOne).filter(Boolean) as any[];
    for (const it of items) db.addProjectTodo(it);
    return NextResponse.json({ added: items.length }, { status: 201 });
  }

  const one = normalizeOne(payload);
  if (!one) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  db.addProjectTodo(one as any);
  return NextResponse.json(one, { status: 201 });
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const project = db.getProject(params.id, user.id);
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  let payload: any = {};
  try {
    payload = await req.json();
  } catch {}
  const itemId = String(payload?.id || '').trim();
  if (!itemId) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  db.deleteProjectTodo(project.id, itemId);
  return NextResponse.json({ deleted: true });
}
