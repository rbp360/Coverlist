'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
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
  mbid?: string;
  projects: Array<{ id: string; name: string }>;
};

function fmtDur(sec?: number) {
  if (!sec && sec !== 0) return '';
  const m = Math.floor((sec || 0) / 60);
  const s = String((sec || 0) % 60).padStart(2, '0');
  return `${m}:${s}`;
}

function norm(s: string) {
  return s.trim().toLowerCase();
}

export default function ImportFromRepertoirePage() {
  const { id } = useParams<{ id: string }>();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [artist, setArtist] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<FlatSong[]>([]);
  const [existingKeys, setExistingKeys] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Map<string, AggregatedSong>>(new Map());
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

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

  async function loadExistingKeys() {
    const res = await fetch(`/api/projects/${id}/songs`);
    if (res.ok) {
      const data = await res.json();
      const keys = new Set<string>(
        (data.songs || []).map((s: any) => `${norm(s.title)}::${norm(s.artist)}`),
      );
      setExistingKeys(keys);
    }
  }

  useEffect(() => {
    runSearch();
    loadExistingKeys();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const aggregated: AggregatedSong[] = useMemo(() => {
    const map = new Map<string, AggregatedSong>();
    for (const s of results) {
      const identity = s.mbid || `${norm(s.title)}|${norm(s.artist)}`;
      const existing = map.get(identity);
      if (existing) {
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
          mbid: s.mbid,
          projects: [{ id: s.projectId, name: s.projectName }],
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.title.localeCompare(b.title));
  }, [results]);

  function toggle(identity: string, item: AggregatedSong) {
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(identity)) next.delete(identity);
      else next.set(identity, item);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) => {
      const next = new Map(prev);
      const all = aggregated.filter(
        (s) => !existingKeys.has(`${norm(s.title)}::${norm(s.artist)}`),
      );
      if (next.size === all.length) {
        return new Map();
      }
      for (const s of all) {
        next.set(s.identity, s);
      }
      return next;
    });
  }

  async function importSelected() {
    setMessage(null);
    setImporting(true);
    try {
      const items = Array.from(selected.values()).map((s) => ({
        title: s.title,
        artist: s.artist,
        mbid: s.mbid,
      }));
      const res = await fetch(`/api/projects/${id}/songs/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });
      if (res.ok) {
        const data = await res.json();
        setMessage(
          data.imported > 0
            ? `Imported ${data.imported} song${data.imported === 1 ? '' : 's'} into this project.`
            : 'No new songs were imported (they may already exist).',
        );
        await loadExistingKeys();
        setSelected(new Map());
      } else {
        const err = await res.json().catch(() => ({ error: 'Import failed' }));
        setMessage(err.error || 'Import failed');
      }
    } finally {
      setImporting(false);
    }
  }

  async function importAll() {
    setMessage(null);
    setImporting(true);
    try {
      const res = await fetch(`/api/projects/${id}/songs/import-all`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setMessage(
          data.imported > 0
            ? `Imported ${data.imported} song${data.imported === 1 ? '' : 's'} into this project.`
            : 'No new songs to import.',
        );
        await loadExistingKeys();
        setSelected(new Map());
      } else {
        const err = await res.json().catch(() => ({ error: 'Import failed' }));
        setMessage(err.error || 'Import failed');
      }
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Your Repertoire</h2>
        <div className="flex gap-2">
          <button
            className="rounded border px-3 py-2 text-sm"
            onClick={toggleAll}
            disabled={aggregated.length === 0}
            title="Select all available songs"
          >
            {selected.size ===
            aggregated.filter((s) => !existingKeys.has(`${norm(s.title)}::${norm(s.artist)}`))
              .length
              ? 'Unselect all'
              : 'Select all'}
          </button>
          <button
            className="rounded bg-black px-3 py-2 text-white disabled:opacity-60"
            onClick={importSelected}
            disabled={importing || selected.size === 0}
            title="Add selected songs to this project's repertoire"
          >
            {importing ? 'Importing…' : 'Add selected to project'}
          </button>
          <button
            className="rounded bg-black px-3 py-2 text-white disabled:opacity-60"
            onClick={importAll}
            disabled={importing}
            title="Add your entire repertoire to this project"
          >
            {importing ? 'Importing…' : 'Select all and add'}
          </button>
        </div>
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
          className="rounded bg-white px-3 py-2 text-black border"
          onClick={runSearch}
          disabled={searching}
        >
          {searching ? 'Searching…' : 'Search repertoire'}
        </button>
      </div>

      {message && <div className="text-sm text-neutral-600">{message}</div>}
      {error && <div className="text-sm text-red-600">{error}</div>}

      <div className="overflow-auto rounded border bg-black text-white">
        <table className="min-w-full text-sm">
          <thead className="bg-black text-left text-white">
            <tr>
              <th className="p-2 w-8">Sel</th>
              <th className="p-2">Title</th>
              <th className="p-2">Artist</th>
              <th className="p-2">Dur</th>
              <th className="p-2">Key</th>
              <th className="p-2">Projects</th>
            </tr>
          </thead>
          <tbody>
            {aggregated.map((s) => {
              const isExisting = existingKeys.has(`${norm(s.title)}::${norm(s.artist)}`);
              const checked = selected.has(s.identity);
              return (
                <tr key={s.identity} className="border-t">
                  <td className="p-2 align-middle">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(s.identity, s)}
                      disabled={isExisting}
                      title={isExisting ? 'Already in this project' : 'Select song'}
                    />
                  </td>
                  <td className="p-2">{s.title}</td>
                  <td className="p-2 text-neutral-400">{s.artist}</td>
                  <td className="p-2 text-neutral-500">{fmtDur(s.durationSec)}</td>
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
              );
            })}
            {!loading && aggregated.length === 0 && (
              <tr>
                <td colSpan={6} className="p-4 text-sm text-neutral-600">
                  No songs found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div>
        <Link className="text-sm underline" href={`/projects/${id}/repertoire`}>
          ← Back to project repertoire
        </Link>
      </div>
    </div>
  );
}
