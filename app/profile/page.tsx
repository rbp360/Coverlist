'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';

import { INSTRUMENTS } from '@/lib/presets';

type User = {
  id: string;
  email: string;
  name?: string;
  username?: string;
  instruments?: string[];
  avatarUrl?: string;
};
type Project = { id: string; name: string; avatarUrl?: string };

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [collabs, setCollabs] = useState<User[]>([]);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [sel, setSel] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const userFileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch('/api/profile');
      if (!res.ok) {
        setError(res.status === 401 ? 'Please sign in to view your profile.' : 'Failed to load');
        return;
      }
      const data = await res.json();
      setUser(data.user);
      setProjects(data.projects || []);
      setCollabs(data.collaborators || []);
      setName(data.user?.name || '');
      setUsername(data.user?.username || '');
      setSel(data.user?.instruments || []);
    })();
  }, []);

  async function saveProfile() {
    setSaving(true);
    try {
      const trimmedName = name.trim();
      const trimmedUsername = username.trim();
      const body: any = {
        instruments: sel,
      };
      if (trimmedName) body.name = trimmedName;
      if (trimmedUsername) body.username = trimmedUsername;
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) setUser(await res.json());
    } finally {
      setSaving(false);
    }
  }

  async function uploadUserAvatar(file: File) {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('filename', file.name);
    const res = await fetch('/api/profile/avatar', { method: 'POST', body: fd });
    if (res.ok) {
      const { url } = await res.json();
      // Bust cache by appending a timestamp on client display
      const cacheBusted = `${url}?t=${Date.now()}`;
      setUser((u) => (u ? { ...u, avatarUrl: cacheBusted } : u));
      // Refresh from server to ensure persistence succeeded
      const prof = await fetch('/api/profile');
      if (prof.ok) {
        const data = await prof.json();
        setUser(data.user);
      }
    }
  }

  async function uploadProjectAvatar(pid: string, file: File) {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('filename', file.name);
    const res = await fetch(`/api/projects/${pid}/avatar`, { method: 'POST', body: fd });
    if (res.ok) {
      const { url } = await res.json();
      setProjects((prev) => prev.map((p) => (p.id === pid ? { ...p, avatarUrl: url } : p)));
    }
  }

  // No manual column splitting; use a responsive grid to avoid overlap/bleed

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Profile</h2>
      {error && <div className="text-sm text-red-600">{error}</div>}
      <div className="grid gap-6 md:grid-cols-4">
        <div className="md:col-span-2">
          <div className="rounded border bg-black p-4 text-white">
            <div className="mb-3 font-medium">Your Info</div>
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 overflow-hidden rounded-full bg-neutral-800">
                {user?.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.avatarUrl} alt="avatar" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-neutral-500">
                    No Photo
                  </div>
                )}
              </div>
              <div>
                <div className="text-sm text-neutral-400">{user?.email}</div>
                <div className="mt-2 block text-sm">
                  <button
                    type="button"
                    className="rounded border px-3 py-1"
                    onClick={() => {
                      if (user?.avatarUrl) {
                        const ok = window.confirm('Do you want to replace the current picture?');
                        if (!ok) return;
                      }
                      userFileRef.current?.click();
                    }}
                  >
                    {user?.avatarUrl ? 'Replace picture' : 'Add picture'}
                  </button>
                  <input
                    ref={userFileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        uploadUserAvatar(f);
                        // clear the value so selecting the same file again works
                        e.currentTarget.value = '';
                      }
                    }}
                  />
                </div>
              </div>
            </div>
            <label className="mt-4 block text-sm">
              <span className="mb-1 block text-neutral-400">Name</span>
              <input
                className="w-full rounded border bg-transparent px-3 py-2"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label className="mt-3 block text-sm">
              <span className="mb-1 block text-neutral-400">Username</span>
              <input
                className="w-full rounded border bg-transparent px-3 py-2"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. johndoe"
              />
              <div className="mt-1 text-xs text-neutral-500">This helps others find you.</div>
            </label>
            <div className="mt-4">
              <div className="mb-1 text-sm text-neutral-400">Instruments</div>
              {/* Keep to max 3 columns to prevent overlap/bleed on wider screens */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {INSTRUMENTS.map((inst) => (
                  <label key={inst} className="flex items-start gap-2 text-sm leading-5 min-w-0">
                    <input
                      type="checkbox"
                      checked={sel.includes(inst)}
                      onChange={(e) =>
                        setSel((prev) =>
                          e.target.checked ? [...prev, inst] : prev.filter((i) => i !== inst),
                        )
                      }
                    />
                    <span className="break-words whitespace-normal">{inst}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                className="rounded bg-black px-3 py-2 text-white"
                disabled={saving}
                onClick={saveProfile}
              >
                {saving ? 'Saving…' : 'Save profile'}
              </button>
            </div>
          </div>
        </div>

        <div className="md:col-span-2 space-y-6">
          <div className="rounded border bg-black p-4 text-white">
            <div className="mb-3 font-medium">Your Projects</div>
            <ul className="divide-y">
              {projects.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 overflow-hidden rounded bg-neutral-800">
                      {p.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={p.avatarUrl}
                          alt="project"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs text-neutral-500">
                          No Photo
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="font-medium">{p.name}</div>
                      <div className="text-xs text-neutral-500 flex gap-2">
                        <Link className="underline" href={`/projects/${p.id}/repertoire`}>
                          Repertoire
                        </Link>
                        <span>•</span>
                        <Link className="underline" href={`/projects/${p.id}/setlists`}>
                          Setlists
                        </Link>
                      </div>
                    </div>
                  </div>
                  <div className="text-sm">
                    <button
                      type="button"
                      className="rounded border px-3 py-1 mr-2"
                      onClick={() => {
                        if (p.avatarUrl) {
                          const ok = window.confirm('Do you want to replace the current picture?');
                          if (!ok) return;
                        }
                        const input = document.getElementById(
                          `project-file-${p.id}`,
                        ) as HTMLInputElement | null;
                        input?.click();
                      }}
                    >
                      {p.avatarUrl ? 'Replace picture' : 'Add picture'}
                    </button>
                    <input
                      id={`project-file-${p.id}`}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) {
                          uploadProjectAvatar(p.id, f);
                          e.currentTarget.value = '';
                        }
                      }}
                    />
                  </div>
                </li>
              ))}
              {projects.length === 0 && (
                <li className="py-3 text-sm text-neutral-600">No projects yet.</li>
              )}
            </ul>
          </div>

          <div className="rounded border bg-black p-4 text-white">
            <div className="mb-3 font-medium">Collaborators</div>
            <ul className="divide-y">
              {collabs.map((c) => (
                <li key={c.id} className="flex items-center gap-3 py-2">
                  <div className="h-8 w-8 overflow-hidden rounded-full bg-neutral-800">
                    {c.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.avatarUrl} alt="avatar" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[10px] text-neutral-500">
                        No Photo
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="font-medium">{c.name || c.email}</div>
                    {c.name && <div className="text-xs text-neutral-500">{c.email}</div>}
                  </div>
                </li>
              ))}
              {collabs.length === 0 && (
                <li className="py-2 text-sm text-neutral-600">No collaborators yet.</li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
