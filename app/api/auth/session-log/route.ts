import fs from 'fs';
import path from 'path';

import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const nParam = url.searchParams.get('n');
  const n = Math.max(1, Math.min(200, Number(nParam) || 50));
  const logPath = path.join(process.cwd(), 'data', 'session.debug.log');
  try {
    if (!fs.existsSync(logPath)) {
      return NextResponse.json({
        lines: [],
        info: 'No debug log yet. Trigger login with debug to generate.',
      });
    }
    const content = fs.readFileSync(logPath, 'utf8');
    const lines = content.trim().split(/\r?\n/).filter(Boolean);
    const last = lines.slice(-n);
    return NextResponse.json(
      { lines: last, count: last.length },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (e: any) {
    return NextResponse.json(
      { error: 'read_error', message: e?.message || String(e) },
      { status: 500 },
    );
  }
}
