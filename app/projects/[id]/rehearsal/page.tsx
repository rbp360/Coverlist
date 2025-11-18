'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

// Dayglo color palette (Tailwind + custom)
const PROJECT_COLORS = [
  'text-green-400',
  'text-pink-400', // more dayglo pink
  'text-orange-400', // orange
  'text-sky-400', // blue
  'text-yellow-300', // yellow
  'text-fuchsia-700', // darker purple (last)
];
function getProjectColor(projectId: string, projects: { id: string }[]): string {
  const idx = projects.findIndex((p) => p.id === projectId);
  return PROJECT_COLORS[idx % PROJECT_COLORS.length] || 'text-green-400';
}

import TrashIcon from '@/components/TrashIcon';
import { buildRehearsalPlaylistName } from '@/lib/format';
import { ragClassFromISO, parseFlexibleDateToISO, formatISOToDDMMYY } from '@/lib/rehearsal';

type Song = {
  id: string;
  title: string;
  artist: string;
  durationSec?: number;
  key?: string;
  tempo?: number;
  transposedKey?: string;
  notes?: string;
  url?: string;
};

function fmt(sec?: number) {
  if (!sec) return '';
  const m = Math.floor(sec / 60);
  const s = String(sec % 60).padStart(2, '0');
  return `${m}:${s}`;
}

function formatKey(key?: string) {
  if (!key) return '';
  return key.charAt(0).toUpperCase() + key.slice(1).toLowerCase();
}

// Utilities moved to lib/rehearsal: parseFlexibleDateToISO, formatISOToDDMMYY

// RAG classes are imported from lib/rehearsal

