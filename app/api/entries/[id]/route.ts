import { NextResponse } from 'next/server';
import { v4 as uuid } from 'uuid';

import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { entryUpdateSchema } from '@/lib/schemas';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const entry = db.getEntry(params.id, user.id);
  if (!entry) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(entry);
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const existing = db.getEntry(params.id, user.id);
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const json = await request.json();
  const parsed = entryUpdateSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  const updated = { ...existing, ...parsed.data, updatedAt: new Date().toISOString() };
  db.updateEntry(updated);
  return NextResponse.json(updated);
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  db.deleteEntry(params.id, user.id);
  return NextResponse.json({ ok: true });
}
