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

function formatKey(key?: string) {
  if (!key) return '';
  return key.charAt(0).toUpperCase() + key.slice(1).toLowerCase();
}

export default function RepertoirePage() {
  const { id } = useParams<{ id: string }>();
  const [songs, setSongs] = useState<Song[]>([]);
  const [q, setQ] = useState('');
  const [artist, setArtist] = useState('');
  const [saving, setSaving] = useState<string | null>(null);
  const [enriching, setEnriching] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

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
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-2xl font-semibold">Repertoire</h2>
        <button
          className="rounded bg-black px-3 py-2 text-white disabled:opacity-60"
          onClick={async () => {
            setImportMsg(null);
            setImporting(true);
            try {
              const res = await fetch(`/api/projects/${id}/songs/import-all`, { method: 'POST' });
              if (res.ok) {
                const data = await res.json();
                setImportMsg(
                  data.imported > 0
                    ? `Imported ${data.imported} song${data.imported === 1 ? '' : 's'} from your repertoire.`
                    : 'No new songs to import from your repertoire.',
                );
                await load();
              } else {
                const err = await res.json().catch(() => ({ error: 'Import failed' }));
                setImportMsg(err.error || 'Import failed');
              }
            } finally {
              setImporting(false);
            }
          }}
          disabled={importing}
          title="Add all songs you have across your other projects into this project's repertoire"
        >
          {importing ? 'Importing…' : 'import all songs in your repertoire'}
        </button>
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
          <thead className="bg-black text-left text-white">
            <tr>
              <th className="p-2 w-10">&nbsp;</th>
              <th className="p-2">Title</th>
              <th className="p-2">Artist</th>
              <th className="p-2">Dur</th>
              <th className="p-2">Key</th>
              <th className="p-2">Tempo</th>
              <th className="p-2">attempt auto</th>
              <th className="p-2">Notes</th>
              <th className="p-2">Link</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
              <tr key={s.id} className="border-t">
                <td className="p-2">
                  <button
                    className="rounded border p-1 text-xs hover:bg-neutral-100"
                    aria-label={`Delete ${s.title} by ${s.artist}`}
                    title="Delete this song from the repertoire"
                    onClick={async () => {
                      const confirmed = window.confirm(
                        `Delete \"${s.title}\" by ${s.artist}? This cannot be undone.`,
                      );
                      if (!confirmed) return;
                      setDeleting(s.id);
                      const res = await fetch(`/api/projects/${id}/songs`, {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ songId: s.id }),
                      });
                      setDeleting(null);
                      if (res.ok) {
                        setSongs((prev) => prev.filter((x) => x.id !== s.id));
                      }
                    }}
                    disabled={deleting === s.id}
                  >
                    {deleting === s.id ? (
                      '…'
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="h-4 w-4"
                      >
                        <path d="M9 3a1 1 0 0 0-1 1v1H5.5a1 1 0 1 0 0 2H6v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7h.5a1 1 0 1 0 0-2H16V4a1 1 0 0 0-1-1H9zm2 2h2V4h-2v1zM8 7h10v12a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V7zm3 3a1 1 0 1 0-2 0v7a1 1 0 1 0 2 0v-7zm5 0a1 1 0 1 0-2 0v7a1 1 0 1 0 2 0v-7z" />
                      </svg>
                    )}
                  </button>
                </td>
                <td className="p-2">{s.title}</td>
                <td className="p-2 text-neutral-600">{s.artist}</td>
                <td className="p-2 text-neutral-600">{fmt(s.durationSec)}</td>
                <td className="p-2">
                  <input
                    className="w-24 rounded border px-2 py-1 font-mono"
                    style={{
                      fontFamily:
                        'ui-monospace, SFMono-Regular, "SF Mono", Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                    }}
                    defaultValue={formatKey(s.key)}
                    onBlur={(e) => saveField(s, { key: formatKey(e.target.value) || undefined })}
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
                    title="Generate key & tempo (AI)"
                  >
                    {enriching === s.id ? 'Generating…' : 'Generate info from AI'}
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
      <div className="space-y-1">
        {saving && <div className="text-sm text-neutral-600">Saving changes…</div>}
        {importMsg && <div className="text-sm text-neutral-600">{importMsg}</div>}
      </div>
    </div>
  );
}
