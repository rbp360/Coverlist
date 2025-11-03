'use client';
import { useEffect, useMemo, useState } from 'react';

import { InfoPopup } from '../../components/InfoPopup';
import { ThemedAlert } from '../../components/ThemedAlert';

type Result = {
  mbid?: string;
  title: string;
  artist: string;
  durationSec?: number;
  release?: string;
  isrc?: string;
};
type Song = { id: string; title: string; artist: string; mbid?: string };

export default function SongsPage() {
  const [alertMsg, setAlertMsg] = useState<string | null>(null);
  const [repSongs, setRepSongs] = useState<Song[]>([]); // existing songs in repertoire/projects (for de-dupe)
  const [q, setQ] = useState('');
  const [artist, setArtist] = useState('');
  const [genre, setGenre] = useState('');
  const [results, setResults] = useState<Result[]>([]);
  const [page, setPage] = useState(1);
  const [importing, setImporting] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  // Assign a color to each project for consistent coloring
  // (moved inside useEffect to avoid dependency warning)
  const [projects, setProjects] = useState<Array<{ id: string; name: string; color: string }>>([]);
  const [targetProject, setTargetProject] = useState<string>('');
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    const projectColors = ['#22c55e', '#eab308', '#3b82f6', '#f43f5e', '#a21caf', '#f59e42'];
    (async () => {
      // Load current repertoire view (aggregated across projects + global repertoire)
      const rs = await fetch(`/api/repertoire/songs?q=&artist=`);
      if (rs.ok) {
        const data = await rs.json();
        setRepSongs(
          (data.songs || []).map((s: any) => ({
            id: s.id,
            title: s.title,
            artist: s.artist,
            mbid: s.mbid,
          })),
        );
      }
    })();
    (async () => {
      const res = await fetch('/api/projects');
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : data?.projects || [];
        const mapped = list.map((p: any, i: number) => ({
          id: p.id,
          name: p.name,
          color: projectColors[i % projectColors.length],
        }));
        setProjects(mapped);
        if (mapped.length > 0) setTargetProject(mapped[0].id);
      }
    })();
  }, []);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams({ q, limit: '30' });
    if (artist.trim()) params.set('artist', artist.trim());
    if (genre.trim()) params.set('genre', genre.trim());
    const res = await fetch(`/api/musicbrainz/search?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      setResults(data.results || []);
      setPage(1);
    }
  }

  function isImported(r: Result): boolean {
    const norm = (s: string) => s.trim().toLowerCase();
    return repSongs.some((s) =>
      r.mbid && s.mbid
        ? s.mbid === r.mbid
        : norm(s.title) === norm(r.title) && norm(s.artist) === norm(r.artist),
    );
  }

  async function importSong(r: Result) {
    setMessage(null);
    setImporting(r.mbid || `${r.title}|${r.artist}`);
    const res = await fetch('/api/repertoire/songs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: r.title,
        artist: r.artist,
        durationSec: r.durationSec,
        mbid: r.mbid,
        isrc: r.isrc,
      }),
    });
    if (res.ok) {
      const created = await res.json();
      setRepSongs((prev) => [...prev, created]);
      setMessage('Added to repertoire!');
      try {
        alert('Added to repertoire');
      } catch {}
    } else {
      setMessage('Add failed');
    }
    setImporting(null);
  }

  const paged = useMemo(() => results.slice((page - 1) * 10, page * 10), [results, page]);

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-2">
        <h2 className="text-2xl font-semibold">Add Songs</h2>
        {projects.length > 0 && (
          <div className="mb-6 flex items-center gap-3">
            <button
              type="button"
              className="rounded border-2 px-4 py-2 text-base bg-white text-black font-bold"
              style={{ borderColor: '#22c55e' }}
              onClick={() => setShowDropdown((v) => !v)}
            >
              {projects.find((p) => p.id === targetProject)?.name
                ? `Selected project: ${projects.find((p) => p.id === targetProject)?.name}`
                : 'Pick the project'}
            </button>
            {showDropdown && (
              <div className="absolute mt-2 bg-black text-white border-2 border-green-700 rounded shadow-lg z-30">
                {projects.map((p) => (
                  <button
                    key={p.id}
                    className={`block w-full text-left px-4 py-2 font-bold ${targetProject === p.id ? 'bg-gray-200' : ''}`}
                    style={{ color: p.color }}
                    onClick={() => {
                      setTargetProject(p.id);
                      setShowDropdown(false);
                    }}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <form onSubmit={search} className="grid gap-2 md:grid-cols-4">
        <input
          className="rounded border px-3 py-2"
          placeholder="Title (e.g., Wonderwall)"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <input
          className="rounded border px-3 py-2"
          placeholder="Artist (optional)"
          value={artist}
          onChange={(e) => setArtist(e.target.value)}
        />
        <input
          className="rounded border px-3 py-2"
          placeholder="Genre/Tag (optional)"
          value={genre}
          onChange={(e) => setGenre(e.target.value)}
        />
        <button className="rounded bg-black px-3 py-2 text-white">Search</button>
      </form>
      {message && <p className="text-sm text-gray-700">{message}</p>}

      <ul className="divide-y rounded border bg-black text-white">
        {paged.map((r) => {
          const imported = isImported(r);
          const isBusy = importing === (r.mbid || `${r.title}|${r.artist}`);
          return (
            <li
              key={`${r.mbid}-${r.title}-${r.artist}`}
              className="flex items-center justify-between p-3"
            >
              <div>
                <div className="font-medium">
                  {r.title} <span className="text-gray-500">— {r.artist}</span>
                </div>
                {(r.durationSec || r.release) && (
                  <div className="text-sm text-gray-600">
                    {r.durationSec != null && (
                      <>
                        {Math.floor(r.durationSec / 60)}:
                        {String(r.durationSec % 60).padStart(2, '0')}
                        {r.release ? ' • ' : ''}
                      </>
                    )}
                    {r.release && (
                      <span className="text-xs text-gray-500">
                        {r.release.length > 50 ? r.release.slice(0, 50) + '...' : r.release}
                      </span>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  className={`rounded border px-3 py-1 text-sm ${imported ? 'opacity-50 cursor-not-allowed' : ''}`}
                  onClick={() => !imported && !isBusy && importSong(r)}
                  disabled={imported || isBusy}
                  title={imported ? 'Already in your repertoire' : 'Add to my repertoire'}
                >
                  {imported ? 'Already added' : isBusy ? 'Adding…' : 'Add to my repertoire'}
                </button>
                {projects.length > 0 && (
                  <>
                    <button
                      className="rounded border px-3 py-1 text-sm"
                      onClick={async () => {
                        if (!targetProject) return;
                        try {
                          await fetch(`/api/projects/${targetProject}/todo`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              title: r.title,
                              artist: r.artist,
                              durationSec: r.durationSec,
                              mbid: r.mbid,
                              isrc: r.isrc,
                            }),
                          });
                          setAlertMsg('Suggested to project To-Do');
                        } catch {}
                      }}
                      title="Suggest this song to the selected project's To-Do"
                    >
                      Suggest to-do
                    </button>
                    <InfoPopup
                      message={
                        <>
                          This will add the song to <b>your repertoire</b> and also to the selected{' '}
                          <b>project&apos;s repertoire</b> in one click.
                        </>
                      }
                    >
                      <button
                        className="rounded border px-3 py-1 text-sm bg-green-700 text-white hover:bg-green-800 ml-1"
                        onClick={async () => {
                          if (!targetProject) return;
                          try {
                            // Add to repertoire first
                            if (!imported && !isBusy) await importSong(r);
                            // Then add to project
                            await fetch(`/api/projects/${targetProject}/songs`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                title: r.title,
                                artist: r.artist,
                                durationSec: r.durationSec,
                                mbid: r.mbid,
                                isrc: r.isrc,
                              }),
                            });
                            setAlertMsg('Added to your repertoire and project repertoire');
                          } catch {}
                        }}
                      >
                        Send to project
                      </button>
                    </InfoPopup>
                  </>
                )}
              </div>
            </li>
          );
        })}
        {results.length === 0 && (
          <li className="p-4 text-sm text-gray-600">No results yet. Try searching.</li>
        )}
      </ul>
      {results.length > 10 && (
        <div className="mt-2 flex items-center justify-center gap-2">
          <button
            className="rounded border px-2 py-1 text-sm disabled:opacity-50"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Prev
          </button>
          {Array.from({ length: Math.min(3, Math.ceil(results.length / 10)) }, (_, i) => i + 1).map(
            (p) => (
              <button
                key={p}
                className={`rounded border px-2 py-1 text-sm ${page === p ? 'bg-white text-black' : ''}`}
                onClick={() => setPage(p)}
              >
                {p}
              </button>
            ),
          )}
          <button
            className="rounded border px-2 py-1 text-sm disabled:opacity-50"
            onClick={() => setPage((p) => Math.min(Math.ceil(results.length / 10), p + 1))}
            disabled={page >= Math.ceil(results.length / 10)}
          >
            Next
          </button>
        </div>
      )}
      {alertMsg && <ThemedAlert message={alertMsg} onClose={() => setAlertMsg(null)} />}
    </div>
  );
}
