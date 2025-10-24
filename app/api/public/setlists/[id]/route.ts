import { NextResponse } from 'next/server';

import { db } from '@/lib/db';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const setlist = db.getSetlist(params.id);
  if (!setlist || !setlist.public)
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const project = db.getProjectById(setlist.projectId);
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ setlist, project });
}
