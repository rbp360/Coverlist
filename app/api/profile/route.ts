import { NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { profileUpdateSchema } from '@/lib/schemas';

export async function GET() {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const projects = db.listProjects(user.id);
  const userIds = new Set<string>();
  projects.forEach((p) => {
    userIds.add(p.ownerId);
    p.memberIds.forEach((m) => userIds.add(m));
  });
  userIds.delete(user.id);
  const collaborators = Array.from(userIds)
    .map((id) => db.getUserById(id))
    .filter(Boolean)
    .map((u) => ({
      id: u!.id,
      email: u!.email,
      name: (u as any).name,
      avatarUrl: (u as any).avatarUrl,
    }));
  return NextResponse.json({
    user,
    projects,
    collaborators,
  });
}

export async function PUT(request: Request) {
  const me = getCurrentUser();
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const raw = await request.json().catch(() => ({}));
  // Normalize payload: trim strings, convert empty strings to undefined, de-dupe instruments
  const normalizeString = (v: unknown) =>
    typeof v === 'string' ? v.trim() || undefined : undefined;
  const payload: any = {
    name: normalizeString(raw.name),
    username: normalizeString(raw.username),
    avatarUrl: normalizeString(raw.avatarUrl),
    instruments: Array.isArray(raw.instruments)
      ? Array.from(new Set(raw.instruments.filter((x: any) => typeof x === 'string' && x.trim())))
      : undefined,
  };
  const parsed = profileUpdateSchema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  const curr = db.getUserById(me.id);
  if (!curr) return NextResponse.json({ error: 'User not found' }, { status: 404 });
  // Enforce username uniqueness (case-insensitive)
  const patch = parsed.data as any;
  if (patch.username) {
    const existing = db.getUserByUsername(patch.username);
    if (existing && existing.id !== curr.id) {
      return NextResponse.json({ error: 'Username already taken' }, { status: 409 });
    }
  }
  const next = { ...curr, ...patch } as any;
  db.updateUser(next);
  return NextResponse.json(next);
}
