import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
// Match avatar upload logic: writable directory selection.
const UPLOAD_DIR = (() => {
  const isVercel = process.env.VERCEL === '1' || process.env.NOW === '1';
  return isVercel ? '/tmp/uploads' : join(process.cwd(), 'data', 'uploads');
})();

function contentTypeFromExt(name: string) {
  const lower = name.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.bmp')) return 'image/bmp';
  return 'application/octet-stream';
}

export async function GET(request: Request, { params }: { params: { file: string } }) {
  const filename = decodeURIComponent(params.file || '');
  const full = join(UPLOAD_DIR, filename);
  if (!existsSync(full)) {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.warn('[uploads] Not found:', full);
    }
    return new NextResponse('Not found', { status: 404 });
  }
  const data = readFileSync(full);
  return new NextResponse(data, {
    headers: {
      'Content-Type': contentTypeFromExt(filename),
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
