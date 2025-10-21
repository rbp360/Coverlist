import { NextResponse } from 'next/server';
import { v4 as uuid } from 'uuid';

import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { entryCreateSchema } from '@/lib/schemas';

export async function GET() {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const entries = db.listEntries(user.id);
  return NextResponse.json(entries);
}

export async function POST(request: Request) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const json = await request.json();
  const parsed = entryCreateSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  const now = new Date().toISOString();
  const entry = {
    id: uuid(),
    userId: user.id,
    location: parsed.data.location,
    item: parsed.data.item,
    price: parsed.data.price,
    notes: parsed.data.notes,
    createdAt: now,
    updatedAt: now
  };
  db.createEntry(entry);
  return NextResponse.json(entry, { status: 201 });
}
