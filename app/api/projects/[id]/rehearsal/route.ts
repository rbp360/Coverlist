import { NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { rehearsalUpdateSchema } from '@/lib/schemas';

import type { PracticeEntry } from '@/lib/types';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const project = db.getProject(params.id, user.id);
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  const entries = db.listPracticeForUser(project.id, user.id);
  return NextResponse.json({ entries });
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const project = db.getProject(params.id, user.id);
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  const role = db.getProjectRole(project.id, user.id);
  const json = await req.json().catch(() => ({}));
  const parsed = rehearsalUpdateSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  const { songId, passes, rating, lastRehearsed } = parsed.data;
  // Ensure song belongs to this project
  const song = db.listSongs(project.id).find((s) => s.id === songId);
  if (!song) return NextResponse.json({ error: 'Song not found' }, { status: 404 });
  // Enforce: only bandLeader may change rating; others can update passes/lastRehearsed
  const patch: Partial<Pick<PracticeEntry, 'passes' | 'rating' | 'lastRehearsed'>> = {
    passes,
    lastRehearsed,
  };
  if (role === 'bandLeader' && rating != null) {
    patch.rating = rating as PracticeEntry['rating'];
  }
  if (role !== 'bandLeader' && rating != null) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const updated = db.upsertPractice(project.id, songId, user.id, patch);

  // Ensure song is in the project's main repertoire (songs)
  let projectSong = db.listSongs(project.id).find((s) => s.id === songId);
  if (!projectSong) {
    // Try to find by title+artist from the todo list (if available)
    const todoItem = (db.listProjectTodo?.(project.id) || []).find((t) => t.id === songId);
    if (todoItem) {
      // Add to project songs
      const now = new Date().toISOString();
      projectSong = {
        id: todoItem.id,
        projectId: project.id,
        title: todoItem.title,
        artist: todoItem.artist,
        durationSec: todoItem.durationSec,
        mbid: todoItem.mbid,
        isrc: todoItem.isrc,
        key: undefined,
        tempo: undefined,
        transposedKey: undefined,
        notes: todoItem.notes,
        url: undefined,
        createdAt: now,
        updatedAt: now,
      };
      db.createSong(projectSong);
    }
  }

  // Also ensure song is in each member's individual repertoire
  if (projectSong) {
    const memberIds = [project.ownerId, ...(project.memberIds || [])];
    for (const uid of memberIds) {
      const rep = db.listRepertoire(uid);
      const exists = rep.some(
        (s) =>
          s.title.trim().toLowerCase() === projectSong.title.trim().toLowerCase() &&
          s.artist.trim().toLowerCase() === projectSong.artist.trim().toLowerCase(),
      );
      if (!exists) {
        db.createRepertoireSong({
          id: projectSong.id, // use same id for traceability
          userId: uid,
          title: projectSong.title,
          artist: projectSong.artist,
          durationSec: projectSong.durationSec,
          mbid: projectSong.mbid,
          isrc: projectSong.isrc,
          key: projectSong.key,
          tempo: projectSong.tempo,
          notes: projectSong.notes,
          url: projectSong.url,
          createdAt: projectSong.createdAt,
          updatedAt: projectSong.updatedAt,
        });
      }
    }
  }
  return NextResponse.json(updated);
}
