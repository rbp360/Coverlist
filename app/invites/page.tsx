'use client';
import { useEffect, useState } from 'react';

export default function InvitesPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invites, setInvites] = useState<
    Array<{
      id: string;
      token: string;
      projectId: string;
      projectName: string;
      invitedBy: { id: string; email: string; name?: string } | null;
      role: 'bandMember' | 'setlistViewer';
      createdAt: string;
    }>
  >([]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/invites', { cache: 'no-store', credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load invites');
      const data = await res.json();
      setInvites(data.invites || []);
    } catch (e: any) {
      setError(e.message || 'Failed to load invites');
    } finally {
      setLoading(false);
    }
  }

  async function accept(token: string) {
    try {
      const res = await fetch('/api/invites/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      if (!res.ok) throw new Error('Failed to accept invite');
      await load();
      // Notify header to refresh invites badge
      window.dispatchEvent(new Event('invites:updated'));
    } catch (e: any) {
      setError(e.message || 'Failed to accept invite');
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Invitations</h2>
      {loading && <div className="text-sm text-neutral-400">Loading…</div>}
      {error && <div className="text-sm text-red-400">{error}</div>}
      {!loading && invites.length === 0 && (
        <div className="text-sm text-neutral-400">No pending invitations.</div>
      )}
      <ul className="divide-y divide-neutral-800 rounded-md border border-neutral-800">
        {invites.map((i) => (
          <li key={i.id} className="flex items-center justify-between p-3">
            <div className="min-w-0">
              <div className="font-medium text-neutral-100">{i.projectName}</div>
              <div className="text-xs text-neutral-400">
                Role: {i.role} • Invited by {i.invitedBy?.name || i.invitedBy?.email || 'Unknown'}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="rounded bg-green-600 px-3 py-1.5 text-sm text-white hover:bg-green-500"
                onClick={() => accept(i.token)}
              >
                Accept
              </button>
              <a
                className="rounded border border-neutral-700 px-3 py-1.5 text-sm text-neutral-200 hover:bg-neutral-800"
                href={`/invites/accept?token=${encodeURIComponent(i.token)}`}
              >
                Open
              </a>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
