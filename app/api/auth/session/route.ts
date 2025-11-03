import { NextResponse } from 'next/server';

import { setAuthCookie, signToken } from '@/lib/auth';
import { db } from '@/lib/db';
import { authAdmin } from '@/lib/firebaseAdmin';
import { createServerSessionCookie } from '@/lib/firebaseSession';

export async function POST(request: Request) {
  try {
    const { idToken } = await request.json();
    if (!idToken || typeof idToken !== 'string')
      return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
    await createServerSessionCookie(idToken);
    // Back-compat: set legacy JWT cookie so existing APIs keep working during migration
    if (!authAdmin) throw new Error('admin_not_initialized');
    const decoded = await authAdmin.verifyIdToken(idToken);
    const uid = decoded.uid;
    const email = decoded.email || '';
    let user = db.getUserById(uid) || (email ? db.getUserByEmail(email) : undefined);
    if (!user) {
      const toCreate = {
        id: uid,
        email,
        passwordHash: 'firebase',
        createdAt: new Date().toISOString(),
      } as any;
      db.createUser(toCreate);
      user = toCreate as any;
    } else if (user.id !== uid) {
      db.updateUser({ ...user, id: uid } as any);
      user = db.getUserById(uid) || user;
    }
    const legacy = signToken(user as any);
    setAuthCookie(legacy);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: 'session_error' }, { status: 400 });
  }
}
