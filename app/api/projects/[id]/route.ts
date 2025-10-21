import { NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const project = db.getProject(params.id, user.id);
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  return NextResponse.json(project);
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const current = db.getProject(params.id, user.id);
  if (!current) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  const body = await req.json().catch(() => ({}));
  const nextName = typeof body.name === 'string' ? String(body.name).trim() : undefined;
  if (!nextName || nextName.length === 0)
    return NextResponse.json({ error: 'Invalid name' }, { status: 400 });
  const updated = { ...current, name: nextName };
  db.updateProject(updated);
  return NextResponse.json(updated);
}
