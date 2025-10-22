import { NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(req: Request) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const q = (url.searchParams.get('q') || '').toLowerCase();
  const artist = (url.searchParams.get('artist') || '').toLowerCase();

  const projects = db.listProjects(user.id);
  const songs = projects.flatMap((p) =>
    db
      .listSongs(p.id)
      .map((s) => ({ ...s, projectId: p.id, projectName: p.name }))
      .filter((s) => (q ? s.title.toLowerCase().includes(q) : true))
      .filter((s) => (artist ? s.artist.toLowerCase().includes(artist) : true)),
  );

  return NextResponse.json({ songs });
}
