import { NextResponse } from 'next/server';

import { authAdmin } from '@/lib/firebaseAdmin';

function getEnvDiagnostics() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const rawKey = process.env.FIREBASE_PRIVATE_KEY || '';
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

export async function GET(request: Request) {
  const url = new URL(request.url);
  const verbose = url.searchParams.get('verbose') === '1';
  const diag = {
    adminPresent: !!authAdmin,
    env: getEnvDiagnostics(),
  } as any;
  if (verbose) {
    try {
      diag.now = new Date().toISOString();
      diag.nodeEnv = process.env.NODE_ENV;
    } catch {}
  }
  return NextResponse.json(diag, { status: 200, headers: { 'Cache-Control': 'no-store' } });
}
