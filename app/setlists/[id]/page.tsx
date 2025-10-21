'use client';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

type Item = {
  id: string;
  type: 'song' | 'break' | 'note' | 'section';
  order: number;
  title?: string;
  artist?: string;
  durationSec?: number;
  songId?: string;
  note?: string;
};
type Setlist = {
  id: string;
  name: string;
  showArtist: boolean;
  items: Item[];
  projectId?: string;
  date?: string;
  venue?: string;
  addGapAfterEachSong?: boolean;
};
type Song = { id: string; title: string; artist: string; durationSec?: number; key?: string; tempo?: number };

function fmt(sec?: number) {
  if (!sec) return '0:00';
  const m = Math.floor(sec / 60);
  const s = String(sec % 60).padStart(2, '0');
  return `${m}:${s}`;
}

export default function SetlistEditorPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [setlist, setSetlist] = useState<Setlist | null>(null);
  const [breakTitle, setBreakTitle] = useState('Break');
  const [breakMin, setBreakMin] = useState(10);
  const [noteText, setNoteText] = useState('');
  const [songs, setSongs] = useState<Song[]>([]);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [sectionTitle, setSectionTitle] = useState('Set 1');
  const [settings, setSettings] = useState<{ defaultSongGapSec: number } | null>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/setlists/${id}`);
      if (res.ok) {
        const s = await res.json();
        setSetlist(s);
        if (s.projectId) {
          const rs = await fetch(`/api/projects/${s.projectId}/songs`);
          if (rs.ok) setSongs((await rs.json()).songs);
        }
        const st = await fetch('/api/settings');
        if (st.ok) setSettings(await st.json());
      }
    })();
  }, [id]);

  const total = useMemo(() => {
    const base = (setlist?.items || []).reduce((sum, it) => sum + (it.durationSec || 0), 0);
    if (!setlist?.addGapAfterEachSong || !settings) return base;
    const songCount = (setlist.items || []).filter((i) => i.type === 'song').length;
    return base + songCount * settings.defaultSongGapSec;
  }, [setlist, settings]);

  const sortedItems = useMemo(() => {
    return [...(setlist?.items || [])].sort((a, b) => a.order - b.order);
  }, [setlist]);

  function sectionDurationFrom(index: number) {
    const items = sortedItems;
    let sum = 0;
    let songs = 0;
    for (let i = index + 1; i < items.length; i++) {
      const it = items[i];
      if (it.type === 'section') break;
      if (it.durationSec) sum += it.durationSec;
      if (it.type === 'song') songs += 1;
    }
    if (setlist?.addGapAfterEachSong && settings) sum += songs * settings.defaultSongGapSec;
    return sum;
  }

  async function save(next: Partial<Setlist>) {
    if (!setlist) return;
    const res = await fetch(`/api/setlists/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(next),
    });
    if (res.ok) setSetlist(await res.json());
  }

  function addBreak() {
    if (!setlist) return;
    const items = [...setlist.items];
    const order = items.length ? Math.max(...items.map((i) => i.order)) + 1 : 0;
    const item: Item = {
      id: crypto.randomUUID(),
      type: 'break',
      order,
      title: breakTitle,
      durationSec: breakMin * 60,
    };
    save({ items: [...items, item] as any });
  }

  function addNote() {
    if (!setlist || !noteText.trim()) return;
    const items = [...setlist.items];
    const order = items.length ? Math.max(...items.map((i) => i.order)) + 1 : 0;
    const item: Item = { id: crypto.randomUUID(), type: 'note', order, note: noteText.trim() };
    save({ items: [...items, item] as any });
    setNoteText('');
  }

  function addSection() {
    if (!setlist || !sectionTitle.trim()) return;
    const items = [...setlist.items];
    const order = items.length ? Math.max(...items.map((i) => i.order)) + 1 : 0;
    const item: Item = {
      id: crypto.randomUUID(),
      type: 'section',
      order,
      title: sectionTitle.trim(),
    };
    save({ items: [...items, item] as any });
  }

  async function removeItem(itemId: string) {
    if (!setlist) return;
    const items = sortedItems
      .filter((i) => i.id !== itemId)
      .map((i, idx) => ({ ...i, order: idx }));
    await save({ items: items as any });
  }

  async function toggleArtist() {
    if (!setlist) return;
    await save({ showArtist: !setlist.showArtist });
  }

  function onDragStart(e: React.DragEvent<HTMLLIElement>, id: string) {
    setDragId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  }

  function onDragOver(e: React.DragEvent<HTMLLIElement>, id: string) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (overId !== id) setOverId(id);
  }

  function onDragLeave() {
    setOverId(null);
  }

  async function onDrop(e: React.DragEvent<HTMLLIElement>, targetId: string) {
    e.preventDefault();
    const sourceId = dragId || e.dataTransfer.getData('text/plain');
    setOverId(null);
    setDragId(null);
    if (!setlist || !sourceId || sourceId === targetId) return;
    const items = [...sortedItems];
    const fromIdx = items.findIndex((i) => i.id === sourceId);
    const toIdx = items.findIndex((i) => i.id === targetId);
    if (fromIdx === -1 || toIdx === -1) return;
    const [moved] = items.splice(fromIdx, 1);
    items.splice(toIdx, 0, moved);
    const reindexed = items.map((i, idx) => ({ ...i, order: idx }));
    await save({ items: reindexed as any });
  }

  function addSong(song: Song) {
    if (!setlist) return;
    const items = [...setlist.items];
    const order = items.length ? Math.max(...items.map((i) => i.order)) + 1 : 0;
    const item: Item = {
      id: crypto.randomUUID(),
      type: 'song',
      order,
      songId: song.id,
      title: song.title,
      artist: song.artist,
      durationSec: song.durationSec,
    };
    save({ items: [...items, item] as any });
  }

  async function del() {
    if (!setlist) return;
    if (!confirm('Delete setlist?')) return;
    const res = await fetch(`/api/setlists/${setlist.id}`, { method: 'DELETE' });
    if (res.ok) router.push(`/projects/${(setlist as any).projectId}/setlists`);
  }

  async function copyNow() {
    if (!setlist) return;
    const res = await fetch(`/api/setlists/${setlist.id}/copy`, { method: 'POST' });
    if (res.ok) {
      const created = await res.json();
      router.push(`/setlists/${created.id}`);
    }
  }

  async function copyJson() {
    if (!setlist) return;
    try {
      const data = {
        name: setlist.name,
        showArtist: setlist.showArtist,
        date: setlist.date,
        venue: setlist.venue,
        addGapAfterEachSong: setlist.addGapAfterEachSong,
        items: sortedItems.map((i) => ({
          type: i.type,
          songId: i.songId,
          title: i.title,
          artist: i.artist,
          durationSec: i.durationSec,
          note: i.note,
          order: i.order,
        })),
      };
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      alert('Setlist JSON copied to clipboard');
    } catch {
      alert('Copy failed');
    }
  }

  if (!setlist) return <div>Loading…</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">{setlist.name}</h2>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Total: {fmt(total)}</span>
          {setlist.addGapAfterEachSong && settings && (
            <span className="text-xs text-gray-500">(+{settings.defaultSongGapSec}s per song)</span>
          )}
          <button className="rounded border px-3 py-1 text-sm" onClick={toggleArtist}>
            {setlist.showArtist ? 'Hide' : 'Show'} artist
          </button>
          <a className="rounded border px-3 py-1 text-sm" href="/settings">
            Settings
          </a>
          <button className="rounded border px-3 py-1 text-sm" onClick={copyJson}>
            Copy JSON
          </button>
          <button className="rounded border px-3 py-1 text-sm" onClick={copyNow}>
            Copy
          </button>
          <button
            className="rounded border border-red-600 px-3 py-1 text-sm text-red-700"
            onClick={del}
          >
            Delete
          </button>
        </div>
      </div>

      <div className="grid gap-2 md:grid-cols-3">
        <label className="flex items-center gap-2 text-sm">
          <span className="w-16 text-neutral-400">Date</span>
          <input
            type="date"
            className="flex-1 rounded border px-2 py-1"
            defaultValue={setlist.date || ''}
            onBlur={(e) => save({ date: e.target.value || undefined })}
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <span className="w-16 text-neutral-400">Venue</span>
          <input
            className="flex-1 rounded border px-2 py-1"
            defaultValue={setlist.venue || ''}
            onBlur={(e) => save({ venue: e.target.value || undefined })}
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <span className="w-56 text-neutral-400">Add gap after each song</span>
          <input
            type="checkbox"
            checked={!!setlist.addGapAfterEachSong}
            onChange={(e) => save({ addGapAfterEachSong: e.target.checked })}
          />
          <span className="text-xs text-neutral-500">
            {settings?.defaultSongGapSec ?? 0}s per song
          </span>
        </label>
      </div>

      <div className="rounded border bg-white">
        <ul className="divide-y">
          {sortedItems.map((it) => (
            <li
              key={it.id}
              draggable
              onDragStart={(e) => onDragStart(e, it.id)}
              onDragOver={(e) => onDragOver(e, it.id)}
              onDragLeave={onDragLeave}
              onDrop={(e) => onDrop(e, it.id)}
              className={`flex items-center justify-between p-3 ${overId === it.id ? 'bg-yellow-50' : ''}`}
            >
              <div>
                {it.type === 'song' && (
                  <div className="font-medium">
                    {it.title}
                    {setlist.showArtist && it.artist && (
                      <span className="text-gray-500"> — {it.artist}</span>
                    )}
                    {(() => {
                      const song = songs.find((s) => s.id === it.songId);
                      if (!song) return null;
                      const bits: string[] = [];
                      if (song.key) bits.push(song.key);
                      if (song.tempo) bits.push(`${song.tempo} bpm`);
                      if (bits.length === 0) return null;
                      return <div className="text-sm text-neutral-600">{bits.join(' • ')}</div>;
                    })()}
                  </div>
                )}
                {it.type === 'break' && (
                  <div className="font-medium">
                    Break: {it.title} <span className="text-gray-500">({fmt(it.durationSec)})</span>
                  </div>
                )}
                {it.type === 'note' && <div className="text-sm text-gray-700">Note: {it.note}</div>}
                {it.type === 'section' && (
                  <div className="flex items-baseline gap-3">
                    <div className="font-semibold uppercase tracking-wide text-neutral-500">
                      {it.title}
                    </div>
                    <div className="text-xs text-neutral-500">
                      Section total:{' '}
                      {fmt(sectionDurationFrom(sortedItems.findIndex((x) => x.id === it.id)))}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                {it.durationSec ? (
                  <span className="text-sm text-gray-500">{fmt(it.durationSec)}</span>
                ) : (
                  <span />
                )}
                <button
                  className="rounded border px-2 py-1 text-xs"
                  onClick={() => removeItem(it.id)}
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
          {setlist.items.length === 0 && (
            <li className="p-4 text-sm text-gray-600">
              No items yet. Add a break or note for now.
            </li>
          )}
        </ul>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded border p-3">
          <div className="mb-2 font-medium">Add Song</div>
          <ul className="max-h-72 divide-y overflow-auto">
            {songs.map((s) => (
              <li key={s.id} className="flex items-center justify-between p-2">
                <div>
                  <div className="text-sm font-medium">
                    {s.title} <span className="text-gray-500">— {s.artist}</span>
                  </div>
                  {s.durationSec ? (
                    <div className="text-xs text-gray-600">{fmt(s.durationSec)}</div>
                  ) : null}
                </div>
                <button className="rounded border px-2 py-1 text-xs" onClick={() => addSong(s)}>
                  Add
                </button>
              </li>
            ))}
            {songs.length === 0 && (
              <li className="p-2 text-sm text-gray-600">No songs in repertoire yet.</li>
            )}
          </ul>
        </div>
        <div className="rounded border p-3">
          <div className="mb-2 font-medium">Add Break</div>
          <div className="flex gap-2">
            <input
              className="flex-1 rounded border px-3 py-2"
              value={breakTitle}
              onChange={(e) => setBreakTitle(e.target.value)}
            />
            <input
              type="number"
              className="w-24 rounded border px-3 py-2"
              value={breakMin}
              onChange={(e) => setBreakMin(parseInt(e.target.value) || 0)}
            />
            <button className="rounded bg-black px-3 py-2 text-white" onClick={addBreak}>
              Add
            </button>
          </div>
          <div className="mt-1 text-xs text-gray-600">Minutes</div>
        </div>

        <div className="rounded border p-3">
          <div className="mb-2 font-medium">Add Note</div>
          <div className="flex gap-2">
            <input
              className="flex-1 rounded border px-3 py-2"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
            />
            <button className="rounded bg-black px-3 py-2 text-white" onClick={addNote}>
              Add
            </button>
          </div>
        </div>

        <div className="rounded border p-3">
          <div className="mb-2 font-medium">Add Section</div>
          <div className="flex gap-2">
            <input
              className="flex-1 rounded border px-3 py-2"
              value={sectionTitle}
              onChange={(e) => setSectionTitle(e.target.value)}
            />
            <button className="rounded bg-black px-3 py-2 text-white" onClick={addSection}>
              Add
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
