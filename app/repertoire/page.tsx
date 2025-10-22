'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

type Song = {
  id: string;
  title: string;
  artist: string;
  projectId: string;
  projectName: string;
  durationSec?: number;
};

export default function RepertoireHomePage() {
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [artist, setArtist] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<Song[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/projects');
        if (!res.ok) {
          setError(
            res.status === 401
              ? 'Please sign in to view your repertoire.'
              : 'Failed to load projects',
          );
          setLoading(false);
          return;
        }
        const data = await res.json();
        setProjects(data || []);
      } catch (e) {
        setError('Failed to load projects');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function runSearch() {
    setSearching(true);
    try {
      const res = await fetch(
        `/api/repertoire/songs?q=${encodeURIComponent(q)}&artist=${encodeURIComponent(artist)}`,
      );
      if (res.ok) {
        const data = await res.json();
        setResults(data.songs || []);
      }
    } finally {
      setSearching(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Your Repertoire</h2>
      </div>
      <p className="text-sm text-neutral-500">
        Search your entire repertoire across all projects. From here, jump into a project to manage
        or add songs.
      </p>
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
      {results.length > 0 && (
        <div className="overflow-auto rounded border bg-black text-white">
          <table className="min-w-full text-sm">
            <thead className="bg-black text-left text-white">
              <tr>
                <th className="p-2">Title</th>
                <th className="p-2">Artist</th>
                <th className="p-2">Project</th>
              </tr>
            </thead>
            <tbody>
              {results.map((s) => (
                <tr key={`${s.id}:${s.projectId}`} className="border-t">
                  <td className="p-2">{s.title}</td>
                  <td className="p-2 text-neutral-600">{s.artist}</td>
                  <td className="p-2">
                    <Link className="underline" href={`/projects/${s.projectId}/repertoire`}>
                      {s.projectName}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {loading && <div className="text-sm text-neutral-600">Loading…</div>}
      {error && <div className="text-sm text-red-600">{error}</div>}
      {!loading && !error && (
        <ul className="divide-y rounded border bg-black text-white">
          {projects.map((p) => (
            <li key={p.id} className="flex items-center justify-between p-3">
              <div className="font-medium">{p.name}</div>
              <div className="flex items-center gap-2">
                <Link
                  className="rounded border px-3 py-1 text-sm"
                  href={`/projects/${p.id}/repertoire`}
                >
                  Open Repertoire
                </Link>
                <Link
                  className="rounded border px-3 py-1 text-sm"
                  href={`/projects/${p.id}/setlists`}
                >
                  Setlists
                </Link>
              </div>
            </li>
          ))}
          {projects.length === 0 && (
            <li className="p-4 text-sm text-neutral-600">No projects yet.</li>
          )}
        </ul>
      )}
    </div>
  );
}
