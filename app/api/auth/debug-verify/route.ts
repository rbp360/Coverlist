import { NextResponse } from 'next/server';

import { authAdmin } from '@/lib/firebaseAdmin';

function getEnvDiagnostics() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const rawKey = process.env.FIREBASE_PRIVATE_KEY || '';
  return {
    adminPresent: !!authAdmin,
    projectIdPresent: !!projectId,
    clientEmailPresent: !!clientEmail,
    privateKeyPresent: !!rawKey,
    privateKeyStartsWithHeader: rawKey.startsWith('-----BEGIN PRIVATE KEY-----'),
    privateKeyEndsWithFooter: rawKey.trim().endsWith('-----END PRIVATE KEY-----'),
  };
}

export async function POST(request: Request) {
  const trace: any = { ts: new Date().toISOString() };
  try {
    const body = await request.json().catch(() => ({}));
    const idToken = body?.idToken;
    if (!idToken || typeof idToken !== 'string') {
      return NextResponse.json(
        { ok: false, error: 'invalid_input', env: getEnvDiagnostics() },
        { status: 400 },
      );
    }
    if (!authAdmin) {
      return NextResponse.json(
        { ok: false, error: 'admin_unavailable', env: getEnvDiagnostics() },
        { status: 503 },
      );
    }
    try {
      const decoded = await authAdmin.verifyIdToken(idToken);
      return NextResponse.json(
        {
          ok: true,
          uid: decoded.uid,
          email: decoded.email || null,
          provider: decoded.firebase?.sign_in_provider || null,
        },
        { status: 200 },
      );
    } catch (e: any) {
      trace.verifyError = e?.message || String(e);
      return NextResponse.json(
        { ok: false, error: 'verify_failed', message: trace.verifyError, env: getEnvDiagnostics() },
        { status: 400 },
      );
    }
  } catch (e: any) {
    trace.unhandled = e?.message || String(e);
    return NextResponse.json(
      { ok: false, error: 'debug_verify_error', message: trace.unhandled },
      { status: 400 },
    );
  }
}
