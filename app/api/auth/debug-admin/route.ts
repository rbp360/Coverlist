import { NextResponse } from 'next/server';

import { getAdminDiagnostics } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const diag = getAdminDiagnostics();
  return NextResponse.json(diag, { headers: { 'Cache-Control': 'no-store' } });
}
