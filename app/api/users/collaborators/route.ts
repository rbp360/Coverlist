import { NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET() {
  const me = getCurrentUser();
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const projects = db.listProjects(me.id);
  const userIds = new Set<string>();
  projects.forEach((p) => {
    userIds.add(p.ownerId);
    p.memberIds.forEach((m) => userIds.add(m));
  });
  userIds.delete(me.id);
  const collaborators = Array.from(userIds)
    .map((id) => db.getUserById(id))
    .filter(Boolean)
    .map((u) => ({
      id: u!.id,
      email: u!.email,
      name: (u as any).name,
      username: (u as any).username,
      avatarUrl: (u as any).avatarUrl,
      instruments: (u as any).instruments || [],
    }));
  return NextResponse.json({ results: collaborators });
}
