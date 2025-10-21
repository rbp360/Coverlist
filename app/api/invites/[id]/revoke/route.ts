import { NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const invite = db.getInviteById(params.id);
  if (!invite) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const project = db.getProject(invite.projectId, user.id);
  if (!project || project.ownerId !== user.id)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  db.updateInvite({ ...invite, status: 'revoked', updatedAt: new Date().toISOString() } as any);
  return NextResponse.json({ ok: true });
}
