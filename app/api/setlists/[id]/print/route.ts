export const runtime = 'nodejs';
import { renderToStream } from '@react-pdf/renderer';
import { NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import SetlistPDF from '@/lib/print/SetlistPDF';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const setlist = db.getSetlist(params.id);
  if (!setlist) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const project = db.getProject(setlist.projectId, user.id);
  if (!project) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const songs = db.listSongs(project.id);
  const songsById = Object.fromEntries(songs.map((s) => [s.id, s] as const));
  const settings = db.getSettings();

  const url = new URL(req.url);
  const fontSizeParam = url.searchParams.get('fontSize');
  const fontSize = fontSizeParam ? Math.max(0.6, Math.min(1.6, parseFloat(fontSizeParam))) : 1.0;
  const fontBaseUrl = url.origin; // ensure fonts load on server via absolute URLs

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
    console.error('PDF render error:', err);
    return NextResponse.json(
      { error: 'PDF render failed', message: err?.message ?? 'Unknown error' },
      { status: 500 },
    );
  }
}
