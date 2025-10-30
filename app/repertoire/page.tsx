'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import TrashIcon from '@/components/TrashIcon';

// Dayglo color palette (Tailwind + custom)
const PROJECT_COLORS = [
  'text-green-400', // green
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

type FlatSong = {
  id: string;
  title: string;
  artist: string;
  projectId: string;
  projectName: string;
  durationSec?: number;
  key?: string;
  mbid?: string;
  isrc?: string;
};

type AggregatedSong = {
  identity: string; // mbid or normalized title|artist
  title: string;
  artist: string;
  durationSec?: number;
  key?: string;
  mbid?: string;
  isrc?: string;
  projects: Array<{ id: string; name: string }>;
};

export default function RepertoireHomePage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [artist, setArtist] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<FlatSong[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({}); // by identity
  const [selectAll, setSelectAll] = useState(false);
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([]);
  const [targetProjectIds, setTargetProjectIds] = useState<string[]>([]);
  const [adding, setAdding] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [todoByProject, setTodoByProject] = useState<Record<string, Set<string>>>({});
  // Sorting state
  const [sortBy, setSortBy] = useState<'title' | 'artist' | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

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
    // Load user projects for add-to-projects
    (async () => {
      const res = await fetch('/api/projects');
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : data?.projects || [];
        const mapped = list.map((p: any) => ({ id: p.id, name: p.name }));
        setProjects(mapped);
        // Load To-Do identities per project to display italics
        const norm = (s: string) => s.trim().toLowerCase();
        const byProj: Record<string, Set<string>> = {};
        await Promise.all(
          mapped.map(async (p: { id: string; name: string }) => {
            try {
              const r = await fetch(`/api/projects/${p.id}/todo`);
              if (!r.ok) return;
              const j = await r.json();
              const set = new Set<string>();
              (j.items || []).forEach((it: any) => {
                const identity = it?.mbid || `${norm(it?.title || '')}|${norm(it?.artist || '')}`;
                if (identity && !set.has(identity)) set.add(identity);
              });
              byProj[p.id] = set;
            } catch {}
          }),
        );
        setTodoByProject(byProj);
      }
    })();
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
        if (!existing.mbid && s.mbid) existing.mbid = s.mbid;
        if (!existing.isrc && s.isrc) existing.isrc = s.isrc;
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
          isrc: s.isrc,
          projects: [{ id: s.projectId, name: s.projectName }],
        });
      }
    }
    let arr = Array.from(map.values());
    if (sortBy) {
      arr = arr.sort((a, b) => {
        const aVal = (a[sortBy] || '').toLowerCase();
        const bVal = (b[sortBy] || '').toLowerCase();
        if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
        return 0;
      });
    } else {
      arr = arr.sort((a, b) => a.title.localeCompare(b.title));
    }
    return arr;
  }, [results, sortBy, sortDir]);

  // Selection helpers
  const toggleSelectAll = () => {
    const nextAll = !selectAll;
    setSelectAll(nextAll);
    if (nextAll) {
      const next: Record<string, boolean> = {};
      for (const s of aggregated) next[s.identity] = true;
      setSelected(next);
    } else {
      setSelected({});
    }
  };

  const toggleOne = (identity: string) => {
    setSelected((prev) => ({ ...prev, [identity]: !prev[identity] }));
  };

  async function addSelectedToProjects() {
    const chosen = aggregated.filter((s) => selected[s.identity]);
    if (chosen.length === 0 || targetProjectIds.length === 0) return;
    setAdding(true);
    try {
      const items = chosen.map((s) => ({
        title: s.title,
        artist: s.artist,
        durationSec: s.durationSec,
        mbid: s.mbid,
        isrc: s.isrc,
      }));
      for (const pid of targetProjectIds) {
        await fetch(`/api/projects/${pid}/songs/import-from-repertoire`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items }),
        });
      }
      // Clear selection on success
      setSelected({});
      setSelectAll(false);
      alert('Songs added to selected projects');
    } catch (e) {
      console.error(e);
      alert('Failed to add to projects');
    } finally {
      setAdding(false);
    }
  }

  async function suggestSelectedToTodo() {
    const chosen = aggregated.filter((s) => selected[s.identity]);
    if (chosen.length === 0 || targetProjectIds.length === 0) return;
    setSuggesting(true);
    try {
      const items = chosen.map((s) => ({
        title: s.title,
        artist: s.artist,
        durationSec: s.durationSec,
        mbid: s.mbid,
        isrc: s.isrc,
      }));
      for (const pid of targetProjectIds) {
        await fetch(`/api/projects/${pid}/todo`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items }),
        });
      }
      setSelected({});
      setSelectAll(false);
      alert('Suggestions added to project To-Do');
    } catch (e) {
      console.error(e);
      alert('Failed to add suggestions');
    } finally {
      setSuggesting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">My Repertoire</h2>
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
      </div>

      <div className="rounded border bg-black text-white">
        <table className="min-w-full text-sm">
          <thead className="bg-black text-left text-white">
            <tr>
              <th className="p-2 w-8">
                <input
                  type="checkbox"
                  checked={selectAll}
                  onChange={toggleSelectAll}
                  aria-label="Select all songs"
                />
              </th>
              <th
                className="p-2 cursor-pointer select-none hover:underline"
                onClick={() => {
                  if (sortBy === 'title') {
                    setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
                  } else {
                    setSortBy('title');
                    setSortDir('asc');
                  }
                }}
                title="Sort by title"
              >
                Title
                {sortBy === 'title' ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}
              </th>
              <th
                className="p-2 cursor-pointer select-none hover:underline"
                onClick={() => {
                  if (sortBy === 'artist') {
                    setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
                  } else {
                    setSortBy('artist');
                    setSortDir('asc');
                  }
                }}
                title="Sort by artist"
              >
                Artist
                {sortBy === 'artist' ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}
              </th>
              <th className="p-2">Dur</th>
              <th className="p-2">Key</th>
              <th className="p-2">Projects</th>
              <th className="p-2 w-8">Remove</th>
            </tr>
          </thead>
          <tbody>
            {aggregated.map((s) => (
              <tr key={s.identity} className="border-t">
                <td className="p-2">
                  <input
                    type="checkbox"
                    checked={!!selected[s.identity]}
                    onChange={() => toggleOne(s.identity)}
                    aria-label={`Select ${s.title} — ${s.artist}`}
                  />
                </td>
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
                    {s.projects
                      .filter((p) => p.id)
                      .map((p) => (
                        <Link
                          key={p.id}
                          className={`rounded border px-2 py-0.5 text-xs underline ${getProjectColor(p.id, projects)}`}
                          href={`/projects/${p.id}/repertoire`}
                        >
                          {p.name}
                        </Link>
                      ))}
                    {projects
                      .filter(
                        (p) =>
                          todoByProject[p.id]?.has(s.identity) &&
                          !s.projects.some((sp) => sp.id === p.id),
                      )
                      .map((p) => (
                        <span
                          key={`todo-${p.id}`}
                          className={`rounded border px-2 py-0.5 text-xs italic ${getProjectColor(p.id, projects)}`}
                          title="On project To-Do"
                        >
                          {p.name}
                        </span>
                      ))}
                  </div>
                </td>
                <td className="p-2">
                  <button
                    className="text-red-500 hover:text-red-700 p-1"
                    title="Remove from my repertoire"
                    onClick={async () => {
                      if (
                        !window.confirm(`Remove '${s.title}' by ${s.artist} from your repertoire?`)
                      )
                        return;
                      try {
                        const res = await fetch(
                          `/api/repertoire/songs/${encodeURIComponent(s.identity)}`,
                          {
                            method: 'DELETE',
                          },
                        );
                        if (res.ok) {
                          setResults((prev) =>
                            prev.filter((song) => {
                              const norm = (str: string) => str.trim().toLowerCase();
                              const identity =
                                song.mbid || `${norm(song.title)}|${norm(song.artist)}`;
                              return identity !== s.identity;
                            }),
                          );
                        } else {
                          alert('Failed to remove song');
                        }
                      } catch {
                        alert('Failed to remove song');
                      }
                    }}
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
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

      {/* Add to projects / suggest to To-Do controls in a card */}
      <div className="rounded border bg-black p-4 mt-4 flex flex-wrap items-center gap-2">
        <label className="text-sm text-neutral-300">Add selected to projects:</label>
        <select
          className="rounded border bg-black px-2 py-1 text-white"
          multiple
          value={targetProjectIds}
          onChange={(e) =>
            setTargetProjectIds(Array.from(e.target.selectedOptions).map((o) => o.value))
          }
          aria-label="Choose projects to add the selected songs to"
          style={{ minWidth: 180, maxWidth: 320 }}
        >
          {projects.map((p) => (
            <option key={p.id} value={p.id} className={getProjectColor(p.id, projects)}>
              {p.name}
            </option>
          ))}
          {projects.length === 0 && (
            <option value="" disabled>
              No projects
            </option>
          )}
        </select>
        <button
          className="rounded border px-3 py-1 text-sm disabled:opacity-50"
          disabled={
            adding || targetProjectIds.length === 0 || !Object.values(selected).some(Boolean)
          }
          onClick={addSelectedToProjects}
        >
          {adding ? 'Adding…' : 'Add to projects'}
        </button>
        <button
          className="rounded border px-3 py-1 text-sm disabled:opacity-50"
          disabled={
            suggesting || targetProjectIds.length === 0 || !Object.values(selected).some(Boolean)
          }
          onClick={suggestSelectedToTodo}
          title="Suggest selected songs to the chosen project's To-Do list"
        >
          {suggesting ? 'Suggesting…' : 'Suggest to project To-Do'}
        </button>
      </div>

      <div className="text-xs text-neutral-500">
        Tip: Underlined project names mean the song is in that project’s repertoire. Italic names
        mean it’s only on that project’s To-Do list (see the project’s Rehearsal page).
      </div>
    </div>
  );
}
