import { NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { projectMemberInstrumentsUpdateSchema } from '@/lib/schemas';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const project = db.getProject(params.id, user.id);
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  const memberIds = [project.ownerId, ...project.memberIds.filter((m) => m !== project.ownerId)];
  const members = memberIds
    .map((uid) => db.getUserById(uid))
    .filter(Boolean)
    .map((u) => ({
      id: u!.id,
      email: u!.email,
      name: (u as any).name,
      avatarUrl: (u as any).avatarUrl,
      instruments: db.getMemberInstruments(project.id, u!.id),
    }));
  return NextResponse.json({ members });
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const project = db.getProject(params.id, user.id);
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  const json = await req.json().catch(() => ({}));
  const parsed = projectMemberInstrumentsUpdateSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid instruments' }, { status: 400 });
  db.setMemberInstruments(project.id, user.id, parsed.data.instruments);
  return NextResponse.json({ ok: true, instruments: parsed.data.instruments });
}
