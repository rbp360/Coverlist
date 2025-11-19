export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { settingsUpdateSchema } from '@/lib/schemas';

export async function GET() {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json(db.getSettings());
}

export async function PUT(request: Request) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const json = await request.json();
  const parsed = settingsUpdateSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  db.updateSettings(parsed.data);
  return new NextResponse(JSON.stringify(db.getSettings()), {
    status: 200,
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}
