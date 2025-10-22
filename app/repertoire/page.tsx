'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

type FlatSong = {
  id: string;
  title: string;
  artist: string;
  projectId: string;
  projectName: string;
  durationSec?: number;
  key?: string;
  mbid?: string;
};

type AggregatedSong = {
  identity: string; // mbid or normalized title|artist
  title: string;
  artist: string;
  durationSec?: number;
  key?: string;
  projects: Array<{ id: string; name: string }>;
};

export default function RepertoireHomePage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [artist, setArtist] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<FlatSong[]>([]);

  function buildUrl() {
    return `/api/repertoire/songs?q=${encodeURIComponent(q)}&artist=${encodeURIComponent(artist)}`;
  }

  async function runSearch() {
    setSearching(true);
    try {
      const res = await fetch(buildUrl());
      if (res.ok) {
        const data = await res.json();
        setResults((data.songs || []) as FlatSong[]);
      } else {
        setError(
          res.status === 401 ? 'Please sign in to view your repertoire.' : 'Failed to load songs',
        );
      }
    } catch {
      setError('Failed to load songs');
    } finally {
      setSearching(false);
      setLoading(false);
    }
  }

  useEffect(() => {
    // Load all songs initially (no filters)
    runSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const aggregated: AggregatedSong[] = useMemo(() => {
    const norm = (s: string) => s.trim().toLowerCase();
    const map = new Map<string, AggregatedSong>();
    for (const s of results) {
      const identity = s.mbid || `${norm(s.title)}|${norm(s.artist)}`;
      const existing = map.get(identity);
      if (existing) {
        // Prefer to keep first non-empty duration/key
        if (!existing.durationSec && s.durationSec != null) existing.durationSec = s.durationSec;
        if (!existing.key && s.key) existing.key = s.key;
        if (!existing.projects.some((p) => p.id === s.projectId)) {
          existing.projects.push({ id: s.projectId, name: s.projectName });
        }
      } else {
        map.set(identity, {
          identity,
          title: s.title,
          artist: s.artist,
          durationSec: s.durationSec,
          key: s.key,
          projects: [{ id: s.projectId, name: s.projectName }],
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.title.localeCompare(b.title));
  }, [results]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Your Repertoire</h2>
      </div>
      <div className="grid gap-2 md:grid-cols-3">
        <input
          className="rounded border px-3 py-2"
          placeholder="Filter by title"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <input
          className="rounded border px-3 py-2"
          placeholder="Filter by artist"
          value={artist}
          onChange={(e) => setArtist(e.target.value)}
        />
        <button
          className="rounded bg-black px-3 py-2 text-white"
          onClick={runSearch}
          disabled={searching}
        >
          {searching ? 'Searching…' : 'Search repertoire'}
        </button>
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}

      <div className="overflow-auto rounded border bg-black text-white">
        <table className="min-w-full text-sm">
          <thead className="bg-black text-left text-white">
            <tr>
              <th className="p-2">Title</th>
              <th className="p-2">Artist</th>
              <th className="p-2">Dur</th>
              <th className="p-2">Key</th>
              <th className="p-2">Projects</th>
            </tr>
          </thead>
          <tbody>
            {aggregated.map((s) => (
              <tr key={s.identity} className="border-t">
                <td className="p-2">{s.title}</td>
                <td className="p-2 text-neutral-400">{s.artist}</td>
                <td className="p-2 text-neutral-500">
                  {s.durationSec != null
                    ? `${Math.floor(s.durationSec / 60)}:${String(s.durationSec % 60).padStart(2, '0')}`
                    : ''}
                </td>
                <td className="p-2 text-neutral-500">{s.key || ''}</td>
                <td className="p-2">
                  <div className="flex flex-wrap gap-2">
                    {s.projects.map((p) => (
                      <Link
                        key={p.id}
                        className="rounded border px-2 py-0.5 text-xs underline"
                        href={`/projects/${p.id}/repertoire`}
                      >
                        {p.name}
                      </Link>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
            {!loading && aggregated.length === 0 && (
              <tr>
                <td colSpan={5} className="p-4 text-sm text-neutral-600">
                  No songs found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
