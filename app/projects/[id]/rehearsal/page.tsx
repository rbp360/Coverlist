'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

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
  const [notePreview, setNotePreview] = useState<null | {
    songId: string;
    title: string;
    artist: string;
    note: string;
  }>(null);
  const NOTE_PREVIEW_MAX = 80;

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        // load project name
        const proj = await fetch(`/api/projects/${id}`);
        if (proj.ok) {
          const p = await proj.json();
          setProjectName(p.name || 'Project');
        }
        const params = new URLSearchParams();
        if (q.trim()) params.set('q', q.trim());
        if (artist.trim()) params.set('artist', artist.trim());
        const res = await fetch(`/api/projects/${id}/songs?${params.toString()}`);
        if (res.ok) setSongs((await res.json()).songs);
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-2xl font-semibold">Rehearsal</h2>
        <div className="flex gap-2 text-sm">
          <button
            className="rounded border px-3 py-1"
            disabled={creating || sorted.length === 0}
            onClick={async () => {
              setCreating(true);
              setPlaylistUrl(null);
              try {
                const date = new Date().toISOString().slice(0, 10);
                const name = `${projectName} - rehearsal - ${date}`;
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
          <Link className="rounded border px-3 py-1" href={`/projects/${id}/setlists`}>
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
                  <div className="flex items-start gap-2">
                    <div
                      className="text-xs text-neutral-200 max-w-[14rem] md:max-w-[20rem] truncate"
                      title={s.notes || ''}
                    >
                      {s.notes
                        ? s.notes.length > NOTE_PREVIEW_MAX
                          ? `${s.notes.slice(0, NOTE_PREVIEW_MAX - 1)}…`
                          : s.notes
                        : ''}
                    </div>
                    {s.notes && s.notes.length > NOTE_PREVIEW_MAX ? (
                      <button
                        className="rounded border px-2 py-0.5 text-xs whitespace-nowrap"
                        onClick={() =>
                          setNotePreview({
                            songId: s.id,
                            title: s.title,
                            artist: s.artist,
                            note: s.notes || '',
                          })
                        }
                        title="View full note"
                      >
                        View
                      </button>
                    ) : null}
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

      {notePreview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setNotePreview(null)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setNotePreview(null);
          }}
        >
          <div
            className="w-full max-w-xl rounded-md border bg-neutral-900 p-4 text-white shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2 flex items-start justify-between gap-4">
              <div>
                <div className="text-sm text-neutral-400">{notePreview.artist}</div>
                <div className="text-lg font-semibold">{notePreview.title}</div>
              </div>
              <button
                className="rounded border px-2 py-0.5 text-xs"
                onClick={() => setNotePreview(null)}
                aria-label="Close"
                title="Close"
              >
                Close
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed">
              {notePreview.note}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
