import { NextResponse } from 'next/server';
import { v4 as uuid } from 'uuid';

import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const project = db.getProject(params.id, user.id);
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  const invites = db.listInvites(project.id);
  return NextResponse.json({ invites });
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const project = db.getProject(params.id, user.id);
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  // Allow owner or existing members to invite
  if (!(project.ownerId === user.id || project.memberIds.includes(user.id)))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { email, role } = await req.json();
  if (!email || typeof email !== 'string')
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
  // Validate role (optional; default to 'bandMember')
  const allowedRoles = ['bandMember', 'setlistViewer'] as const;
  const inviteRole = allowedRoles.includes(role) ? role : 'bandMember';
  const now = new Date().toISOString();
  const invite = {
    id: uuid(),
    projectId: project.id,
    email: email.toLowerCase(),
    token: uuid(),
    status: 'pending' as const,
    invitedBy: user.id,
    createdAt: now,
    updatedAt: now,
    role: inviteRole,
  };
  db.createInvite(invite);
  return NextResponse.json(invite, { status: 201 });
}
