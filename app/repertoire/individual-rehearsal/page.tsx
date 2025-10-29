'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { ragClassFromISO, parseFlexibleDateToISO, formatISOToDDMMYY } from '@/lib/rehearsal';

type Song = {
  id: string;
  title: string;
  notes?: string;
  url?: string;
  projectId?: string;
  projectName?: string;
};

export default function IndividualRehearsalPage() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [q, setQ] = useState('');
  const [artist, setArtist] = useState('');
  const [practice, setPractice] = useState<
    Record<string, { passes: number; rating: number; lastRehearsed?: string }>
  >({});
  const [saving, setSaving] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastInput, setLastInput] = useState<Record<string, string>>({});
  const NOTE_PREVIEW_MAX = 80;

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (q.trim()) params.set('q', q.trim());
        if (artist.trim()) params.set('artist', artist.trim());
        const res = await fetch(`/api/repertoire/songs?${params.toString()}`);
        let allSongs: any[] = [];
        if (res.ok) {
          const data = await res.json();
          // Show all songs: both personal repertoire and project songs
          allSongs = (data.songs || []).map((s: any) => ({
            id: s.id,
            title: s.title,
            notes: s.notes,
            url: s.url,
            projectId: s.projectId,
            projectName: s.projectName,
          }));
          setSongs(allSongs);
        }
        // Fetch only personal practice entries
        const personal = await fetch(`/api/repertoire/rehearsal`).then((r) =>
          r.ok ? r.json() : { entries: [] },
        );
        const m: Record<string, { passes: number; rating: number; lastRehearsed?: string }> = {};
        (personal.entries || []).forEach((e: any) => {
          m[e.repertoireSongId] = {
            passes: e.passes ?? 0,
            rating: e.rating ?? 0,
            lastRehearsed: e.lastRehearsed,
          };
        });
        setPractice(m);
        const li: Record<string, string> = {};
        Object.entries(m).forEach(([sid, v]) => {
          li[sid] = formatISOToDDMMYY(v.lastRehearsed);
        });
        setLastInput(li);
      } finally {
        setLoading(false);
      }
    })();
  }, [q, artist]);

  const sorted = useMemo(() => {
    return [...songs].sort((a, b) => a.title.localeCompare(b.title));
  }, [songs]);

  async function updatePasses(songId: string, next: number) {
    setSaving(songId);
    try {
      // Always update personal practice entry
      const res = await fetch(`/api/repertoire/rehearsal`, {
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
      // Always update personal practice entry
      const res = await fetch(`/api/repertoire/rehearsal`, {
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
    const trimmed = inputValue.trim();
    const iso = trimmed === '' ? '' : parseFlexibleDateToISO(trimmed);
    if (iso === null) return; // invalid format, don't save
    setSaving(songId);
    try {
      // Always update personal practice entry
      const res = await fetch(`/api/repertoire/rehearsal`, {
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
        <h2 className="text-2xl font-semibold">Individual rehearsal</h2>
        <div className="flex gap-2 text-sm">
          <Link className="rounded border px-3 py-1" href="/repertoire">
            Back to repertoire
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
                  </div>
                </td>
                <td className="p-2">
                  {s.url ? (
                    <a className="underline" href={s.url} target="_blank" rel="noreferrer">
                      Open
                    </a>
                  ) : null}
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
        This view is personal to you and tracks your own practice across your repertoire.
      </div>
    </div>
  );
}
