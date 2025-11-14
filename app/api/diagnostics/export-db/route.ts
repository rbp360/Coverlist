import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Temporary diagnostics export to pull the current JSON DB snapshot from a running instance.
// Protect with ADMIN_EXPORT_TOKEN: requests must send header X-Admin-Token matching the env value.
export async function GET(request: Request) {
  const token = process.env.ADMIN_EXPORT_TOKEN;
  if (!token) return NextResponse.json({ error: 'Not configured' }, { status: 501 });
  const provided = request.headers.get('x-admin-token') || '';
  if (provided !== token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const isVercel = process.env.VERCEL === '1' || process.env.NOW === '1';
  const dataDir = isVercel ? '/tmp/data' : join(process.cwd(), 'data');
  const jsonPath = join(dataDir, 'db.json');
  if (!existsSync(jsonPath))
    return NextResponse.json({ error: 'No database file' }, { status: 404 });
  const raw = readFileSync(jsonPath, 'utf-8');
  try {
    const parsed = JSON.parse(raw);
    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json({ error: 'Corrupt database file' }, { status: 500 });
  }
}
