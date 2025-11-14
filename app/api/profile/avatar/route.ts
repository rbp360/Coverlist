import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { extname, join } from 'path';

import { NextResponse } from 'next/server';
import { v4 as uuid } from 'uuid';

import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

export const runtime = 'nodejs';
// Use a writable directory. On Vercel the repo root is read-only, so fall back to /tmp.
const UPLOAD_DIR = (() => {
  const isVercel = process.env.VERCEL === '1' || process.env.NOW === '1';
  return isVercel ? '/tmp/uploads' : join(process.cwd(), 'data', 'uploads');
})();

export async function POST(request: Request) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const form = await request.formData();
  const file = form.get('file');
  if (!file || typeof (file as any).arrayBuffer !== 'function') {
    return NextResponse.json({ error: 'Missing file' }, { status: 400 });
  }
  const originalName = (form.get('filename') as string) || 'upload';
  const ab = await (file as any).arrayBuffer();
  const buf = Buffer.from(ab);
  try {
    if (!existsSync(UPLOAD_DIR)) mkdirSync(UPLOAD_DIR, { recursive: true });
  } catch (e) {
    return NextResponse.json({ error: 'Upload directory unavailable' }, { status: 500 });
  }
  const ext = extname(originalName) || '.bin';
  const name = `${uuid()}${ext}`;
  const full = `${UPLOAD_DIR}/${name}`;
  writeFileSync(full, buf);
  const url = `/api/uploads/${name}`;
  const me = db.getUserById(user.id);
  if (me) {
    db.updateUser({ ...me, avatarUrl: url });
  }
  return NextResponse.json({ url });
}
