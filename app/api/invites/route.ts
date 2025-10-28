import { NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET() {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const invites = db
    .listInvitesForEmail(user.email)
    .filter((i) => i.status === 'pending')
    .map((i) => {
      const project = db.getProjectById(i.projectId);
      const inviter = db.getUserById(i.invitedBy);
      return {
        id: i.id,
        token: i.token,
        projectId: i.projectId,
        projectName: project?.name ?? 'Project',
        invitedBy: inviter
          ? { id: inviter.id, email: inviter.email, name: (inviter as any).name }
          : null,
        role: i.role || 'bandMember',
        createdAt: i.createdAt,
      };
    });
  return NextResponse.json({ invites, count: invites.length });
}
