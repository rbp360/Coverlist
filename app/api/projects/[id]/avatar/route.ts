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

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const project = db.getProject(params.id, user.id);
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  const form = await request.formData();
  // Accept both 'file' and 'avatar' to match client implementations
  const file = (form.get('file') as any) || (form.get('avatar') as any);
  if (!file || typeof (file as any).arrayBuffer !== 'function') {
    return NextResponse.json({ error: 'Missing file' }, { status: 400 });
  }
  const originalName = (file as any).name || 'upload';
  const extLower = (extname(originalName) || '').toLowerCase();
  // Restrict to PNG/JPEG for PDF compatibility (@react-pdf/pdfkit supports PNG/JPEG)
  const allowed = new Set(['.png', '.jpg', '.jpeg']);
  if (!allowed.has(extLower)) {
    return NextResponse.json(
      {
        error:
          'Unsupported image format. Please upload a PNG or JPEG (JPG). BMP, GIF, and WEBP are not supported in the PDF export.',
      },
      { status: 400 },
    );
  }
  const ab = await (file as any).arrayBuffer();
  const buf = Buffer.from(ab);
  try {
    if (!existsSync(UPLOAD_DIR)) mkdirSync(UPLOAD_DIR, { recursive: true });
  } catch (e) {
    return NextResponse.json({ error: 'Upload directory unavailable' }, { status: 500 });
  }
  const name = `${uuid()}${extLower}`;
  const full = join(UPLOAD_DIR, name);
  writeFileSync(full, buf);
  const url = `/api/uploads/${name}`;
  const updatedProject = { ...project, avatarUrl: url };
  db.updateProject(updatedProject);
  return NextResponse.json(updatedProject);
}
