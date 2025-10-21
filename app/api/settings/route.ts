import { NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { settingsSchema } from '@/lib/schemas';

export async function GET() {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json(db.getSettings());
}

export async function PUT(request: Request) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const json = await request.json();
  const parsed = settingsSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  db.updateSettings(parsed.data);
  return NextResponse.json(db.getSettings());
}
