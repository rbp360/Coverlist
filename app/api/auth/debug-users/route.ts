import { NextResponse } from 'next/server';

import { db } from '@/lib/db';

// Usage: /api/auth/debug-users
export async function GET() {
  const users = db.listUsers();
  const summary = users.map((u) => ({
    id: u.id,
    email: u.email,
    hasPassword: !!u.passwordHash,
    createdAt: u.createdAt,
    name: u.name || null,
    username: u.username || null,
    avatarUrl: u.avatarUrl || null,
    instruments: u.instruments || [],
  }));
  return NextResponse.json({ count: summary.length, users: summary });
}
