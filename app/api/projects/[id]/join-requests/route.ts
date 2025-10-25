import { NextResponse } from 'next/server';
import { v4 as uuid } from 'uuid';

import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const project = db.getProjectById(params.id);
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  const list = db.listJoinRequestsForProject(project.id);
  return NextResponse.json({ requests: list });
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const project = db.getProjectById(params.id);
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  // If already a member, short-circuit
  if (project.ownerId === user.id || project.memberIds.includes(user.id)) {
    return NextResponse.json({ error: 'Already a member' }, { status: 400 });
  }
  const existing = db.getJoinRequestByProjectAndUser(project.id, user.id);
  if (existing && existing.status === 'pending') {
    return NextResponse.json(existing);
  }
  const body = await req.json().catch(() => ({}));
  const message = typeof body?.message === 'string' ? body.message.slice(0, 500) : undefined;
  const now = new Date().toISOString();
  const jr = {
    id: uuid(),
    projectId: project.id,
    userId: user.id,
    message,
    status: 'pending' as const,
    createdAt: now,
    updatedAt: now,
  };
  db.createJoinRequest(jr);
  return NextResponse.json(jr, { status: 201 });
}
