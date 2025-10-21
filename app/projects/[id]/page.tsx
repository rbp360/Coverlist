"use client";
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

type Result = { mbid?: string; title: string; artist: string; durationSec?: number };

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Result[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch(`/api/musicbrainz/search?q=${encodeURIComponent(q)}`);
    if (res.ok) setResults((await res.json()).results);
  }

  async function importSong(r: Result) {
    setMessage(null);
    const res = await fetch('/api/songs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: id, title: r.title, artist: r.artist, durationSec: r.durationSec, mbid: r.mbid })
    });
    setMessage(res.ok ? 'Imported!' : 'Import failed');
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Project</h2>
        <div className="flex gap-2 text-sm">
          <Link className="rounded border px-3 py-1" href={`/projects/${id}/setlists`}>Setlists</Link>
        </div>
      </div>
      <form onSubmit={search} className="flex gap-2">
        <input className="flex-1 rounded border px-3 py-2" placeholder="Search songs (MusicBrainz)" value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="rounded bg-black px-3 py-2 text-white">Search</button>
      </form>
      {message && <p className="text-sm text-gray-700">{message}</p>}
      <ul className="divide-y rounded border bg-white">
        {results.map((r) => (
          <li key={`${r.mbid}-${r.title}-${r.artist}`} className="flex items-center justify-between p-3">
            <div>
              <div className="font-medium">{r.title} <span className="text-gray-500">— {r.artist}</span></div>
              {r.durationSec && <div className="text-sm text-gray-600">{Math.floor(r.durationSec/60)}:{String(r.durationSec%60).padStart(2, '0')}</div>}
            </div>
            <button className="rounded border px-3 py-1 text-sm" onClick={() => importSong(r)}>Import</button>
          </li>
        ))}
        {results.length === 0 && <li className="p-4 text-sm text-gray-600">No results yet. Try searching.</li>}
      </ul>
    </div>
  );
}
