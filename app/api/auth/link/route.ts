import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { db } from '@/lib/db';
import { authAdmin } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// POST /api/auth/link
// Attempts to migrate legacy (file DB) user data to the current Firebase UID by matching email.
// Safe to call multiple times; idempotent.
export async function POST(request: Request) {
  try {
    if (!authAdmin) {
      return NextResponse.json({ error: 'admin_unavailable' }, { status: 503 });
    }
    const allCookies = cookies()
      .getAll()
      .map((c) => c.name);
    let decoded: any | null = null;
    let source: 'session_cookie' | 'id_token' | 'none' = 'none';

    const bodyText = await request.text();
    let body: any = null;
    if (bodyText) {
      try {
        body = JSON.parse(bodyText);
      } catch {}
    }
    const providedIdToken = body?.idToken && typeof body.idToken === 'string' ? body.idToken : null;
    const sessionCookie = cookies().get('firebase_session')?.value;

    if (sessionCookie) {
      try {
        decoded = await authAdmin.verifySessionCookie(sessionCookie, true);
        source = 'session_cookie';
      } catch {
        decoded = null;
      }
    }
    if (!decoded && providedIdToken) {
      try {
        decoded = await authAdmin.verifyIdToken(providedIdToken, true);
        source = 'id_token';
      } catch {
        decoded = null;
      }
    }
    if (!decoded) {
      return NextResponse.json(
        { error: 'no_firebase_session', cookies: allCookies },
        { status: 401 },
      );
    }
    const uid = (decoded as any).uid || (decoded as any).sub;
    const email = (decoded as any).email as string | undefined;
    if (!uid || !email) {
      return NextResponse.json({ error: 'missing_uid_email' }, { status: 400 });
    }
    // Locate legacy user by email
    const legacyUser = db.getUserByEmail(email);
    const alreadyById = legacyUser && legacyUser.id === uid;
    if (!legacyUser) {
      return NextResponse.json({ migrated: false, reason: 'no_legacy_user_for_email', uid, email });
    }
    if (alreadyById) {
      return NextResponse.json({ migrated: false, reason: 'already_migrated', uid, email });
    }
    const oldId = legacyUser.id;
    db.migrateUserId(oldId, uid);
    // Re-fetch projects count after migration
    const projects = db.listProjects(uid);
    return NextResponse.json({
      migrated: true,
      oldId,
      newId: uid,
      email,
      projectCount: projects.length,
      source,
      cookies: allCookies,
    });
  } catch (e: any) {
    return NextResponse.json({ error: 'link_error', message: e?.message }, { status: 500 });
  }
}
