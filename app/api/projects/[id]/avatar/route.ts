import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { extname, join } from 'path';

import { NextResponse } from 'next/server';
import { v4 as uuid } from 'uuid';

import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

export const runtime = 'nodejs';
const UPLOAD_DIR = join(process.cwd(), 'data', 'uploads');

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const project = db.getProject(params.id, user.id);
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  const form = await request.formData();
  const file = form.get('file');
  if (!file || typeof (file as any).arrayBuffer !== 'function') {
    return NextResponse.json({ error: 'Missing file' }, { status: 400 });
  }
  const originalName = (form.get('filename') as string) || 'upload';
  const ab = await (file as any).arrayBuffer();
  const buf = Buffer.from(ab);
  if (!existsSync(UPLOAD_DIR)) mkdirSync(UPLOAD_DIR, { recursive: true });
  const ext = extname(originalName) || '.bin';
  const name = `${uuid()}${ext}`;
  const full = `${UPLOAD_DIR}/${name}`;
  writeFileSync(full, buf);
  const url = `/api/uploads/${name}`;
  db.updateProject({ ...project, avatarUrl: url });
  return NextResponse.json({ url });
}
