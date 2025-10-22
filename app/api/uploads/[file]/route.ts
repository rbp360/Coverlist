import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
const UPLOAD_DIR = join(process.cwd(), 'data', 'uploads');

function contentTypeFromExt(name: string) {
  const lower = name.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.webp')) return 'image/webp';
  return 'application/octet-stream';
}

export async function GET(_: Request, { params }: { params: { file: string } }) {
  const filename = params.file;
  const full = join(UPLOAD_DIR, filename);
  if (!existsSync(full)) return new NextResponse('Not found', { status: 404 });
  const data = readFileSync(full);
  return new NextResponse(data, { headers: { 'Content-Type': contentTypeFromExt(filename) } });
}
