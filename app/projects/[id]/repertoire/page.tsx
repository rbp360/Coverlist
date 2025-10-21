'use client';
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

export default function RepertoirePage() {
  const { id } = useParams<{ id: string }>();
  const [songs, setSongs] = useState<Song[]>([]);
  const [q, setQ] = useState('');
  const [artist, setArtist] = useState('');
  const [saving, setSaving] = useState<string | null>(null);
  const [enriching, setEnriching] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const qi = q.toLowerCase();
    const ai = artist.toLowerCase();
    return songs.filter(
      (s) =>
        (qi ? s.title.toLowerCase().includes(qi) : true) &&
        (ai ? s.artist.toLowerCase().includes(ai) : true),
    );
  }, [songs, q, artist]);

  async function load() {
    const res = await fetch(
      `/api/projects/${id}/songs?q=${encodeURIComponent(q)}&artist=${encodeURIComponent(artist)}`,
    );
    if (res.ok) setSongs((await res.json()).songs);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function saveField(song: Song, patch: Partial<Song>) {
    setSaving(song.id);
    const res = await fetch(`/api/projects/${id}/songs`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: song.id, ...patch }),
    });
    setSaving(null);
    if (res.ok) {
      const updated = await res.json();
      setSongs((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    }
  }

  async function enrich(song: Song) {
    setEnriching(song.id);
    const res = await fetch(`/api/projects/${id}/songs/enrich`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ songId: song.id }),
    });
    setEnriching(null);
    if (res.ok) {
      const updated = await res.json();
      setSongs((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Repertoire</h2>
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
        <button className="rounded bg-black px-3 py-2 text-white" onClick={load}>
          Search
        </button>
      </div>
      <div className="overflow-auto rounded border bg-black text-white">
        <table className="min-w-full text-sm">
          <thead className="bg-neutral-50 text-left text-neutral-700">
            <tr>
              <th className="p-2">Title</th>
              <th className="p-2">Artist</th>
              <th className="p-2">Dur</th>
              <th className="p-2">Key</th>
              <th className="p-2">Transposed</th>
              <th className="p-2">Tempo</th>
              <th className="p-2">Enrich</th>
              <th className="p-2">Notes</th>
              <th className="p-2">Link</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
              <tr key={s.id} className="border-t">
                <td className="p-2">{s.title}</td>
                <td className="p-2 text-neutral-600">{s.artist}</td>
                <td className="p-2 text-neutral-600">{fmt(s.durationSec)}</td>
                <td className="p-2">
                  <input
                    className="w-24 rounded border px-2 py-1"
                    defaultValue={s.key || ''}
                    onBlur={(e) => saveField(s, { key: e.target.value || undefined })}
                  />
                </td>
                <td className="p-2">
                  <input
                    className="w-24 rounded border px-2 py-1"
                    defaultValue={s.transposedKey || ''}
                    onBlur={(e) => saveField(s, { transposedKey: e.target.value || undefined })}
                  />
                </td>
                <td className="p-2">
                  <input
                    type="number"
                    className="w-20 rounded border px-2 py-1"
                    defaultValue={s.tempo || ''}
                    onBlur={(e) =>
                      saveField(s, { tempo: e.target.value ? Number(e.target.value) : undefined })
                    }
                  />
                </td>
                <td className="p-2">
                  <button
                    className="rounded border px-2 py-1 text-xs"
                    onClick={() => enrich(s)}
                    disabled={enriching === s.id}
                    title="Stub enrichment for key & tempo"
                  >
                    {enriching === s.id ? 'Enriching…' : 'Enrich'}
                  </button>
                </td>
                <td className="p-2">
                  <input
                    className="w-48 rounded border px-2 py-1"
                    defaultValue={s.notes || ''}
                    onBlur={(e) => saveField(s, { notes: e.target.value || undefined })}
                  />
                </td>
                <td className="p-2">
                  <input
                    className="w-56 rounded border px-2 py-1"
                    placeholder="https://..."
                    defaultValue={s.url || ''}
                    onBlur={(e) => saveField(s, { url: e.target.value || undefined })}
                  />
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="p-4 text-neutral-600">
                  No songs found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {saving && <div className="text-sm text-neutral-600">Saving changes…</div>}
    </div>
  );
}
