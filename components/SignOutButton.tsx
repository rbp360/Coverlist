'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function SignOutButton({
  redirectTo = '/login',
  className,
}: {
  redirectTo?: string;
  className?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  async function onClick() {
    setLoading(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      // After clearing the cookie, send the user to login
      router.push(redirectTo);
    } catch (e) {
      // Fallback: hard refresh
      router.refresh();
    } finally {
      setLoading(false);
    }
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        className ??
        'rounded border border-neutral-700 px-3 py-1 text-sm text-neutral-200 hover:bg-neutral-800'
      }
      title="Sign out"
      aria-label="Sign out"
      disabled={loading}
    >
      {loading ? 'Signing out…' : 'Sign out'}
    </button>
  );
}
