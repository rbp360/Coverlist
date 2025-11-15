'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { instrumentEmoji, instrumentGifPath } from '@/lib/instrumentAssets';

type Song = { id: string; title: string; artist: string; mbid?: string };

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<any | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [songs, setSongs] = useState<Song[]>([]);
  const [invites, setInvites] = useState<any[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [members, setMembers] = useState<
    Array<{ id: string; email: string; name?: string; avatarUrl?: string; instruments: string[] }>
  >([]);

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/projects/${id}`);
      if (res.ok) setProject(await res.json());
      // Load existing songs for this project (used elsewhere)
      const rs = await fetch(`/api/projects/${id}/songs`);
      if (rs.ok) setSongs((await rs.json()).songs);
      // Load members list
      const mem = await fetch(`/api/projects/${id}/members`);
      if (mem.ok) setMembers((await mem.json()).members || []);
    })();
  }, [id]);

  // Revert helper for browser-back undo
  const revertProjectName = useCallback(
    async (prevName: string) => {
      if (!prevName) return;
      const res = await fetch(`/api/projects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: prevName }),
      });
      if (res.ok) setProject(await res.json());
    },
    [id],
  );

  useEffect(() => {
    function onPopState(e: PopStateEvent) {
      const st = (e.state || {}) as any;
      if (st && st.type === 'projectNameChange' && st.projectId === id) {
        const prevName = String(st.prevName || '').trim();
        if (prevName) revertProjectName(prevName);
      }
    }
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [id, revertProjectName]);

  async function commitNameChange() {
    if (!project) return;
    const next = nameDraft.trim();
    if (!next || next === project.name) {
      setEditingName(false);
      setNameDraft('');
      return;
    }
    const prevName = project.name;
    // Push history state to allow Back to revert
    try {
      history.pushState({ type: 'projectNameChange', projectId: id, prevName }, '');
    } catch {}
    const res = await fetch(`/api/projects/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: next }),
    });
    if (res.ok) {
      setProject(await res.json());
    }
    setEditingName(false);
    setNameDraft('');
  }

  // Song search moved to global /songs page

  async function loadInvites() {
    const res = await fetch(`/api/projects/${id}/invites`);
    if (res.ok) setInvites((await res.json()).invites);
  }

  async function createInvite() {
    const res = await fetch(`/api/projects/${id}/invites`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: inviteEmail }),
    });
    if (res.ok) {
      setInviteEmail('');
      loadInvites();
    }
  }

  async function revokeInvite(inviteId: string) {
    const res = await fetch(`/api/invites/${inviteId}/revoke`, { method: 'POST' });
    if (res.ok) loadInvites();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            {!project && <h2 className="text-2xl font-semibold">Project</h2>}
            {project && !editingName && (
              <h2 className="text-2xl font-semibold">
                {project.name}{' '}
                <button
                  type="button"
                  className="ml-2 rounded border px-2 py-1 text-sm"
                  title="Rename project"
                  onClick={() => {
                    setEditingName(true);
                    setNameDraft(project.name || '');
                  }}
                >
                  Edit
                </button>
              </h2>
            )}
            {project && editingName && (
              <div className="flex items-center gap-2">
                <input
                  className="rounded border px-3 py-2"
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  autoFocus
                />
                <button className="rounded border px-3 py-2" onClick={commitNameChange}>
                  Save
                </button>
                <button
                  className="rounded border px-3 py-2"
                  onClick={() => {
                    setEditingName(false);
                    setNameDraft('');
                  }}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
          {/* Project avatar upload UI */}
          {project && (
            <div className="flex items-center gap-3 mt-2">
              <div className="h-16 w-16 overflow-hidden rounded-full border bg-neutral-100 flex items-center justify-center">
                {project.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={project.avatarUrl}
                    alt="Project avatar"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-xs text-neutral-400">No Avatar</span>
                )}
              </div>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setAvatarError(null);
                  const fileInput = e.currentTarget.elements.namedItem(
                    'avatar',
                  ) as HTMLInputElement;
                  if (!fileInput?.files?.[0]) {
                    setAvatarError('No file selected');
                    return;
                  }
                  const formData = new FormData();
                  formData.append('avatar', fileInput.files[0]);
                  setAvatarUploading(true);
                  const res = await fetch(`/api/projects/${id}/avatar`, {
                    method: 'POST',
                    body: formData,
                  });
                  setAvatarUploading(false);
                  if (res.ok) {
                    const updated = await res.json();
                    setProject(updated);
                  } else {
                    setAvatarError('Upload failed');
                  }
                }}
                className="flex items-center gap-2"
              >
                <input type="file" name="avatar" accept="image/*" className="text-xs" />
                <button
                  type="submit"
                  className="rounded border px-2 py-1 text-xs"
                  disabled={avatarUploading}
                >
                  {avatarUploading ? 'Uploading...' : 'Change Avatar'}
                </button>
                {avatarError && <span className="text-xs text-red-500">{avatarError}</span>}
              </form>
              {project.avatarUrl && (
                <div className="flex items-center gap-2 text-xs mt-2">
                  <code className="rounded bg-neutral-900 px-1 py-0.5 text-neutral-100 max-w-[22rem] truncate">
                    {project.avatarUrl}
                  </code>
                  <a
                    className="rounded border px-1 py-0.5"
                    href={project.avatarUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open
                  </a>
                  <button
                    className="rounded border px-1 py-0.5"
                    onClick={() => navigator.clipboard.writeText(String(project.avatarUrl))}
                    title="Copy URL"
                  >
                    Copy
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="flex gap-2 text-sm">
          <Link className="rounded border px-3 py-1" href={`/projects/${id}/rehearsal`}>
            Rehearsal Mode
          </Link>
          <Link
            className="rounded border px-3 py-1 flex items-center gap-2"
            href={`/projects/${id}/live`}
          >
            <span
              style={{
                display: 'inline-block',
                width: '1em',
                height: '1em',
                borderRadius: '50%',
                background: 'red',
                boxShadow: '0 0 8px 2px rgba(255,0,0,0.5)',
                animation: 'flash-red 1.1s infinite',
                marginRight: '0.4em',
              }}
              aria-label="Live mode recording indicator"
            />
            Live Mode
            <style>{`
              @keyframes flash-red {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.3; }
              }
            `}</style>
          </Link>
          <Link className="rounded border px-3 py-1" href={`/projects/${id}/repertoire`}>
            Project Repertoire
          </Link>
        </div>
      </div>
      {project && (
        <div className="rounded border bg-black p-3 text-white">
          <div className="mb-2 flex items-center justify-between">
            <div className="font-medium">Members</div>
            <Link className="rounded border px-2 py-1 text-xs" href={`/projects/${id}/members`}>
              Manage
            </Link>
          </div>
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
                  <div className="mt-1 flex flex-wrap gap-2 text-xs text-neutral-300">
                    {m.instruments && m.instruments.length > 0 ? (
                      m.instruments.map((inst) => (
                        <InstrumentBadge key={`${m.id}-${inst}`} name={inst} />
                      ))
                    ) : (
                      <span className="text-neutral-500">No instruments selected</span>
                    )}
                  </div>
                </div>
              </li>
            ))}
            {members.length === 0 && (
              <li className="py-2 text-sm text-neutral-600">No members yet.</li>
            )}
          </ul>
        </div>
      )}
      <div className="rounded border bg-black p-3 text-white">
        <div className="mb-2 font-medium">Share project</div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            className="rounded border px-3 py-2"
            placeholder="Invite by email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
          />
          <button className="rounded bg-black px-3 py-2 text-white" onClick={createInvite}>
            Invite
          </button>
          <button className="rounded border px-3 py-2" onClick={loadInvites}>
            Refresh
          </button>
          <a
            className="rounded border px-3 py-2"
            href="/invites/accept"
            title="Paste your token to accept an invite"
          >
            Accept invite
          </a>
        </div>
        <ul className="mt-2 divide-y">
          {invites.map((inv) => (
            <li key={inv.id} className="flex items-center justify-between py-2 text-sm">
              <div>
                <div>
                  {inv.email} — <span className="text-neutral-600">{inv.status}</span>
                </div>
                <div className="text-xs text-neutral-500">
                  Token (dev): {inv.token} ·{' '}
                  <a className="underline" href={`/invites/accept?token=${inv.token}`}>
                    accept
                  </a>
                </div>
              </div>
              {inv.status === 'pending' && (
                <button className="rounded border px-2 py-1" onClick={() => revokeInvite(inv.id)}>
                  Revoke
                </button>
              )}
            </li>
          ))}
          {invites.length === 0 && (
            <li className="py-2 text-sm text-neutral-600">No invites yet.</li>
          )}
        </ul>
      </div>
      {/* Song search moved to /songs */}
    </div>
  );
}

function InstrumentBadge({ name }: { name: string }) {
  const [showGif, setShowGif] = useState(true);
  const gif = instrumentGifPath(name);
  return (
    <span className="inline-flex items-center gap-1 rounded border px-2 py-0.5">
      {showGif ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={gif} alt={name} className="h-4 w-4" onError={() => setShowGif(false)} />
      ) : (
        <span>{instrumentEmoji(name)}</span>
      )}
      <span className="truncate">{name}</span>
    </span>
  );
}
