/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';

import { getCurrentUserAsync } from '@/lib/auth';
import { db } from '@/lib/db';

import UserMenu from './UserMenu';

export default async function UserHeader() {
  // Server component: fetch current user (supports Firebase session)
  const user = await getCurrentUserAsync();
  if (!user) {
    return (
      <Link
        href="/login"
        className="inline-flex items-center gap-2 rounded-full border border-neutral-700 px-3 py-1.5 text-sm text-neutral-300 hover:bg-neutral-800"
      >
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-neutral-700 text-xs text-neutral-500">
          👤
        </span>
        <span>Sign in</span>
      </Link>
    );
  }
  const pendingInvites = db.listInvitesForEmail(user.email).filter((i) => i.status === 'pending');
  return (
    <UserMenu
      initialAuthed={true}
      initialUser={{ name: (user as any).name, avatarUrl: (user as any).avatarUrl }}
      initialPendingInvitesCount={pendingInvites.length}
    />
  );
}
