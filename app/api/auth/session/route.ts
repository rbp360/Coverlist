import fs from 'fs';
import path from 'path';

import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { setAuthCookie, signToken } from '@/lib/auth';
import { db } from '@/lib/db';
import { authAdmin } from '@/lib/firebaseAdmin';
import { createServerSessionCookie } from '@/lib/firebaseSession';

function getEnvDiagnostics() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const rawKey = process.env.FIREBASE_PRIVATE_KEY || '';
  // Check for presence and basic formatting without exposing secrets
  const hasKey = !!rawKey;
  const hasEscapes = /\\n/.test(rawKey);
  const startsOk = rawKey.startsWith('-----BEGIN PRIVATE KEY-----');
  const endsOk = rawKey.trim().endsWith('-----END PRIVATE KEY-----');
  const length = rawKey.length;
  return {
    projectIdPresent: !!projectId,
    clientEmailPresent: !!clientEmail,
    privateKeyPresent: hasKey,
    privateKeyHasEscapedNewlines: hasEscapes,
    privateKeyStartsWithHeader: startsOk,
    privateKeyEndsWithFooter: endsOk,
    privateKeyLength: length,
  };
}

export async function POST(request: Request) {
  const started = Date.now();
  const url = new URL(request.url);
  // Allow enabling debug via query param or body flag
  let debug = url.searchParams.get('debug') === '1';
  const trace: any = {
    phase: 'start',
    ts: new Date().toISOString(),
    adminPresent: !!authAdmin,
  };
  try {
    const body = await request.json().catch(() => ({}));
    if (!debug && (body?.debug === true || body?.debug === 1 || body?.debug === '1')) {
      debug = true;
    }
    const idToken = body.idToken;
    if (!idToken || typeof idToken !== 'string') {
      trace.error = 'invalid_input';
      if (debug) trace.env = getEnvDiagnostics();
      if (debug) console.log('[session] invalid_input', trace);
      return NextResponse.json({ error: 'invalid_input', debug: trace }, { status: 400 });
    }
    if (!authAdmin) {
      trace.error = 'admin_unavailable';
      if (debug) trace.env = getEnvDiagnostics();
      if (debug) console.log('[session] admin_unavailable', trace);
      if (debug) {
        try {
          const logPath = path.join(process.cwd(), 'data', 'session.debug.log');
          fs.mkdirSync(path.dirname(logPath), { recursive: true });
          fs.appendFileSync(
            logPath,
            JSON.stringify({ at: new Date().toISOString(), trace }) + '\n',
          );
        } catch {}
      }
      return NextResponse.json({ error: 'admin_unavailable', debug: trace }, { status: 503 });
    }
    // First, verify the ID token so we can proceed even if session cookie creation fails
    const decoded = await authAdmin.verifyIdToken(idToken);
    const uid = decoded.uid;
    const email = decoded.email || '';
    trace.uid = uid;
    trace.email = email || null;
    let photoUrl: string | undefined;
    let displayName: string | undefined;
    try {
      const fbUser = await authAdmin.getUser(uid);
      photoUrl = fbUser.photoURL || undefined;
      displayName = fbUser.displayName || undefined;
      trace.photoUrl = !!photoUrl;
      trace.displayName = !!displayName;
    } catch (e: any) {
      trace.fetchUserError = e?.message || 'fb_user_error';
    }
    let user = db.getUserById(uid) || (email ? db.getUserByEmail(email) : undefined);
    trace.preUserFound = !!user;
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
      trace.userCreated = true;
    } else if (user.id !== uid) {
      db.migrateUserId(user.id, uid);
      user = db.getUserById(uid) || user;
      trace.userMigrated = true;
    }
    if (user) {
      const needsAvatar = !user.avatarUrl || /lh3\.googleusercontent\.com/.test(user.avatarUrl);
      const next: any = { ...user };
      if (photoUrl && needsAvatar) next.avatarUrl = photoUrl;
      if (displayName && !next.name) next.name = displayName;
      if (next.avatarUrl !== user.avatarUrl || next.name !== (user as any).name) {
        db.updateUser(next);
        user = next;
        trace.userBackfilled = true;
      }
    }
    const legacy = signToken(user as any);
    // Set via cookies API for server consumers
    setAuthCookie(legacy);
    // Also set both cookies directly on the response to ensure the browser receives them
    let sessionCookie: string | undefined;
    try {
      sessionCookie = await createServerSessionCookie(idToken);
      trace.sessionCookieSet = !!sessionCookie;
    } catch (e: any) {
      // Do not fail login; proceed with legacy cookie only
      trace.sessionCreateError = e?.message || 'session_cookie_error';
      if (debug)
        console.log('[session] createServerSessionCookie failed (continuing with legacy)', trace);
      if (debug) {
        try {
          const logPath = path.join(process.cwd(), 'data', 'session.debug.log');
          fs.mkdirSync(path.dirname(logPath), { recursive: true });
          fs.appendFileSync(
            logPath,
            JSON.stringify({ at: new Date().toISOString(), trace }) + '\n',
          );
        } catch {}
      }
    }
    const res = NextResponse.json({ ok: true, debug: trace });
    res.headers.set('Cache-Control', 'no-store');
    try {
      const maxAge = 7 * 24 * 60 * 60; // seconds
      res.cookies.set('firebase_session', sessionCookie!, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge,
      });
    } catch {}
    try {
      const maxAge = 7 * 24 * 60 * 60; // seconds
      res.cookies.set('songdeck_token', legacy, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge,
      });
      trace.legacyCookieSet = true;
    } catch {}
    trace.durationMs = Date.now() - started;
    trace.phase = 'complete';
    if (debug) console.log('[session] success', trace);
    if (debug) {
      try {
        const logPath = path.join(process.cwd(), 'data', 'session.debug.log');
        fs.mkdirSync(path.dirname(logPath), { recursive: true });
        fs.appendFileSync(logPath, JSON.stringify({ at: new Date().toISOString(), trace }) + '\n');
      } catch {}
    }
    return res;
  } catch (e: any) {
    trace.phase = 'error';
    trace.unhandled = e?.message || 'session_error';
    trace.durationMs = Date.now() - started;
    if (debug) console.log('[session] error', trace);
    if (debug) {
      try {
        const logPath = path.join(process.cwd(), 'data', 'session.debug.log');
        fs.mkdirSync(path.dirname(logPath), { recursive: true });
        fs.appendFileSync(logPath, JSON.stringify({ at: new Date().toISOString(), trace }) + '\n');
      } catch {}
    }
    return NextResponse.json({ error: 'session_error', debug: trace }, { status: 400 });
  }
}