export default function RehearsalPage() {
  const { id } = useParams<{ id: string }>();
  const [songs, setSongs] = useState<Song[]>([]);
  const [projectName, setProjectName] = useState<string>('');
  const [allProjects, setAllProjects] = useState<any[]>([]);
  const [todo, setTodo] = useState<
    Array<{ id: string; title: string; artist: string; votes?: number }>
  >([]);
  const [q, setQ] = useState('');
  const [artist, setArtist] = useState('');
  const [practice, setPractice] = useState<
    Record<string, { passes: number; rating: number; lastRehearsed?: string }>
  >({});
  const [saving, setSaving] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [playlistUrl, setPlaylistUrl] = useState<string | null>(null);
  const [lastInput, setLastInput] = useState<Record<string, string>>({});
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [openNoteFor, setOpenNoteFor] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        // load project name
        const proj = await fetch(`/api/projects/${id}`);
        let projectObj = null;
        if (proj.ok) {
          const p = await proj.json();
          setProjectName(p.name || 'Project');
          projectObj = p;
        }
        // load all projects for color logic
        const all = await fetch('/api/projects');
        if (all.ok) setAllProjects(await all.json());

        const params = new URLSearchParams();
        if (q.trim()) params.set('q', q.trim());
        if (artist.trim()) params.set('artist', artist.trim());
        const res = await fetch(`/api/projects/${id}/songs?${params.toString()}`);
        if (res.ok) setSongs((await res.json()).songs);
        // load project todo
        const td = await fetch(`/api/projects/${id}/todo`);
        if (td.ok) {
          const json = await td.json();
          setTodo(
            (json.items || []).map((x: any) => ({
              id: x.id,
              title: x.title,
              artist: x.artist,
              votes: typeof x.votes === 'number' ? x.votes : 0,
            })),
          );
        }
        // Load practice entries for current user
        const pr = await fetch(`/api/projects/${id}/rehearsal`);
        if (pr.ok) {
          const data = await pr.json();
          const m: Record<string, { passes: number; rating: number; lastRehearsed?: string }> = {};
          (data.entries || []).forEach((e: any) => {
            m[e.songId] = {
              passes: e.passes ?? 0,
              rating: e.rating ?? 0,
              lastRehearsed: e.lastRehearsed,
            };
          });
          setPractice(m);
          // Reset any local inputs to reflect loaded values
          const li: Record<string, string> = {};
          Object.entries(m).forEach(([sid, v]) => {
            li[sid] = formatISOToDDMMYY(v.lastRehearsed);
          });
          setLastInput(li);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [id, q, artist]);

  const sorted = useMemo(() => {
    return [...songs].sort((a, b) => a.title.localeCompare(b.title));
  }, [songs]);

  async function updatePasses(songId: string, next: number) {
    setSaving(songId);
    try {
      const res = await fetch(`/api/projects/${id}/rehearsal`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ songId, passes: Math.max(0, next) }),
      });
      if (res.ok) {
        const saved = await res.json();
        setPractice((prev) => {
          const prevEntry = prev[songId] || {};
          return {
            ...prev,
            [songId]: {
              passes: saved.passes ?? prevEntry.passes ?? 0,
              rating: saved.rating ?? prevEntry.rating ?? 0,
              lastRehearsed: (saved.lastRehearsed as string | undefined) ?? prevEntry.lastRehearsed,
            },
          };
        });
      }
    } finally {
      setSaving(null);
    }
  }

  async function updateRating(songId: string, rating: number) {
    setSaving(songId);
    try {
      const res = await fetch(`/api/projects/${id}/rehearsal`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ songId, rating }),
      });
      if (res.ok) {
        const saved = await res.json();
        setPractice((prev) => {
          const prevEntry = prev[songId] || {};
          return {
            ...prev,
            [songId]: {
              passes: saved.passes ?? prevEntry.passes ?? 0,
              rating: saved.rating ?? prevEntry.rating ?? 0,
              lastRehearsed: (saved.lastRehearsed as string | undefined) ?? prevEntry.lastRehearsed,
            },
          };
        });
      }
    } finally {
      setSaving(null);
    }
  }

  async function updateLastRehearsed(songId: string, inputValue: string) {
    // Allow clearing
    const trimmed = inputValue.trim();
    const iso = trimmed === '' ? '' : parseFlexibleDateToISO(trimmed);
    if (iso === null) {
      // Invalid format, keep local value and do not save
      return;
    }
    setSaving(songId);
    try {
      const res = await fetch(`/api/projects/${id}/rehearsal`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ songId, lastRehearsed: iso }),
      });
      if (res.ok) {
        const saved = await res.json();
        setPractice((prev) => ({
          ...prev,
          [songId]: {
            passes: saved.passes ?? 0,
            rating: saved.rating ?? 0,
            lastRehearsed: saved.lastRehearsed,
          },
        }));
        setLastInput((prev) => ({ ...prev, [songId]: formatISOToDDMMYY(saved.lastRehearsed) }));
      }
    } finally {
      setSaving(null);
    }
  }

  async function updateSongNotes(songId: string, noteText: string) {
    // Empty string will clear notes
    const notes = noteText.trim() === '' ? undefined : noteText;
    setSaving(songId);
    try {
      const res = await fetch(`/api/projects/${id}/songs`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: songId, notes }),
      });
      if (res.ok) {
        const updated = await res.json();
        setSongs((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
        setNoteDrafts((prev) => ({ ...prev, [songId]: updated.notes || '' }));
      }
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          {projectName && allProjects.length > 0 && (
            <span className={`truncate font-semibold text-2xl ${getProjectColor(id, allProjects)}`}>
              {projectName}
            </span>
          )}
          <h2 className="text-2xl font-semibold">Rehearsal</h2>
        </div>
        <div className="flex gap-2 text-sm">
          <button
            className="rounded border px-3 py-1"
            disabled={creating || sorted.length === 0}
            onClick={async () => {
              setCreating(true);
              setPlaylistUrl(null);
              try {
                const date = new Date().toISOString().slice(0, 10);
                const name = buildRehearsalPlaylistName(projectName, date);
                const payload = {
                  name,
                  songs: sorted.map((s) => ({ title: s.title, artist: s.artist })),
                };
                const res = await fetch('/api/integrations/spotify/create', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(payload),
                });
                if (res.status === 401) {
                  const returnTo =
                    typeof window !== 'undefined' ? window.location.href : '/profile';
                  window.location.href = `/api/integrations/spotify/login?returnTo=${encodeURIComponent(returnTo)}`;
                  return;
                }
                if (!res.ok) throw new Error('Failed');
                const json = await res.json();
                setPlaylistUrl(json.url);
              } catch (e) {
                alert('Unable to create Spotify playlist.');
              } finally {
                setCreating(false);
              }
            }}
          >
            {creating ? 'Creating…' : 'Create Playlist'}
          </button>
          {playlistUrl && (
            <a
              className="rounded border px-3 py-1 underline"
              href={playlistUrl}
              target="_blank"
              rel="noreferrer"
            >
              Open in Spotify
            </a>
          )}
          <Link className="rounded border px-3 py-1" href={`/projects/${id}/repertoire`}>
            Repertoire
          </Link>
          <Link className="rounded border px-3 py-1" href={`/projects/${id}/live`}>
            Setlists (Live)
          </Link>
        </div>
      </div>

      <form className="grid gap-2 md:grid-cols-3">
        <input
          className="rounded border px-3 py-2"
          placeholder="Search title"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <input
          className="rounded border px-3 py-2"
          placeholder="Search artist"
          value={artist}
          onChange={(e) => setArtist(e.target.value)}
        />
        <div className="self-center text-xs text-neutral-600">{sorted.length} song(s)</div>
      </form>

      <div className="overflow-auto rounded border bg-black text-white">
        <table className="min-w-full text-sm">
          <thead className="bg-black text-left text-white">
            <tr>
              <th className="p-2">Title</th>
              <th className="p-2">Passes</th>
              <th className="p-2">Ready to rock</th>
              <th className="p-2">Last rehearsed</th>
              <th className="p-2">Notes</th>
              <th className="p-2">Link</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((s) => (
              <tr key={s.id} className="border-t">
                <td className="p-2 font-medium">{s.title}</td>
                <td className="p-2">
                  <div className="flex items-center gap-2">
                    <span className="inline-block min-w-[2ch] text-center">
                      {(practice[s.id]?.passes ?? 0).toString()}
                    </span>
                    <button
                      className="rounded border px-2 py-0.5 text-xs"
                      onClick={() => updatePasses(s.id, (practice[s.id]?.passes ?? 0) + 1)}
                      disabled={saving === s.id}
                      title="Add one pass"
                    >
                      +1
                    </button>
                  </div>
                </td>
                <td className="p-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {Array.from({ length: 5 }, (_, i) => i + 1).map((n) => {
                      const current = practice[s.id]?.rating ?? 0;
                      const filled = n <= current;
                      return (
                        <button
                          key={n}
                          className={`text-lg leading-none ${filled ? 'text-yellow-400' : 'text-neutral-600'}`}
                          aria-label={`Set rating ${n}`}
                          title={`Set rating ${n}`}
                          onClick={() => updateRating(s.id, n)}
                          disabled={saving === s.id}
                        >
                          {filled ? '★' : '☆'}
                        </button>
                      );
                    })}
                  </div>
                </td>
                <td className="p-2">
                  <label className="sr-only" htmlFor={`last-${s.id}`}>
                    Last rehearsed
                  </label>
                  <input
                    id={`last-${s.id}`}
                    className={`w-24 rounded border bg-transparent px-2 py-0.5 text-sm outline-none placeholder:text-neutral-500 ${
                      ragClassFromISO(practice[s.id]?.lastRehearsed) || ''
                    }`}
                    placeholder="DD/MM/YY"
                    value={lastInput[s.id] ?? formatISOToDDMMYY(practice[s.id]?.lastRehearsed)}
                    onChange={(e) => setLastInput((prev) => ({ ...prev, [s.id]: e.target.value }))}
                    onBlur={(e) => updateLastRehearsed(s.id, e.target.value)}
                    title="Enter date as DD/MM/YY"
                    disabled={saving === s.id}
                  />
                </td>
                <td className="p-2 align-top">
                  <div className="relative inline-flex items-center gap-2 group">
                    {/* Indicator button */}
                    <button
                      type="button"
                      className="rounded border px-2 py-0.5 text-xs whitespace-nowrap hover:bg-neutral-100 text-black"
                      onClick={() => setOpenNoteFor((cur) => (cur === s.id ? null : s.id))}
                      title={s.notes ? 'View/edit note' : 'Add a note'}
                    >
                      {s.notes ? 'Notes •' : 'Add note'}
                    </button>
                    {/* Small dot when a note exists */}
                    {s.notes ? (
                      <span
                        className="h-2 w-2 rounded-full inline-block"
                        style={{ backgroundColor: '#22c55e' }}
                      />
                    ) : null}

                    {/* Notes panel (mobile-friendly: toggled by button, not hover) */}
                    <div
                      className={`absolute left-0 top-full z-20 mt-1 ${
                        openNoteFor === s.id ? 'block' : 'hidden'
                      } min-w-[18rem] max-w-[28rem] rounded border bg-white p-2 text-black shadow-lg`}
                    >
                      <textarea
                        className="w-full rounded border px-2 py-1 h-24 text-sm bg-white text-black"
                        placeholder="Type your rehearsal notes here…"
                        value={noteDrafts[s.id] ?? s.notes ?? ''}
                        onChange={(e) =>
                          setNoteDrafts((prev) => ({ ...prev, [s.id]: e.target.value }))
                        }
                      />
                      <div className="mt-2 flex items-center justify-end gap-2">
                        <button
                          type="button"
                          className="rounded border px-2 py-0.5 text-xs"
                          onClick={() => setOpenNoteFor(null)}
                          title="Close"
                        >
                          Close
                        </button>
                        {Boolean(s.notes) && (
                          <button
                            type="button"
                            className="rounded border px-2 py-0.5 text-xs"
                            onClick={async () => {
                              await updateSongNotes(s.id, '');
                              setOpenNoteFor(null);
                            }}
                            disabled={saving === s.id}
                            title="Clear note"
                          >
                            Clear
                          </button>
                        )}
                        <button
                          type="button"
                          className="rounded bg-black text-white px-2 py-0.5 text-xs"
                          onClick={async () => {
                            const text = noteDrafts[s.id] ?? '';
                            await updateSongNotes(s.id, text);
                            setOpenNoteFor(null);
                          }}
                          disabled={saving === s.id}
                          title="Save note"
                        >
                          {saving === s.id ? 'Saving…' : 'Save'}
                        </button>
                      </div>
                    </div>
                  </div>
                </td>
                <td className="p-2">
                  {s.url ? (
                    <a className="underline" href={s.url} target="_blank" rel="noreferrer">
                      Open
                    </a>
                  ) : (
                    <button
                      className="rounded border px-2 py-0.5 text-xs"
                      onClick={async () => {
                        try {
                          const res = await fetch(
                            `/api/projects/${id}/songs/${s.id}/resolve-spotify`,
                            { method: 'POST' },
                          );
                          if (res.status === 401) {
                            const returnTo =
                              typeof window !== 'undefined'
                                ? window.location.href
                                : `/projects/${id}/rehearsal`;
                            window.location.href = `/api/integrations/spotify/login?returnTo=${encodeURIComponent(
                              returnTo,
                            )}`;
                            return;
                          }
                          if (!res.ok) return;
                          const json = await res.json();
                          if (json?.song?.url) {
                            setSongs((prev) =>
                              prev.map((x) => (x.id === s.id ? { ...x, url: json.song.url } : x)),
                            );
                          }
                        } catch {
                          // ignore
                        }
                      }}
                      title="Find on Spotify"
                    >
                      Find
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {!loading && sorted.length === 0 && (
              <tr>
                <td colSpan={6} className="p-4 text-neutral-600">
                  No songs found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="text-xs text-neutral-500">
        This view shows all songs in this project&apos;s repertoire to help with rehearsal. Use the
        Setlists page for arranging live shows.
      </div>

      {/* Project To-Do list (moved below main rehearsal content) */}
      <div className="rounded border" id="project-todo">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <Link
            href={`/projects/${id}/todo`}
            className="font-semibold hover:underline focus:underline outline-none"
          >
            Project To-Do List
          </Link>
          <div className="text-xs text-neutral-500">
            Suggestions to consider; move into repertoire when ready.
          </div>
        </div>
        {todo.length === 0 ? (
          <div className="p-3 text-sm text-neutral-600">No suggestions yet.</div>
        ) : (
          <ul className="divide-y">
            {todo.map((t) => (
              <li key={t.id} className="flex items-center gap-2 p-3">
                <div className="flex-1 truncate flex items-center gap-2 min-w-0">
                  <span className="font-medium truncate">{t.title}</span>
                  <span className="text-neutral-500">— {t.artist}</span>
                </div>
                <div className="w-8 text-right tabular-nums text-xs text-neutral-400 flex-shrink-0">
                  {typeof t.votes === 'number' ? t.votes : 0}
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    className="rounded border px-2 py-0.5 text-xs"
                    title="Move into project repertoire"
                    onClick={async () => {
                      try {
                        const res = await fetch(`/api/projects/${id}/songs`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ title: t.title, artist: t.artist }),
                        });
                        if (res.ok) {
                          // Remove from todo after successful add
                          await fetch(`/api/projects/${id}/todo`, {
                            method: 'DELETE',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ id: t.id }),
                          });
                          setTodo((prev) => prev.filter((x) => x.id !== t.id));
                          // refresh songs list
                          const res2 = await fetch(`/api/projects/${id}/songs`);
                          if (res2.ok) setSongs((await res2.json()).songs);
                        }
                      } catch {}
                    }}
                  >
                    Move to repertoire
                  </button>
                  <button
                    className="rounded border p-1 text-xs hover:bg-neutral-100"
                    aria-label="Remove suggestion"
                    title="Remove suggestion"
                    onClick={async () => {
                      try {
                        await fetch(`/api/projects/${id}/todo`, {
                          method: 'DELETE',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ id: t.id }),
                        });
                        setTodo((prev) => prev.filter((x) => x.id !== t.id));
                      } catch {}
                    }}
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* No modal; notes are edited via hover panel to keep the table clean */}
    </div>
  );
}
