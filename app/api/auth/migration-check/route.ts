import { NextResponse } from 'next/server';

import { db } from '@/lib/db';
import { authAdmin } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Summary = {
  totalDbUsers: number;
  totalFirebaseUsers: number | null;
  unmigrated: Array<{ email: string; dbId: string }>; // users with matching email in Firebase but db id != Firebase uid
  noFirebaseAccount: Array<{ email: string; dbId: string }>; // users in DB with no corresponding Firebase user
  alreadyMigrated: Array<{ email: string; uid: string }>; // db id equals Firebase uid
};

async function getFirebaseUsersByEmail(): Promise<Map<string, string>> {
  if (!authAdmin) return new Map();
  const map = new Map<string, string>();
  let nextPageToken: string | undefined;
  do {
    // eslint-disable-next-line no-await-in-loop
    const page = await authAdmin.listUsers(1000, nextPageToken);
    for (const u of page.users) {
      const email = (u.email || '').trim().toLowerCase();
      if (email) map.set(email, u.uid);
    }
    nextPageToken = page.pageToken || undefined;
  } while (nextPageToken);
  return map;
}

export async function GET() {
  const users = db.listUsers();
  const fbMap = await getFirebaseUsersByEmail();
  const summary: Summary = {
    totalDbUsers: users.length,
    totalFirebaseUsers: authAdmin ? fbMap.size : null,
    unmigrated: [],
    noFirebaseAccount: [],
    alreadyMigrated: [],
  };
  for (const u of users) {
    const email = (u.email || '').trim().toLowerCase();
    if (!email) continue;
    const fbUid = fbMap.get(email);
    if (!fbUid) {
      summary.noFirebaseAccount.push({ email, dbId: u.id });
    } else if (u.id === fbUid) {
      summary.alreadyMigrated.push({ email, uid: fbUid });
    } else {
      summary.unmigrated.push({ email, dbId: u.id });
    }
  }
  return NextResponse.json(summary);
}

// POST will apply migrations for all unmigrated users by aligning DB id to Firebase uid
export async function POST() {
  if (!authAdmin) {
    return NextResponse.json({ error: 'admin_unavailable' }, { status: 503 });
  }
  const users = db.listUsers();
  const fbMap = await getFirebaseUsersByEmail();
  const migrated: Array<{ email: string; oldId: string; newId: string }> = [];
  const skipped: Array<{ email: string; reason: string }> = [];
  for (const u of users) {
    const email = (u.email || '').trim().toLowerCase();
    if (!email) {
      skipped.push({ email: '', reason: 'missing_email' });
      continue;
    }
    const fbUid = fbMap.get(email);
    if (!fbUid) {
      skipped.push({ email, reason: 'no_firebase_account' });
      continue;
    }
    if (u.id === fbUid) {
      skipped.push({ email, reason: 'already_migrated' });
      continue;
    }
    db.migrateUserId(u.id, fbUid);
    migrated.push({ email, oldId: u.id, newId: fbUid });
  }
  return NextResponse.json({ migratedCount: migrated.length, migrated, skipped });
}
