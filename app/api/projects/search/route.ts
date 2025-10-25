import { NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const url = new URL(request.url);
  const q = (url.searchParams.get('q') || '').toLowerCase().trim();
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20', 10) || 20, 50);

  // Since db.listProjects returns only user's projects, we need a direct read of all projects.
  // Expose a tiny internal-only scan: get all projects by scanning listUsers + project membership.
  const everyone = db.listUsers();
  const projectIdSet = new Set<string>();
  const aggregated: any[] = [];
  // Collect all projects from each user's perspective (owner/member)
  everyone.forEach((u) => {
    const ps = db.listProjects(u.id);
    ps.forEach((p) => {
      if (!projectIdSet.has(p.id)) {
        projectIdSet.add(p.id);
        aggregated.push(p);
      }
    });
  });

  const filtered = aggregated
    .filter((p) => (q ? p.name.toLowerCase().includes(q) : true))
    .slice(0, limit)
    .map((p) => {
      const owner = db.getUserById(p.ownerId);
      const mine = p.ownerId === user.id || p.memberIds.includes(user.id);
      const existing = db.getJoinRequestByProjectAndUser(p.id, user.id);
      return {
        id: p.id,
        name: p.name,
        ownerName: owner?.name || owner?.email,
        memberCount: 1 + p.memberIds.length,
        isMember: mine,
        joinRequestStatus: existing?.status || null,
      };
    });

  return NextResponse.json({ results: filtered });
}
