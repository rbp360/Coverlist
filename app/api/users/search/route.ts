import { NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  const me = getCurrentUser();
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const url = new URL(request.url);
  const q = (url.searchParams.get('q') || '').toLowerCase().trim();
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20', 10) || 20, 50);

  const people = db
    .listUsers()
    .filter((u) => u.id !== me.id)
    .filter((u) =>
      q
        ? (u.username || '').toLowerCase().includes(q) ||
          (u.name || '').toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          (u.instruments || []).some((inst) => inst.toLowerCase().includes(q))
        : true,
    )
    .slice(0, limit)
    .map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      username: u.username,
      avatarUrl: u.avatarUrl,
      instruments: u.instruments || [],
    }));
  return NextResponse.json({ results: people });
}
