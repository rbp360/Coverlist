'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

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

export default function RehearsalPage() {
  const { id } = useParams<{ id: string }>();
  const [songs, setSongs] = useState<Song[]>([]);
  const [projectName, setProjectName] = useState<string>('');
  const [q, setQ] = useState('');
  const [artist, setArtist] = useState('');
  const [practice, setPractice] = useState<Record<string, { passes: number; rating: number }>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [playlistUrl, setPlaylistUrl] = useState<string | null>(null);

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
          const m: Record<string, { passes: number; rating: number }> = {};
          (data.entries || []).forEach((e: any) => {
            m[e.songId] = { passes: e.passes ?? 0, rating: e.rating ?? 0 };
          });
          setPractice(m);
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
        setPractice((prev) => ({
          ...prev,
          [songId]: { passes: saved.passes ?? 0, rating: saved.rating ?? 0 },
        }));
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
        setPractice((prev) => ({
          ...prev,
          [songId]: { passes: saved.passes ?? 0, rating: saved.rating ?? 0 },
        }));
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
                  <div className="flex items-center gap-1">
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
                <td className="p-2 max-w-[24rem] truncate" title={s.notes || ''}>
                  {s.notes || ''}
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
                <td colSpan={5} className="p-4 text-neutral-600">
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
    </div>
  );
}
