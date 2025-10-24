import { NextResponse } from 'next/server';
import { v4 as uuid } from 'uuid';

import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { enrichKeyTempoStub, enrichKeyTempoGetSong } from '@/lib/enrich';

function norm(s: string) {
  return s.trim().toLowerCase();
}

type ImportItem = { title: string; artist: string; mbid?: string };
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const targetProject = db.getProject(params.id, user.id);
  if (!targetProject) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

  let payload: { items?: ImportItem[] } = {};
  try {
    payload = (await req.json()) as any;
  } catch {
    // ignore
  }
  const items = (payload.items || []).filter((x) => x && x.title && x.artist);
  if (items.length === 0) return NextResponse.json({ imported: 0, songs: [] });

  // Collect existing keys in target project to avoid duplicates
  const existing = db.listSongs(targetProject.id);
  const existingKeys = new Set(existing.map((s) => `${norm(s.title)}::${norm(s.artist)}`));

  // Gather all songs across user's accessible projects (exclude target)
  const userProjects = db.listProjects(user.id).filter((p) => p.id !== targetProject.id);
  const sourceSongs = userProjects.flatMap((p) => db.listSongs(p.id));

  // Deduplicate requested items by identity
  const wanted = new Map<string, ImportItem>();
  for (const it of items) {
    const identity = it.mbid || `${norm(it.title)}::${norm(it.artist)}`;
    if (!wanted.has(identity)) wanted.set(identity, it);
  }

  const settings = db.getSettings();
  const created: any[] = [];

  for (const [identity, it] of wanted) {
    // Find a source song by mbid if provided, else by normalized title+artist
    const candidate = it.mbid
      ? sourceSongs.find((s) => s.mbid && s.mbid === it.mbid)
      : sourceSongs.find(
          (s) => `${norm(s.title)}::${norm(s.artist)}` === `${norm(it.title)}::${norm(it.artist)}`,
        );
    if (!candidate) continue;

    const targetKey = `${norm(candidate.title)}::${norm(candidate.artist)}`;
    if (existingKeys.has(targetKey)) continue;

    const now = new Date().toISOString();
    const newSong = {
      id: uuid(),
      projectId: targetProject.id,
      title: candidate.title,
      artist: candidate.artist,
      durationSec: candidate.durationSec,
      mbid: candidate.mbid,
      key: candidate.key,
      tempo: candidate.tempo,
      notes: candidate.notes,
      url: candidate.url,
      createdAt: now,
      updatedAt: now,
    };

    if ((!newSong.key || !newSong.tempo) && settings.enrichOnImport) {
      if (settings.enrichmentMode === 'stub') {
        const e = enrichKeyTempoStub({
          title: newSong.title,
          artist: newSong.artist,
          mbid: newSong.mbid,
        });
        newSong.key = newSong.key ?? e.key;
        newSong.tempo = newSong.tempo ?? e.tempo;
      } else if (settings.enrichmentMode === 'getSong') {
        try {
          const e = await enrichKeyTempoGetSong({
            title: newSong.title,
            artist: newSong.artist,
            mbid: newSong.mbid,
          });
          newSong.key = newSong.key ?? e.key;
          newSong.tempo = newSong.tempo ?? e.tempo;
        } catch {
          // ignore errors
        }
      }
    }

    db.createSong(newSong as any);
    existingKeys.add(targetKey);
    created.push(newSong);
  }

  return NextResponse.json({ imported: created.length, songs: created }, { status: 200 });
}
