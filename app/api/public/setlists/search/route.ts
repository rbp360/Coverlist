import { NextResponse } from 'next/server';

import { db } from '@/lib/db';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const project = (url.searchParams.get('project') || '').toLowerCase();
  const name = (url.searchParams.get('name') || '').toLowerCase();
  const venue = (url.searchParams.get('venue') || '').toLowerCase();
  const date = (url.searchParams.get('date') || '').toLowerCase();

  const all = db.listPublicSetlists();
  const results = all
    .map((s) => ({
      ...s,
      project: db.getProjectById(s.projectId),
    }))
    .filter((row) => (project ? row.project?.name.toLowerCase().includes(project) : true))
    .filter((row) => (name ? row.name.toLowerCase().includes(name) : true))
    .filter((row) => (venue ? (row.venue || '').toLowerCase().includes(venue) : true))
    .filter((row) => (date ? (row.date || '').toLowerCase().includes(date) : true))
    .map((row) => {
      // Compute total duration (songs + breaks with explicit duration)
      const songs = db.listSongs(row.projectId);
      const byId = new Map(songs.map((s) => [s.id, s] as const));
      const totalDurationSec = (row.items || []).reduce((acc: number, it: any) => {
        if (it.type === 'song') {
          const s = it.songId ? byId.get(it.songId) : undefined;
          return acc + (s?.durationSec || 0);
        }
        if (it.type === 'break') return acc + (it.durationSec || 0);
        return acc;
      }, 0);
      return {
        id: row.id,
        name: row.name,
        date: row.date,
        time: row.time,
        venue: row.venue,
        projectId: row.projectId,
        projectName: row.project?.name || '',
        updatedAt: row.updatedAt,
        totalDurationSec,
      };
    });

  return NextResponse.json({ results });
}
