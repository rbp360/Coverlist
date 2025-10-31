import { NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { setlistUpdateSchema } from '@/lib/schemas';

import type { Setlist, SetlistItem } from '@/lib/types';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const setlist = db.getSetlist(params.id);
  if (!setlist) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const project = db.getProject(setlist.projectId, user.id);
  if (!project) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return NextResponse.json(setlist);
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const existing = db.getSetlist(params.id);
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const project = db.getProject(existing.projectId, user.id);
  if (!project) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const role = db.getProjectRole(project.id, user.id);

  const body = await request.json();
  const parsed = setlistUpdateSchema.safeParse({ ...body, id: params.id });
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });

  const updated = {
    ...existing,
    ...('name' in parsed.data ? { name: parsed.data.name } : {}),
    ...('showArtist' in parsed.data ? { showArtist: parsed.data.showArtist } : {}),
    ...('showKey' in parsed.data ? { showKey: parsed.data.showKey } : {}),
    ...('showTransposedKey' in parsed.data
      ? { showTransposedKey: parsed.data.showTransposedKey }
      : {}),
    ...('songGapSec' in parsed.data ? { songGapSec: parsed.data.songGapSec } : {}),
    ...('items' in parsed.data ? { items: parsed.data.items } : {}),
    ...('date' in parsed.data ? { date: parsed.data.date } : {}),
    ...('venue' in parsed.data ? { venue: parsed.data.venue } : {}),
    ...('time' in parsed.data ? { time: parsed.data.time } : {}),
    ...('addGapAfterEachSong' in parsed.data
      ? { addGapAfterEachSong: parsed.data.addGapAfterEachSong }
      : {}),
    ...('public' in parsed.data ? { public: parsed.data.public } : {}),
    ...('showNotesAfterLyrics' in parsed.data
      ? { showNotesAfterLyrics: parsed.data.showNotesAfterLyrics }
      : {}),
    ...('showColourFlip' in parsed.data ? { showColourFlip: parsed.data.showColourFlip } : {}),
    ...('showWhatWhere' in parsed.data ? { showWhatWhere: parsed.data.showWhatWhere } : {}),
    ...('showLiveClock' in parsed.data ? { showLiveClock: parsed.data.showLiveClock } : {}),
    updatedAt: new Date().toISOString(),
  };
  // Enforce role-based permissions
  if (role === 'bandMember') {
    // Members may only reorder existing items; no other field changes allowed
    const onlyItemsChanged = Object.keys(body).every((k) => k === 'items');
    if (!onlyItemsChanged) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const isReorderOnly = (prev: SetlistItem[], next: SetlistItem[]) => {
      if (!Array.isArray(next) || prev.length !== next.length) return false;
      // Same ids and properties unchanged except order
      const byId = new Map(prev.map((i) => [i.id, i]));
      // Next must contain all ids exactly once
      const seen = new Set<string>();
      for (const n of next) {
        if (!byId.has(n.id) || seen.has(n.id)) return false;
        seen.add(n.id);
        const p = byId.get(n.id)!;
        // Compare immutable fields
        const keys: (keyof SetlistItem)[] = [
          'type',
          'songId',
          'title',
          'artist',
          'durationSec',
          'note',
          'transposedKey',
        ];
        for (const key of keys) {
          if ((p as any)[key] !== (n as any)[key]) return false;
        }
      }
      return true;
    };
    if (!isReorderOnly(existing.items, updated.items as SetlistItem[])) {
      return NextResponse.json({ error: 'Members can only reorder items' }, { status: 403 });
    }
  } else if (role !== 'bandLeader') {
    // Viewers or unknown roles cannot edit
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  db.updateSetlist(updated as Setlist);
  return NextResponse.json(updated as Setlist);
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const existing = db.getSetlist(params.id);
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const project = db.getProject(existing.projectId, user.id);
  if (!project) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const role = db.getProjectRole(project.id, user.id);
  if (role !== 'bandLeader') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  db.deleteSetlist(existing.id);
  return NextResponse.json({ ok: true });
}
