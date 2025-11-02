'use client';
import { useParams } from 'next/navigation';
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
  transposedKey?: string;
};
type Setlist = {
  id: string;
  name: string;
  items: Item[];
  projectId: string;
};
type Song = {
  id: string;
  title: string;
  artist: string;
  durationSec?: number;
};

function reorder<T>(list: T[], startIndex: number, endIndex: number): T[] {
  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);
  return result;
}

export default function SetlistEditorPage() {
  const { id } = useParams<{ id: string }>();
  const [setlist, setSetlist] = useState<Setlist | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/setlists/${id}`);
        if (!res.ok) throw new Error('Failed to load setlist');
        const s = await res.json();
        if (!cancelled) setSetlist(s);
        // Fetch project songs
        const songRes = await fetch(`/api/projects/${s.projectId}/songs`);
        if (songRes.ok) {
          const songList = await songRes.json();
          if (!cancelled) setSongs(Array.isArray(songList) ? songList : []);
        }
      } catch (e: any) {
        if (!cancelled) setError(e.message || 'Unknown error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const sortedItems = useMemo(() => {
    return [...(setlist?.items || [])].sort((a, b) => a.order - b.order);
  }, [setlist]);

  async function saveItems(nextItems: Item[]) {
    if (!setlist) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/setlists/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...setlist, items: nextItems }),
      });
      if (!res.ok) throw new Error('Failed to save setlist');
      const updated = await res.json();
      setSetlist(updated);
    } catch (e: any) {
      alert(e.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  function onDragStart(idx: number) {
    setDragIdx(idx);
  }
  function onDragOver(idx: number, e: React.DragEvent) {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    const next = reorder(sortedItems, dragIdx, idx);
    // Update order fields
    next.forEach((item, i) => (item.order = i));
    setSetlist((prev) => prev && { ...prev, items: next });
    setDragIdx(idx);
  }
  function onDragEnd() {
    setDragIdx(null);
    if (setlist) saveItems(sortedItems);
  }

  function addItem(type: Item['type']) {
    if (!setlist) return;
    const newItem: Item = {
      id: Math.random().toString(36).slice(2),
      type,
      order: sortedItems.length,
    };
    const next = [...sortedItems, newItem];
    saveItems(next);
  }

  function removeItem(idx: number) {
    if (!setlist) return;
    const next = sortedItems.filter((_, i) => i !== idx).map((item, i) => ({ ...item, order: i }));
    saveItems(next);
  }

  function updateItem(idx: number, changes: Partial<Item>) {
    if (!setlist) return;
    const next = sortedItems.map((item, i) => (i === idx ? { ...item, ...changes } : item));
    saveItems(next);
  }

  if (loading) return <div className="p-8">Loading…</div>;
  if (error) return <div className="p-8 text-red-500">Error: {error}</div>;
  if (!setlist) return <div className="p-8">Setlist not found</div>;

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-4">Setlist Editor</h1>
      <p className="mb-2">
        Setlist: <span className="font-mono">{setlist.name}</span>
      </p>
      <div className="mb-4 flex gap-2">
        <button className="rounded border px-3 py-1" onClick={() => addItem('song')}>
          Add Song
        </button>
        <button className="rounded border px-3 py-1" onClick={() => addItem('note')}>
          Add Note
        </button>
        <button className="rounded border px-3 py-1" onClick={() => addItem('break')}>
          Add Break
        </button>
        <button className="rounded border px-3 py-1" onClick={() => addItem('section')}>
          Add Section
        </button>
      </div>
      <div className="rounded border bg-white text-black p-4">
        {sortedItems.length === 0 && <div className="text-neutral-400">No items in setlist.</div>}
        <ul>
          {sortedItems.map((item, idx) => (
            <li
              key={item.id}
              className="flex items-center gap-2 border-b py-2"
              draggable
              onDragStart={() => onDragStart(idx)}
              onDragOver={(e) => onDragOver(idx, e)}
              onDragEnd={onDragEnd}
              style={{ opacity: dragIdx === idx ? 0.5 : 1, cursor: 'grab' }}
            >
              <span className="w-20 font-mono text-xs text-neutral-500">{item.type}</span>
              {item.type === 'song' ? (
                <>
                  <select
                    className="border rounded px-2 py-1 mr-2"
                    value={item.songId || ''}
                    onChange={(e) => updateItem(idx, { songId: e.target.value })}
                  >
                    <option value="">Select song…</option>
                    {songs.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.title} — {s.artist}
                      </option>
                    ))}
                  </select>
                  <input
                    className="border rounded px-2 py-1 mr-2 w-32"
                    placeholder="Override title"
                    value={item.title || ''}
                    onChange={(e) => updateItem(idx, { title: e.target.value })}
                  />
                  <input
                    className="border rounded px-2 py-1 mr-2 w-24"
                    placeholder="Override artist"
                    value={item.artist || ''}
                    onChange={(e) => updateItem(idx, { artist: e.target.value })}
                  />
                </>
              ) : item.type === 'note' ? (
                <input
                  className="border rounded px-2 py-1 mr-2 w-64"
                  placeholder="Note text"
                  value={item.note || ''}
                  onChange={(e) => updateItem(idx, { note: e.target.value })}
                />
              ) : item.type === 'break' ? (
                <input
                  className="border rounded px-2 py-1 mr-2 w-32"
                  placeholder="Break title"
                  value={item.title || ''}
                  onChange={(e) => updateItem(idx, { title: e.target.value })}
                />
              ) : item.type === 'section' ? (
                <input
                  className="border rounded px-2 py-1 mr-2 w-32"
                  placeholder="Section title"
                  value={item.title || ''}
                  onChange={(e) => updateItem(idx, { title: e.target.value })}
                />
              ) : null}
              <button
                className="ml-auto rounded border px-2 py-1 text-xs text-red-600"
                onClick={() => removeItem(idx)}
                disabled={saving}
                title="Remove item"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      </div>
      {saving && <div className="mt-2 text-sm text-neutral-500">Saving…</div>}
    </div>
  );
}
