import { renderToStream } from '@react-pdf/renderer';
import { NextResponse } from 'next/server';

import { db } from '@/lib/db';
import SetlistPDF from '@/lib/print/SetlistPDF';

export const runtime = 'nodejs';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const setlist = db.getSetlist(params.id);
  if (!setlist || !setlist.public)
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const project = db.getProjectById(setlist.projectId);
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const songs = db.listSongs(project.id);
  const songsById = Object.fromEntries(songs.map((s) => [s.id, s] as const));
  const settings = db.getSettings();

  const url = new URL(req.url);
  const fontSizeParam = url.searchParams.get('fontSize');
  const fontSize = fontSizeParam ? Math.max(0.6, Math.min(1.6, parseFloat(fontSizeParam))) : 1.0;
  const fontBaseUrl = url.origin;

  try {
    const stream = await renderToStream(
      SetlistPDF({
        project,
        setlist,
        songsById,
        defaultSongGapSec: settings.defaultSongGapSec,
        fontSize,
        fontBaseUrl,
      }),
    );
    return new NextResponse(stream as any, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${setlist.name.replace(/[^a-z0-9\-_]+/gi, '_')}.pdf"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err: any) {
    console.error('Public PDF render error:', err);
    return NextResponse.json(
      { error: 'PDF render failed', message: err?.message ?? 'Unknown error' },
      { status: 500 },
    );
  }
}
