import { renderToStream } from '@react-pdf/renderer';
import { NextResponse } from 'next/server';

import { db } from '@/lib/db';
import SetlistPDF from '@/lib/print/SetlistPDF';

export const runtime = 'nodejs';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const project = db.getProjectById(params.id);
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const songs = db.listSongs(project.id);
  // Fake setlist object for PDF rendering
  const now = new Date().toISOString();
  const setlist = {
    id: 'repertoire',
    name: 'Entire Repertoire',
    showArtist: true,
    showKey: false,
    showTransposedKey: false,
    items: songs.map((s, i) => ({
      id: s.id,
      type: 'song' as const,
      order: i,
      title: s.title,
      artist: s.artist,
      songId: s.id,
    })),
    projectId: project.id,
    date: undefined,
    venue: undefined,
    addGapAfterEachSong: false,
    songGapSec: undefined,
    createdAt: now,
    updatedAt: now,
  };
  const songsById = Object.fromEntries(songs.map((s) => [s.id, s] as const));
  const fontBaseUrl = req.url ? new URL(req.url).origin : '';
  try {
    const stream = await renderToStream(
      SetlistPDF({
        project,
        setlist,
        songsById,
        defaultSongGapSec: 0,
        fontSize: 0.8,
        fontBaseUrl,
      }),
    );
    return new NextResponse(stream as any, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${project.name.replace(/[^a-z0-9\-_]+/gi, '_')}_repertoire.pdf"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err: any) {
    console.error('Repertoire PDF render error:', err);
    return NextResponse.json(
      { error: 'PDF render failed', message: err?.message ?? 'Unknown error' },
      { status: 500 },
    );
  }
}
