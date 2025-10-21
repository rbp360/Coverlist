import { NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

export async function POST(req: Request) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { token } = await req.json();
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 });
  const invite = db.getInviteByToken(token);
  if (!invite || invite.status !== 'pending')
    return NextResponse.json({ error: 'Invalid invite' }, { status: 400 });
  // add member
  db.addProjectMember(invite.projectId, user.id);
  // mark accepted
  db.updateInvite({ ...invite, status: 'accepted', updatedAt: new Date().toISOString() } as any);
  return NextResponse.json({ ok: true });
}
