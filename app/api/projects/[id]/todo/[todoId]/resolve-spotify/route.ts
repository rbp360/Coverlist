import { NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { resolveSpotifyTrackUrl } from '@/lib/spotifyTrack';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(_req: Request, { params }: { params: { id: string; todoId: string } }) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const project = db.getProject(params.id, user.id);
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  const item = db.getProjectTodoById(project.id, params.todoId);
  if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 });

  try {
    const resolved = await resolveSpotifyTrackUrl({
      title: item.title,
      artist: item.artist,
      isrc: item.isrc,
    });
    if (!resolved) return NextResponse.json({ found: false }, { status: 404 });
    const updated = db.updateProjectTodo(project.id, item.id, { url: resolved.url });
    return NextResponse.json({ found: true, url: resolved.url, item: updated });
  } catch (e: any) {
    const msg = String(e?.message || e);
    if (msg.includes('spotify_auth_required') || msg.includes('auth_required')) {
      return NextResponse.json({ error: 'Spotify auth required' }, { status: 401 });
    }
    if (msg.startsWith('spotify_env_missing')) {
      return NextResponse.json({ error: msg }, { status: 500 });
    }
    return NextResponse.json({ error: 'Resolve failed' }, { status: 500 });
  }
}
