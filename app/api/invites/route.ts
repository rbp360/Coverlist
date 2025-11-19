import { NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

// Disable caching and ensure dynamic evaluation
export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
  return new NextResponse(JSON.stringify({ invites, count: invites.length }), {
    status: 200,
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}
