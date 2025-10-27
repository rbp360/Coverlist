import { NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { ProjectRoleNonOwner } from '@/lib/types';

export async function POST(req: Request) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { token } = await req.json();
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 });
  const invite = db.getInviteByToken(token);
  if (!invite || invite.status !== 'pending')
    return NextResponse.json({ error: 'Invalid invite' }, { status: 400 });
  // Determine invite role (default bandMember for legacy invites)
  const role: ProjectRoleNonOwner = (invite.role as ProjectRoleNonOwner) || 'bandMember';
  if (role === 'bandMember') {
    // add member to project
    db.addProjectMember(invite.projectId, user.id);
    db.setMemberRole(invite.projectId, user.id, 'bandMember');
  } else if (role === 'setlistViewer') {
    // Viewers are not project members; record role but do not add to memberIds
    db.setMemberRole(invite.projectId, user.id, 'setlistViewer');
  }
  // mark accepted
  db.updateInvite({ ...invite, status: 'accepted', updatedAt: new Date().toISOString() } as any);
  return NextResponse.json({ ok: true });
}
