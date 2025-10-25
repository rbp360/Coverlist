import { NextResponse } from 'next/server';

// Endpoint retired: manual key/tempo input only.
export async function POST() {
  return NextResponse.json({ error: 'Enrichment endpoint removed' }, { status: 410 });
}
