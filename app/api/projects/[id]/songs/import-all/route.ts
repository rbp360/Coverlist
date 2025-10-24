import { NextResponse } from 'next/server';
import { v4 as uuid } from 'uuid';

import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { enrichKeyTempoStub, enrichKeyTempoGetSong } from '@/lib/enrich';

function norm(s: string) {
  return s.trim().toLowerCase();
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const targetProject = db.getProject(params.id, user.id);
  if (!targetProject) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

  // Collect existing keys in target project to avoid duplicates
  const existing = db.listSongs(targetProject.id);
  const existingKeys = new Set(existing.map((s) => `${norm(s.title)}::${norm(s.artist)}`));

  // Gather all songs across user's accessible projects
  const userProjects = db.listProjects(user.id);

  // Build unique source songs by title+artist across all projects (excluding target)
  const seenSourceKeys = new Set<string>();
  const sourceSongs = userProjects
    .filter((p) => p.id !== targetProject.id)
    .flatMap((p) => db.listSongs(p.id))
    .filter((s) => {
      const key = `${norm(s.title)}::${norm(s.artist)}`;
      if (seenSourceKeys.has(key)) return false;
      seenSourceKeys.add(key);
      return true;
    });

  const settings = db.getSettings();
  const created: any[] = [];

  for (const s of sourceSongs) {
    const key = `${norm(s.title)}::${norm(s.artist)}`;
    if (existingKeys.has(key)) continue; // skip duplicates in target project

    const now = new Date().toISOString();
    const newSong = {
      id: uuid(),
      projectId: targetProject.id,
      title: s.title,
      artist: s.artist,
      durationSec: s.durationSec,
      mbid: s.mbid,
      isrc: s.isrc,
      // Intentionally do not copy transposedKey as it may be project-specific
      key: s.key,
      tempo: s.tempo,
      notes: s.notes,
      url: s.url,
      createdAt: now,
      updatedAt: now,
    };

    // Optionally enrich on import if configured
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
    existingKeys.add(key);
    created.push(newSong);
  }

  return NextResponse.json({ imported: created.length, songs: created }, { status: 200 });
}
