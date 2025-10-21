import { NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { enrichKeyTempoStub } from '@/lib/enrich';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const project = db.getProject(params.id, user.id);
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  const { songId } = await req.json();
  if (!songId) return NextResponse.json({ error: 'Missing songId' }, { status: 400 });
  const song = db.listSongs(project.id).find((s) => s.id === songId);
  if (!song) return NextResponse.json({ error: 'Song not found' }, { status: 404 });
  const settings = db.getSettings();
  if (settings.enrichmentMode === 'stub') {
    const e = enrichKeyTempoStub({ title: song.title, artist: song.artist, mbid: song.mbid });
    const updated = { ...song, key: e.key, tempo: e.tempo, updatedAt: new Date().toISOString() };
    db.updateSong(updated);
    return NextResponse.json(updated);
  }
  return NextResponse.json({ error: 'Enrichment disabled' }, { status: 400 });
}
