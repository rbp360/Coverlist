import { NextResponse } from 'next/server';
import { v4 as uuid } from 'uuid';

import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { projectCreateSchema } from '@/lib/schemas';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json(db.listProjects(user.id));
}

export async function POST(request: Request) {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const json = await request.json();
  const parsed = projectCreateSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  const now = new Date().toISOString();
  const project = {
    id: uuid(),
    name: parsed.data.name,
    ownerId: user.id,
    memberIds: [],
    createdAt: now,
  };
  db.createProject(project);
  return new NextResponse(JSON.stringify(project), {
    status: 201,
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}
