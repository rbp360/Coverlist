import { NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const headers = { 'User-Agent': 'SongDeck/0.1 (backfill)' } as const;
  const projects = db.listProjects(user.id);
  const updated: Array<{ songId: string; isrc: string }> = [];
  const errors: Array<{ songId: string; mbid?: string; error: string }> = [];

  for (const p of projects) {
    const songs = db.listSongs(p.id);
    for (const s of songs) {
      if (!s.mbid || s.isrc) continue;
      try {
        const url = `https://musicbrainz.org/ws/2/recording/${encodeURIComponent(
          s.mbid,
        )}?fmt=json&inc=isrcs`;
        const res = await fetch(url, { headers, cache: 'no-store' });
        if (!res.ok) {
          errors.push({ songId: s.id, mbid: s.mbid, error: `HTTP ${res.status}` });
          continue;
        }
        const data: any = await res.json().catch(() => ({}));
        const isrcs: string[] = Array.isArray(data?.isrcs) ? data.isrcs : [];
        const isrc = isrcs[0];
        if (isrc) {
          const next = { ...s, isrc, updatedAt: new Date().toISOString() } as any;
          db.updateSong(next);
          updated.push({ songId: s.id, isrc });
        }
      } catch (e: any) {
        errors.push({ songId: s.id, mbid: s.mbid, error: String(e?.message || e) });
      }
    }
  }

  return NextResponse.json({ updatedCount: updated.length, updated, errors });
}
