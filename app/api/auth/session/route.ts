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
    // If Firebase admin isn't initialized, signal the client to fall back.
    if (!authAdmin) {
      return NextResponse.json({ error: 'admin_unavailable' }, { status: 503 });
    }
    await createServerSessionCookie(idToken);
    // Back-compat: set legacy JWT cookie so existing APIs keep working during migration
    const decoded = await authAdmin.verifyIdToken(idToken);
    const uid = decoded.uid;
    const email = decoded.email || '';
    // Attempt to fetch richer Firebase user record (photoURL, displayName)
    let photoUrl: string | undefined;
    let displayName: string | undefined;
    try {
      const fbUser = await authAdmin.getUser(uid);
      photoUrl = fbUser.photoURL || undefined;
      displayName = fbUser.displayName || undefined;
    } catch {}
    let user = db.getUserById(uid) || (email ? db.getUserByEmail(email) : undefined);
    if (!user) {
      const toCreate = {
        id: uid,
        email,
        passwordHash: 'firebase',
        createdAt: new Date().toISOString(),
        avatarUrl: photoUrl,
        name: displayName,
      } as any;
      db.createUser(toCreate);
      user = toCreate as any;
    } else if (user.id !== uid) {
      db.migrateUserId(user.id, uid);
      user = db.getUserById(uid) || user;
    }
    // Backfill avatar/name if absent and we have Google data. Avoid overwriting custom uploads.
    if (user) {
      const needsAvatar = !user.avatarUrl || /lh3\.googleusercontent\.com/.test(user.avatarUrl);
      const next: any = { ...user };
      if (photoUrl && needsAvatar) next.avatarUrl = photoUrl;
      if (displayName && !next.name) next.name = displayName;
      if (next.avatarUrl !== user.avatarUrl || next.name !== (user as any).name) {
        db.updateUser(next);
        user = next;
      }
    }
    const legacy = signToken(user as any);
    setAuthCookie(legacy);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: 'session_error' }, { status: 400 });
  }
}
