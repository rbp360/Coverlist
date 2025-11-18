'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { instrumentEmoji } from '@/lib/instrumentAssets';
import { INSTRUMENTS } from '@/lib/presets';

type Member = {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  instruments: string[];
  role?: 'bandLeader' | 'bandMember' | 'setlistViewer';
};

export default function ProjectMembersPage() {
  const { id } = useParams<{ id: string }>();
  const [members, setMembers] = useState<Member[]>([]);
  const [me, setMe] = useState<{ id: string; instruments?: string[] } | null>(null);
  const [collabs, setCollabs] = useState<Member[]>([]);
  const [userQ, setUserQ] = useState('');
  const [userResults, setUserResults] = useState<Member[]>([]);
  const [invitingId, setInvitingId] = useState<string | null>(null);
  const [inviteRole, setInviteRole] = useState<'bandMember' | 'setlistViewer'>('bandMember');
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [mySel, setMySel] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        // load members
        const memRes = await fetch(`/api/projects/${id}/members`);
        let mems: Member[] = [];
        if (memRes.ok) {
          const data = await memRes.json();
          mems = data.members || [];
          setMembers(mems);
        }
        // load my profile for available instruments
        const prof = await fetch('/api/profile');
        if (prof.ok) {
          const p = await prof.json();
          setMe({ id: p.user?.id, instruments: p.user?.instruments || [] });
          setCollabs(
            (p.collaborators || []).map((c: any) => ({
              id: c.id,
              email: c.email,
              name: c.name,
              avatarUrl: c.avatarUrl,
              instruments: c.instruments || [],
            })),
          );
        }
      } catch (e) {
        setError('Failed to load');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  useEffect(() => {
    if (!me) return;
    const m = members.find((x) => x.id === me.id);
    setMySel(m?.instruments || []);
  }, [members, me]);

  // Match setup: allow choosing from the full preset list, not just profile
  const myInstrumentOptions = useMemo(() => INSTRUMENTS, []);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${id}/members`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instruments: mySel }),
      });
      if (res.ok) {
        // refresh members
        const memRes = await fetch(`/api/projects/${id}/members`);
        if (memRes.ok) setMembers((await memRes.json()).members || []);
      }
    } finally {
      setSaving(false);
    }
  }

  async function searchUsers() {
    const q = userQ.trim();
    if (!q) {
      setUserResults([]);
      return;
    }
    const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`);
    if (res.ok) {
      const data = await res.json();
      setUserResults(
        (data.results || []).map((u: any) => ({
          id: u.id,
          email: u.email,
          name: u.name,
          avatarUrl: u.avatarUrl,
          instruments: u.instruments || [],
        })),
      );
    }
  }

  function openInviteDialog(email: string) {
    setInviteEmail(email);
    setShowInviteDialog(true);
  }

  async function inviteUserByEmail(email: string) {
    setInvitingId(email);
    try {
      const res = await fetch(`/api/projects/${id}/invites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role: inviteRole }),
      });
      if (res.ok) {
        try {
          alert('Invite sent');
        } catch {}
        setShowInviteDialog(false);
      }
      if (!res.ok) {
        const msg = await res.json().catch(() => ({}));
        try {
          alert(`Invite failed: ${msg?.error || res.status}`);
        } catch {}
      }
    } finally {
      setInvitingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Project Members</h2>
        <Link className="rounded border px-3 py-1" href={`/projects/${id}`}>
          Back to project
        </Link>
      </div>
      {error && <div className="text-sm text-red-600">{error}</div>}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded border bg-black p-4 text-white">
          <div className="mb-2 font-medium">Your role in this project</div>
          {loading ? (
            <div className="text-sm text-neutral-500">Loading…</div>
          ) : myInstrumentOptions.length === 0 ? (
            <div className="text-sm text-neutral-400">
              You haven&apos;t added instruments to your profile yet. Go to{' '}
              <Link className="underline" href="/profile">
                your profile
              </Link>{' '}
              to select the instruments you play.
            </div>
          ) : (
            <>
              <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-neutral-400">
                <button
                  type="button"
                  className="rounded border px-2 py-0.5 text-xs text-white"
                  title="Apply your profile instruments"
                  onClick={() => setMySel(me?.instruments || [])}
                >
                  Use profile selection
                </button>
                <button
                  type="button"
                  className="rounded border px-2 py-0.5 text-xs text-white"
                  title="Clear instruments"
                  onClick={() => setMySel([])}
                >
                  Clear
                </button>
                <span className="ml-auto">
                  Selected: <span className="tabular-nums">{mySel.length}</span>
                </span>
              </div>
              <div className="grid grid-cols-1 gap-1 md:grid-cols-2">
                {myInstrumentOptions.map((inst) => (
                  <label key={inst} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={mySel.includes(inst)}
                      onChange={(e) =>
                        setMySel((prev) =>
                          e.target.checked ? [...prev, inst] : prev.filter((i) => i !== inst),
                        )
                      }
                    />
                    <span>
                      <span className="mr-1">{instrumentEmoji(inst)}</span>
                      {inst}
                    </span>
                  </label>
                ))}
              </div>
              <div className="mt-3 flex justify-end">
                <button
                  className="rounded bg-black px-3 py-2 text-white"
                  disabled={saving}
                  onClick={save}
                >
                  {saving ? 'Saving…' : 'Save selection'}
                </button>
              </div>
            </>
          )}
        </div>

        <div className="rounded border bg-black p-4 text-white">
          <div className="mb-2 font-medium">Musicians in this project</div>
          <ul className="divide-y">
            {members.map((m) => (
              <li key={m.id} className="flex items-center gap-3 py-2">
                <div className="h-8 w-8 overflow-hidden rounded-full bg-neutral-800">
                  {m.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.avatarUrl} alt="avatar" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[10px] text-neutral-500">
                      No Photo
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{m.name || m.email}</div>
                  <div className="text-xs text-neutral-400 mt-0.5">
                    {m.role === 'bandLeader' ? 'Band leader' : 'Band member'}
                  </div>
                  <div className="text-xs text-neutral-300 flex flex-wrap gap-2 mt-1">
                    {m.instruments && m.instruments.length > 0 ? (
                      m.instruments.map((inst) => (
                        <span
                          key={inst}
                          className="inline-flex items-center gap-1 rounded border px-2 py-0.5"
                        >
                          <span>{instrumentEmoji(inst)}</span>
                          <span className="truncate">{inst}</span>
                        </span>
                      ))
                    ) : (
                      <span className="text-neutral-500">No instruments selected</span>
                    )}
                  </div>
                </div>
              </li>
            ))}
            {members.length === 0 && (
              <li className="py-2 text-sm text-neutral-600">No members found.</li>
            )}
          </ul>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded border bg-black p-4 text-white">
          <div className="mb-2 font-medium">People you’ve collaborated with</div>
          <div className="mb-2 text-xs text-neutral-400">
            Invite as:{' '}
            <select
              className="rounded border bg-transparent px-2 py-1 text-white"
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as any)}
            >
              <option value="bandMember">Band member</option>
              <option value="setlistViewer">Setlist viewer (read-only)</option>
            </select>
          </div>
          <ul className="divide-y">
            {collabs.map((u) => (
              <li key={u.id} className="flex items-center justify-between gap-3 py-2">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 overflow-hidden rounded-full bg-neutral-800">
                    {u.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={u.avatarUrl} alt="avatar" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[10px] text-neutral-500">
                        No Photo
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="font-medium">{u.name || u.email}</div>
                    {u.name && <div className="text-xs text-neutral-500">{u.email}</div>}
                  </div>
                </div>
                <button
                  className="rounded border px-2 py-1 text-xs"
                  onClick={() => openInviteDialog(u.email)}
                  disabled={invitingId === u.email}
                >
                  {invitingId === u.email ? 'Inviting…' : 'Invite'}
                </button>
              </li>
            ))}
            {collabs.length === 0 && (
              <li className="py-2 text-sm text-neutral-600">No collaborators yet.</li>
            )}
          </ul>
        </div>

        <div className="rounded border bg-black p-4 text-white">
          <div className="mb-2 font-medium">Find musicians (global)</div>
          <div className="mb-2 text-xs text-neutral-400">
            Invite as:{' '}
            <select
              className="rounded border bg-transparent px-2 py-1 text-white"
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as any)}
            >
              <option value="bandMember">Band member</option>
              <option value="setlistViewer">Setlist viewer (read-only)</option>
            </select>
          </div>
          <div className="mb-2 flex gap-2">
            <input
              className="flex-1 rounded border bg-transparent px-3 py-2"
              placeholder="Search by username, name, email, or instrument"
              value={userQ}
              onChange={(e) => setUserQ(e.target.value)}
            />
            <button className="rounded bg-black px-3 py-2 text-white" onClick={searchUsers}>
              Search
            </button>
          </div>
          <ul className="divide-y">
            {userResults.map((u) => (
              <li key={u.id} className="flex items-center justify-between gap-3 py-2">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 overflow-hidden rounded-full bg-neutral-800">
                    {u.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={u.avatarUrl} alt="avatar" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[10px] text-neutral-500">
                        No Photo
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="font-medium">{u.name || u.email}</div>
                    {u.name && <div className="text-xs text-neutral-500">{u.email}</div>}
                  </div>
                </div>
                <button
                  className="rounded border px-2 py-1 text-xs"
                  onClick={() => openInviteDialog(u.email)}
                  disabled={invitingId === u.email}
                >
                  {invitingId === u.email ? 'Inviting…' : 'Invite'}
                </button>
              </li>
            ))}
            {userResults.length === 0 && (
              <li className="py-2 text-sm text-neutral-600">No users found.</li>
            )}
          </ul>
        </div>
      </div>
      {/* Manual invite by email */}
      <div className="rounded border bg-black p-4 text-white">
        <div className="mb-2 font-medium">Invite by email</div>
        <div className="mb-2 text-xs text-neutral-400">
          Role:{' '}
          <select
            className="rounded border bg-transparent px-2 py-1 text-white"
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value as any)}
          >
            <option value="bandMember">Band member</option>
            <option value="setlistViewer">Setlist viewer (read-only)</option>
          </select>
        </div>
        <div className="flex gap-2">
          <input
            className="flex-1 rounded border bg-transparent px-3 py-2"
            placeholder="person@example.com"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
          />
          <button
            className="rounded bg-black px-3 py-2 text-white"
            onClick={() => openInviteDialog(inviteEmail)}
            disabled={!inviteEmail}
          >
            Invite
          </button>
        </div>
      </div>

      {showInviteDialog && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-sm rounded-md border border-neutral-800 bg-neutral-950 p-4">
            <div className="mb-2 text-lg font-semibold">Send invite</div>
            <div className="mb-3 text-sm text-neutral-300">{inviteEmail}</div>
            <label className="mb-4 block text-sm text-neutral-400">
              Invite as
              <select
                className="mt-1 w-full rounded border bg-transparent px-2 py-1 text-white"
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as any)}
              >
                <option value="bandMember">Band member</option>
                <option value="setlistViewer">Setlist viewer (read-only)</option>
              </select>
            </label>
            <div className="flex justify-end gap-2">
              <button
                className="rounded border px-3 py-2"
                onClick={() => setShowInviteDialog(false)}
              >
                Cancel
              </button>
              <button
                className="rounded bg-black px-3 py-2 text-white"
                onClick={() => inviteUserByEmail(inviteEmail)}
                disabled={!!invitingId}
              >
                {invitingId ? 'Sending…' : 'Send invite'}
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="text-xs text-neutral-500">
        Tip: Add animated GIFs under <code>/public/instruments/</code> named after instruments (e.g.{' '}
        <code>drums.gif</code>). The UI will use them on the project main page.
      </div>
    </div>
  );
}
