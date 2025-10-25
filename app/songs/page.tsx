'use client';
import { useEffect, useMemo, useState } from 'react';

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
  const [repSongs, setRepSongs] = useState<Song[]>([]); // existing songs in repertoire/projects (for de-dupe)
  const [q, setQ] = useState('');
  const [artist, setArtist] = useState('');
  const [genre, setGenre] = useState('');
  const [results, setResults] = useState<Result[]>([]);
  const [page, setPage] = useState(1);
  const [importing, setImporting] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
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
                    {r.release && <span className="text-xs text-gray-500">{r.release}</span>}
                  </div>
                )}
              </div>
              <button
                className={`rounded border px-3 py-1 text-sm ${imported ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => !imported && !isBusy && importSong(r)}
                disabled={imported || isBusy}
                title={imported ? 'Already in your repertoire' : 'Add to repertoire'}
              >
                {imported ? 'Already added' : isBusy ? 'Adding…' : 'Add to repertoire'}
              </button>
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
    </div>
  );
}
