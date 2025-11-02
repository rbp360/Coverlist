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
  // Editor controls
  const [breakTitle, setBreakTitle] = useState<string>('Break');
  const [breakMin, setBreakMin] = useState<number>(10);
  const [noteText, setNoteText] = useState<string>('');
  const [sectionTitle, setSectionTitle] = useState<string>('Set 1');
  const [setCountInput, setSetCountInput] = useState<number>(0);
  const [encoreCountInput, setEncoreCountInput] = useState<number>(0);
  const [songSearch, setSongSearch] = useState<string>('');
  // Persist PDF font size across sessions
  const [pdfFontSize, setPdfFontSize] = useState<number>(1.0);
  useEffect(() => {
    try {
      const v = localStorage.getItem('pdf-font-size');
      if (v) setPdfFontSize(Math.max(0.6, Math.min(1.6, parseFloat(v))));
    } catch {}
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem('pdf-font-size', String(pdfFontSize));
    } catch {}
  }, [pdfFontSize]);

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
          const data = await songRes.json();
          const list = Array.isArray(data) ? data : Array.isArray(data?.songs) ? data.songs : [];
          if (!cancelled) setSongs(list);
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

  function addBreak() {
    if (!setlist) return;
    const newItem: Item = {
      id: Math.random().toString(36).slice(2),
      type: 'break',
      order: sortedItems.length,
      title: breakTitle,
      durationSec: Math.max(0, breakMin) * 60,
    };
    saveItems([...sortedItems, newItem]);
  }

  function addNote() {
    if (!setlist || !noteText.trim()) return;
    const newItem: Item = {
      id: Math.random().toString(36).slice(2),
      type: 'note',
      order: sortedItems.length,
      note: noteText.trim(),
    };
    setNoteText('');
    saveItems([...sortedItems, newItem]);
  }

  function addSection() {
    if (!setlist || !sectionTitle.trim()) return;
    const newItem: Item = {
      id: Math.random().toString(36).slice(2),
      type: 'section',
      order: sortedItems.length,
      title: sectionTitle.trim(),
    };
    saveItems([...sortedItems, newItem]);
  }

  function applySetTemplate() {
    if (!setlist) return;
    const sets = Math.max(0, Math.floor(setCountInput || 0));
    const encores = Math.max(0, Math.floor(encoreCountInput || 0));
    const newSections: Item[] = [];
    for (let i = 1; i <= sets; i++) {
      newSections.push({
        id: Math.random().toString(36).slice(2),
        type: 'section',
        order: 0,
        title: `Set ${i}`,
      });
    }
    for (let i = 1; i <= encores; i++) {
      newSections.push({
        id: Math.random().toString(36).slice(2),
        type: 'section',
        order: 0,
        title: encores === 1 ? 'Encore' : `Encore ${i}`,
      });
    }
    const combined = [...newSections, ...sortedItems].map((i, idx) => ({ ...i, order: idx }));
    saveItems(combined);
  }

  function addSongById(songId: string) {
    if (!setlist || !songId) return;
    const newItem: Item = {
      id: Math.random().toString(36).slice(2),
      type: 'song',
      order: sortedItems.length,
      songId,
    };
    saveItems([...sortedItems, newItem]);
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
    <div className="bg-black text-white">
      <div className="flex flex-col gap-6">
        <div className="flex-1 min-w-0">
          <h1 className="text-3xl font-bold mb-2 text-green-400 drop-shadow">Setlist Editor</h1>
          <div className="mb-4 flex items-center gap-3 flex-wrap">
            <div className="text-sm text-neutral-400">Setlist:</div>
            <div className="font-mono text-green-300">{setlist.name}</div>
            <div className="ml-auto flex items-center gap-2 text-sm">
              <label className="text-neutral-400">Font</label>
              <button
                className="rounded border border-neutral-700 px-2 py-0.5"
                onClick={() => setPdfFontSize((v) => Math.max(0.6, +(v - 0.1).toFixed(2)))}
                title="Smaller"
              >
                −
              </button>
              <input
                type="range"
                min={0.6}
                max={1.6}
                step={0.05}
                value={pdfFontSize}
                onChange={(e) => setPdfFontSize(parseFloat(e.target.value))}
                className="accent-green-500"
                title="PDF font size"
              />
              <button
                className="rounded border border-neutral-700 px-2 py-0.5"
                onClick={() => setPdfFontSize((v) => Math.min(1.6, +(v + 0.1).toFixed(2)))}
                title="Larger"
              >
                +
              </button>
              <a
                className="rounded border border-green-600 px-2 py-1 text-green-400 hover:bg-green-900"
                href={`/api/setlists/${id}/print?fontSize=${pdfFontSize.toFixed(2)}`}
                target="_blank"
                rel="noreferrer"
                title="Open printable PDF"
              >
                Print PDF
              </a>
            </div>
          </div>

          {/* Quick add controls */}
          <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded border border-neutral-800 bg-neutral-900/40 p-3">
              <div className="font-medium mb-2">Add Note</div>
              <div className="flex gap-2">
                <input
                  className="border border-neutral-700 bg-black text-white rounded px-2 py-1 flex-1 placeholder:text-neutral-600"
                  placeholder="Note text"
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                />
                <button
                  className="rounded border border-green-600 px-3 py-1 text-green-400 hover:bg-green-900"
                  onClick={addNote}
                >
                  Add
                </button>
              </div>
            </div>
            <div className="rounded border border-neutral-800 bg-neutral-900/40 p-3">
              <div className="font-medium mb-2">Add Break</div>
              <div className="flex items-center gap-2">
                <input
                  className="border border-neutral-700 bg-black text-white rounded px-2 py-1 w-36 placeholder:text-neutral-600"
                  placeholder="Break title"
                  value={breakTitle}
                  onChange={(e) => setBreakTitle(e.target.value)}
                />
                <input
                  type="number"
                  min={0}
                  className="border border-neutral-700 bg-black text-white rounded px-2 py-1 w-24 placeholder:text-neutral-600"
                  placeholder="Minutes"
                  value={breakMin}
                  onChange={(e) => setBreakMin(parseInt(e.target.value || '0', 10))}
                />
                <button
                  className="rounded border border-green-600 px-3 py-1 text-green-400 hover:bg-green-900"
                  onClick={addBreak}
                >
                  Add
                </button>
              </div>
            </div>
            <div className="rounded border border-neutral-800 bg-neutral-900/40 p-3">
              <div className="font-medium mb-2">Add Section</div>
              <div className="flex gap-2">
                <input
                  className="border border-neutral-700 bg-black text-white rounded px-2 py-1 flex-1 placeholder:text-neutral-600"
                  placeholder="Section title"
                  value={sectionTitle}
                  onChange={(e) => setSectionTitle(e.target.value)}
                />
                <button
                  className="rounded border border-green-600 px-3 py-1 text-green-400 hover:bg-green-900"
                  onClick={addSection}
                >
                  Add
                </button>
              </div>
            </div>
            <div className="rounded border border-neutral-800 bg-neutral-900/40 p-3">
              <div className="font-medium mb-2">Sets & Encores</div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-neutral-500">Sets</label>
                <input
                  type="number"
                  min={0}
                  className="border border-neutral-700 bg-black text-white rounded px-2 py-1 w-20"
                  value={setCountInput}
                  onChange={(e) => setSetCountInput(parseInt(e.target.value || '0', 10))}
                />
                <label className="ml-3 text-sm text-neutral-500">Encores</label>
                <input
                  type="number"
                  min={0}
                  className="border border-neutral-700 bg-black text-white rounded px-2 py-1 w-20"
                  value={encoreCountInput}
                  onChange={(e) => setEncoreCountInput(parseInt(e.target.value || '0', 10))}
                />
                <button
                  className="ml-auto rounded border border-green-600 px-3 py-1 text-green-400 hover:bg-green-900"
                  onClick={applySetTemplate}
                >
                  Apply Template
                </button>
              </div>
            </div>
          </div>

          {/* Setlist items */}
          <div className="rounded border border-neutral-800 bg-neutral-950 p-4">
            {sortedItems.length === 0 && (
              <div className="text-neutral-400">No items in setlist.</div>
            )}
            <ul>
              {sortedItems.map((item, idx) => (
                <li
                  key={item.id}
                  className="flex items-center gap-2 border-b border-neutral-800 py-2"
                  draggable
                  onDragStart={() => onDragStart(idx)}
                  onDragOver={(e) => onDragOver(idx, e)}
                  onDragEnd={onDragEnd}
                  style={{ opacity: dragIdx === idx ? 0.5 : 1, cursor: 'grab' }}
                >
                  <span className="w-20 font-mono text-xs text-green-400">{item.type}</span>
                  {item.type === 'song' ? (
                    <>
                      <select
                        className="border border-neutral-700 bg-black text-white rounded px-2 py-1 mr-2"
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
                        className="border border-neutral-700 bg-black text-white rounded px-2 py-1 mr-2 w-32 placeholder:text-neutral-600"
                        placeholder="Override title"
                        value={item.title || ''}
                        onChange={(e) => updateItem(idx, { title: e.target.value })}
                      />
                      <input
                        className="border border-neutral-700 bg-black text-white rounded px-2 py-1 mr-2 w-24 placeholder:text-neutral-600"
                        placeholder="Override artist"
                        value={item.artist || ''}
                        onChange={(e) => updateItem(idx, { artist: e.target.value })}
                      />
                    </>
                  ) : item.type === 'note' ? (
                    <div className="flex-1 min-w-0">
                      <input
                        className="w-full border border-neutral-700 bg-black text-white rounded px-2 py-1 mr-2 placeholder:text-neutral-600"
                        placeholder="Note text"
                        value={item.note || ''}
                        onChange={(e) => updateItem(idx, { note: e.target.value })}
                      />
                      {/* Image/GIF preview from note content */}
                      {(() => {
                        const note = item.note || '';
                        const urls = Array.from(
                          new Set([
                            // markdown images ![alt](url)
                            ...Array.from(note.matchAll(/!\[[^\]]*\]\(([^\)]+)\)/g)).map(
                              (m) => m[1],
                            ),
                            // raw URLs
                            ...Array.from(note.matchAll(/https?:[^\s)]+/g)).map((m) => m[0]),
                          ]),
                        ).filter((u) => /\.(gif|png|jpe?g|webp)(\?|#|$)/i.test(u));
                        if (urls.length === 0) return null;
                        return (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {urls.slice(0, 4).map((src, i) => (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                key={i}
                                src={src}
                                alt="note-img"
                                className="h-16 w-auto rounded border border-neutral-800"
                              />
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  ) : item.type === 'break' ? (
                    <input
                      className="border border-neutral-700 bg-black text-white rounded px-2 py-1 mr-2 w-32 placeholder:text-neutral-600"
                      placeholder="Break title"
                      value={item.title || ''}
                      onChange={(e) => updateItem(idx, { title: e.target.value })}
                    />
                  ) : item.type === 'section' ? (
                    <input
                      className="border border-neutral-700 bg-black text-white rounded px-2 py-1 mr-2 w-32 placeholder:text-neutral-600"
                      placeholder="Section title"
                      value={item.title || ''}
                      onChange={(e) => updateItem(idx, { title: e.target.value })}
                    />
                  ) : null}
                  <button
                    className="ml-auto rounded border border-red-600 px-2 py-1 text-xs text-red-400 hover:bg-red-950"
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
          {saving && <div className="mt-2 text-sm text-neutral-400">Saving…</div>}
        </div>
      </div>

      {/* Repertoire side panel (placed beneath on small screens) */}
      <div className="mt-6">
        <aside className="rounded border border-neutral-800 bg-neutral-900/40 p-3">
          <div className="font-medium mb-2">Repertoire</div>
          <input
            className="border border-neutral-700 bg-black text-white rounded px-2 py-1 w-full mb-2 placeholder:text-neutral-600"
            placeholder="Search songs…"
            value={songSearch}
            onChange={(e) => setSongSearch(e.target.value)}
          />
          <ul className="max-h-[50vh] overflow-auto space-y-1">
            {songs
              .filter((s) => {
                const q = songSearch.trim().toLowerCase();
                if (!q) return true;
                return s.title.toLowerCase().includes(q) || s.artist.toLowerCase().includes(q);
              })
              .slice(0, 200)
              .map((s) => (
                <li key={s.id} className="flex items-center gap-2 text-sm">
                  <div className="flex-1 truncate" title={`${s.title} — ${s.artist}`}>
                    <span className="text-green-300">{s.title}</span> —{' '}
                    <span className="text-neutral-400">{s.artist}</span>
                  </div>
                  <button
                    className="rounded border border-green-600 px-2 py-0.5 text-xs text-green-400 hover:bg-green-900"
                    onClick={() => addSongById(s.id)}
                    title="Add to setlist"
                  >
                    Add
                  </button>
                </li>
              ))}
          </ul>
        </aside>
      </div>
    </div>
  );
}
