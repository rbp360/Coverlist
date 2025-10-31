'use client';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

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
  showArtist: boolean;
  showKey?: boolean;
  showTransposedKey?: boolean;
  items: Item[];
  projectId?: string;
  date?: string;
  venue?: string;
  addGapAfterEachSong?: boolean;
  songGapSec?: number;
};
type Song = {
  id: string;
  title: string;
  artist: string;
  durationSec?: number;
  key?: string;
  tempo?: number;
  transposedKey?: string;
};

function fmt(sec?: number) {
  if (!sec) return '0:00';
  const m = Math.floor(sec / 60);
  const s = String(sec % 60).padStart(2, '0');
  return `${m}:${s}`;
}

export default function SetlistEditorPage() {
  const { id } = useParams<{ id: string }>();
  const [cacheStatus, setCacheStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const router = useRouter();
  const [setlist, setSetlist] = useState<Setlist | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [breakTitle, setBreakTitle] = useState('Break');
  const [breakMin, setBreakMin] = useState(10);
  const [noteText, setNoteText] = useState('');
  const [songs, setSongs] = useState<Song[]>([]);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [sectionTitle, setSectionTitle] = useState('Set 1');
  const [settings, setSettings] = useState<{ defaultSongGapSec: number } | null>(null);
  const [pdfFontSize, setPdfFontSize] = useState(1.0);
  const [isPublic, setIsPublic] = useState(false);

  // New state for multi-set workflow
  const [setCountInput, setSetCountInput] = useState<number>(0);
  const [encoreCountInput, setEncoreCountInput] = useState<number>(0);

  // Note presets for quick insertion (with optional GIF support later)
  const DEFAULT_NOTE_PRESETS: Array<{ label: string; gif?: string }> = [
    { label: '🎸 Capo' },
    { label: '🚨 Stop' },
    { label: '🎸 Instrument change' },
    { label: '⚡ Straight through' },
    { label: '🧱 Intro' },
    { label: '🧱 Outro' },
    { label: '🧱 Pause' },
    { label: '🎚️ Click' },
  ];
  const [customNotePresets, setCustomNotePresets] = useState<
    Array<{ label: string; gif?: string }>
  >([]);
  const NOTE_PRESETS = [...DEFAULT_NOTE_PRESETS, ...customNotePresets];

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/setlists/${id}`);
      if (res.ok) {
        const s = await res.json();
        setSetlist(s);
        setIsPublic(!!(s as any).public);
        if (s.projectId) {
          const rs = await fetch(`/api/projects/${s.projectId}/songs`);
          if (rs.ok) setSongs((await rs.json()).songs);
        }
        const st = await fetch('/api/settings');
        if (st.ok) setSettings(await st.json());
      }
    })();
  }, [id]);

  // Helper to revert name directly via API (avoids useEffect dep on `save`)
  const revertName = useCallback(
    async (prevName: string) => {
      if (!prevName) return;
      const res = await fetch(`/api/setlists/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: prevName }),
      });
      if (res.ok) setSetlist(await res.json());
    },
    [id],
  );

  // Handle browser back to undo last name change if present in history state
  useEffect(() => {
    function onPopState(e: PopStateEvent) {
      const st = (e.state || {}) as any;
      if (st && st.type === 'setlistNameChange' && st.setlistId === id) {
        const prevName = String(st.prevName || '').trim();
        if (prevName) revertName(prevName);
      }
    }
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [id, revertName]);

  const total = useMemo(() => {
    const base = (setlist?.items || []).reduce((sum, it) => sum + (it.durationSec || 0), 0);
    if (!setlist?.addGapAfterEachSong) return base;
    const songCount = (setlist.items || []).filter((i) => i.type === 'song').length;
    const gap =
      typeof setlist.songGapSec === 'number'
        ? setlist.songGapSec
        : (settings?.defaultSongGapSec ?? 0);
    return base + songCount * gap;
  }, [setlist, settings]);

  const totalSongCount = useMemo(() => {
    return (setlist?.items || []).filter((i) => i.type === 'song').length;
  }, [setlist]);

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
    if (setlist?.addGapAfterEachSong) {
      const gap =
        typeof setlist.songGapSec === 'number'
          ? setlist.songGapSec
          : (settings?.defaultSongGapSec ?? 0);
      sum += songs * gap;
    }
    return sum;
  }

  function sectionSongCountFrom(index: number) {
    const items = sortedItems;
    let songs = 0;
    for (let i = index + 1; i < items.length; i++) {
      const it = items[i];
      if (it.type === 'section') break;
      if (it.type === 'song') songs += 1;
    }
    return songs;
  }

  const sections = useMemo(() => {
    return sortedItems.filter((i) => i.type === 'section');
  }, [sortedItems]);

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
    const text = noteText.trim();
    const items = [...setlist.items];
    const order = items.length ? Math.max(...items.map((i) => i.order)) + 1 : 0;
    const item: Item = { id: crypto.randomUUID(), type: 'note', order, note: text };
    save({ items: [...items, item] as any });
    // Add to custom presets if not already present in either default or custom
    if (
      !DEFAULT_NOTE_PRESETS.some((p) => p.label === text) &&
      !customNotePresets.some((p) => p.label === text)
    ) {
      setCustomNotePresets((prev) => [...prev, { label: text }]);
    }
    setNoteText('');
  }

  function quickInsertNote(text: string) {
    if (!setlist) return;
    const items = [...setlist.items];
    const order = items.length ? Math.max(...items.map((i) => i.order)) + 1 : 0;
    const item: Item = { id: crypto.randomUUID(), type: 'note', order, note: text };
    save({ items: [...items, item] as any });
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

  function applySetTemplate() {
    if (!setlist) return;
    const sets = Math.max(0, Math.floor(setCountInput || 0));
    const encores = Math.max(0, Math.floor(encoreCountInput || 0));
    const existingSectionCount = (setlist.items || []).filter((i) => i.type === 'section').length;
    if (existingSectionCount > 0 && existingSectionCount !== sets + encores) {
      const ok = confirm(
        'Replace existing sections with the new template? Existing songs will not be moved.',
      );
      if (!ok) return;
    }
    const nonSectionItems = (setlist.items || []).filter((i) => i.type !== 'section');
    const newSections: Item[] = [];
    for (let i = 1; i <= sets; i++) {
      newSections.push({
        id: crypto.randomUUID(),
        type: 'section',
        order: 0,
        title: `Set ${i}`,
      });
    }
    for (let i = 1; i <= encores; i++) {
      newSections.push({
        id: crypto.randomUUID(),
        type: 'section',
        order: 0,
        title: encores === 1 ? 'Encore' : `Encore ${i}`,
      });
    }
    const combined = [...newSections, ...nonSectionItems].map((i, idx) => ({ ...i, order: idx }));
    save({ items: combined as any });
  }

  async function removeItem(itemId: string) {
    if (!setlist) return;
    const items = sortedItems
      .filter((i) => i.id !== itemId)
      .map((i, idx) => ({ ...i, order: idx }));
    await save({ items: items as any });
  }

  // showArtist is now toggled from the settings section below

  function onDragStart(e: React.DragEvent<HTMLLIElement>, id: string) {
    setDragId(id);
    e.dataTransfer.effectAllowed = 'move';
    // Prefix with item: to distinguish from repertoire song drags
    e.dataTransfer.setData('text/plain', `item:${id}`);
  }

  function onSongDragStart(e: React.DragEvent<HTMLLIElement>, songId: string) {
    // Dragging from repertoire list
    setDragId(null);
    e.dataTransfer.effectAllowed = 'copyMove';
    e.dataTransfer.setData('text/plain', `song:${songId}`);
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
    const payload = e.dataTransfer.getData('text/plain') || '';
    setOverId(null);
    setDragId(null);
    if (!setlist) return;

    // If we're dragging a repertoire song, insert it near the target
    if (payload.startsWith('song:')) {
      const songId = payload.slice('song:'.length);
      const song = songs.find((s) => s.id === songId);
      if (!song) return;
      const items = [...sortedItems];
      const toIdx = items.findIndex((i) => i.id === targetId);
      if (toIdx === -1) return;
      // Build new song item
      const newItem: Item = {
        id: crypto.randomUUID(),
        type: 'song',
        order: 0,
        songId: song.id,
        title: song.title,
        artist: song.artist,
        durationSec: song.durationSec,
      };
      // If dropping on a section, append to end of that section block
      if (items[toIdx].type === 'section') {
        let insertAt = items.length;
        for (let i = toIdx + 1; i < items.length; i++) {
          if (items[i].type === 'section') {
            insertAt = i;
            break;
          }
        }
        items.splice(insertAt, 0, newItem);
      } else {
        // Otherwise insert before the target item
        items.splice(toIdx, 0, newItem);
      }
      const reindexed = items.map((it, idx) => ({ ...it, order: idx }));
      await save({ items: reindexed as any });
      return;
    }

    // Otherwise it's a list item drag
    const sourceId = payload.startsWith('item:') ? payload.slice('item:'.length) : payload;
    if (!sourceId || sourceId === targetId) return;
    const items = [...sortedItems];
    const fromIdx = items.findIndex((i) => i.id === sourceId);
    const toIdx = items.findIndex((i) => i.id === targetId);
    if (fromIdx === -1 || toIdx === -1) return;

    // If dropping an item onto a section, move it to end of that section
    if (items[toIdx].type === 'section') {
      const sectionId = items[toIdx].id;
      moveItemToSection(sourceId, sectionId);
      return;
    }

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

  function addAllFromRepertoire() {
    if (!setlist || songs.length === 0) return;
    const existingIds = new Set(
      (setlist.items || [])
        .filter((i) => i.type === 'song')
        .map((i) => i.songId)
        .filter(Boolean) as string[],
    );
    const toAppend = songs.filter((s) => !existingIds.has(s.id));
    if (toAppend.length === 0) return;
    const items = [...setlist.items];
    let order = items.length ? Math.max(...items.map((i) => i.order)) + 1 : 0;
    const newItems: Item[] = toAppend.map((s) => ({
      id: crypto.randomUUID(),
      type: 'song',
      order: order++,
      songId: s.id,
      title: s.title,
      artist: s.artist,
      durationSec: s.durationSec,
    }));
    save({ items: [...items, ...newItems] as any });
  }

  // Removed bulk add to section; drag-and-drop is the primary interaction

  function moveItemToSection(itemId: string, sectionId: string) {
    if (!setlist) return;
    const items = [...sortedItems];
    const fromIdx = items.findIndex((i) => i.id === itemId);
    const sectionIdx = items.findIndex((i) => i.id === sectionId);
    if (fromIdx === -1 || sectionIdx === -1) return;
    const [moved] = items.splice(fromIdx, 1);
    // Re-find section index if it shifted
    const newSectionIdx = items.findIndex((i) => i.id === sectionId);
    let insertAt = items.length;
    for (let i = newSectionIdx + 1; i < items.length; i++) {
      if (items[i].type === 'section') {
        insertAt = i;
        break;
      }
    }
    items.splice(insertAt, 0, moved);
    const reindexed = items.map((it, idx) => ({ ...it, order: idx }));
    save({ items: reindexed as any });
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
        showTransposedKey: setlist.showTransposedKey,
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
          transposedKey: i.transposedKey,
        })),
      };
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      alert('Setlist JSON copied to clipboard');
    } catch {
      alert('Copy failed');
    }
  }

  if (!setlist) return <div>Loading…</div>;

  async function commitNameChange() {
    if (!setlist) return;
    const next = nameDraft.trim();
    if (!next || next === setlist.name) {
      setEditingName(false);
      setNameDraft('');
      return;
    }
    const prevName = setlist.name;
    // Push a history entry so browser Back will popstate and we can revert
    try {
      history.pushState(
        { type: 'setlistNameChange', setlistId: id, prevName, newName: next },
        '',
        window.location.href,
      );
    } catch {}
    await save({ name: next });
    setEditingName(false);
    setNameDraft('');
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          {editingName ? (
            <input
              className="rounded border bg-black px-2 py-1 text-2xl font-semibold text-white"
              value={nameDraft}
              autoFocus
              onChange={(e) => setNameDraft(e.target.value)}
              onBlur={commitNameChange}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitNameChange();
                if (e.key === 'Escape') {
                  setEditingName(false);
                  setNameDraft('');
                }
              }}
            />
          ) : (
            <h2
              className="cursor-text text-2xl font-semibold hover:underline"
              title="Click to rename"
              onClick={() => {
                setEditingName(true);
                setNameDraft(setlist.name);
              }}
            >
              {setlist.name}
            </h2>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">
            Total: {totalSongCount} songs • {fmt(total)}
          </span>
          {setlist.addGapAfterEachSong && (
            <span className="text-xs text-gray-500">
              (+
              {typeof setlist.songGapSec === 'number'
                ? setlist.songGapSec
                : (settings?.defaultSongGapSec ?? 0)}
              s per song)
            </span>
          )}
          {/* Show artist moved into settings section */}
          <a className="rounded border px-3 py-1 text-sm" href={`/setlists/${id}/settings`}>
            Settings
          </a>
          <div className="flex items-center gap-2 rounded border px-2 py-1 text-sm">
            <span>PDF font</span>
            <input
              type="range"
              min={0.6}
              max={1.6}
              step={0.1}
              value={pdfFontSize}
              onChange={(e) => setPdfFontSize(parseFloat(e.target.value))}
            />
            <a
              className="rounded border px-2 py-1"
              href={`/api/setlists/${id}/print?fontSize=${pdfFontSize}`}
            >
              Export PDF
            </a>
          </div>
          <button
            className="rounded border border-green-600 px-3 py-1 text-sm text-green-500"
            onClick={async () => {
              setCacheStatus('saving');
              try {
                // Fetch setlist data
                const setlistRes = await fetch(`/api/setlists/${id}`);
                if (!setlistRes.ok) throw new Error('Failed to fetch setlist');
                const setlistData = await setlistRes.json();
                // Fetch lyrics for all songs in setlist
                const lyrics: Record<string, string> = {};
                for (const item of setlistData.items || []) {
                  if (item.type === 'song' && item.songId) {
                    try {
                      const lyricRes = await fetch(`/api/songs/${item.songId}`);
                      if (lyricRes.ok) {
                        const song = await lyricRes.json();
                        lyrics[item.songId] = song.lyrics || '';
                      }
                    } catch {}
                  }
                }
                const cache = {
                  id: setlistData.id,
                  name: setlistData.name,
                  items: setlistData.items,
                  lyrics,
                  updatedAt: new Date().toISOString(),
                };
                localStorage.setItem(`offline-setlist-${id}`, JSON.stringify(cache));
                setCacheStatus('saved');
                setTimeout(() => setCacheStatus('idle'), 2000);
              } catch {
                setCacheStatus('error');
                setTimeout(() => setCacheStatus('idle'), 2000);
              }
            }}
          >
            Cache setlist and lyrics offline
          </button>
          {cacheStatus !== 'idle' && (
            <span
              className={
                cacheStatus === 'saved'
                  ? 'ml-2 text-green-400'
                  : cacheStatus === 'saving'
                    ? 'ml-2 text-yellow-400'
                    : 'ml-2 text-red-400'
              }
            >
              {cacheStatus === 'saving' && 'Saving...'}
              {cacheStatus === 'saved' && 'Saved for offline use!'}
              {cacheStatus === 'error' && 'Error saving offline.'}
            </span>
          )}
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
        {/* 'Add gap after each song' moved to per-setlist Settings page */}
        {/* Per-setlist settings moved to dedicated Settings page */}
      </div>

      {/* Visibility moved into settings grid below */}

      <div className="rounded border bg-black text-white">
        <ul className="divide-y">
          {sortedItems.map((it) => (
            <li
              key={it.id}
              draggable
              onDragStart={(e) => onDragStart(e, it.id)}
              onDragOver={(e) => onDragOver(e, it.id)}
              onDragLeave={onDragLeave}
              onDrop={(e) => onDrop(e, it.id)}
              className={`flex items-center justify-between p-3 ${it.type === 'section' ? 'pl-16' : ''} ${overId === it.id ? 'bg-yellow-50' : ''}`}
            >
              <div>
                {it.type === 'song' && (
                  <div className="font-medium">
                    {(() => {
                      const song = songs.find((s) => s.id === it.songId);
                      const tKey = it.transposedKey || song?.transposedKey;
                      const title =
                        setlist.showTransposedKey && tKey ? `${it.title} (${tKey})` : it.title;
                      return (
                        <>
                          {title}
                          {!song && (
                            <span className="ml-2 text-xs text-red-600">
                              deleted from repertoire
                            </span>
                          )}
                          {setlist.showArtist && it.artist && (
                            <span className="text-gray-500"> — {it.artist}</span>
                          )}
                          {song && setlist.showKey && song.key ? (
                            <div className="text-sm text-neutral-600">{song.key}</div>
                          ) : null}
                        </>
                      );
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
                    <div className="text-xs font-semibold uppercase tracking-wide text-brand-500">
                      {it.title}
                    </div>
                    <div className="text-xs text-neutral-500">
                      {(() => {
                        const idx = sortedItems.findIndex((x) => x.id === it.id);
                        const dur = sectionDurationFrom(idx);
                        const cnt = sectionSongCountFrom(idx);
                        return (
                          <span>
                            {cnt} songs • {fmt(dur)}
                          </span>
                        );
                      })()}
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
                {/* Removed per-song 'Key' input box; key display is controlled in Settings */}
                {/* Removed 'Move to set' dropdown in favor of drag-and-drop */}
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
        <div className="rounded border bg-black p-3 text-white md:col-span-2 flex flex-col h-full">
          <div className="mb-2 flex items-center justify-between">
            <div className="font-medium">Add Song</div>
            <button
              className="rounded border px-2 py-1 text-xs disabled:opacity-50"
              onClick={addAllFromRepertoire}
              disabled={songs.length === 0}
              title={songs.length === 0 ? 'No repertoire songs' : 'Append all repertoire songs'}
            >
              Add all from repertoire
            </button>
          </div>
          <ul className="flex-1 min-h-0 divide-y overflow-auto">
            {songs.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between px-2 py-1.5"
                draggable
                onDragStart={(e) => onSongDragStart(e, s.id)}
                title={'Drag into the setlist to add'}
              >
                <div className="flex items-center gap-2">
                  <div className="text-[13px] font-medium">
                    {s.title} <span className="text-gray-500">— {s.artist}</span>
                  </div>
                  {s.durationSec ? (
                    <div className="text-[11px] text-gray-600">{fmt(s.durationSec)}</div>
                  ) : null}
                </div>
                {/* Right side intentionally empty: drag-and-drop is the only action */}
              </li>
            ))}
            {songs.length === 0 && (
              <li className="p-2 text-xs text-gray-600">No songs in repertoire yet.</li>
            )}
          </ul>
        </div>
        <div className="rounded border bg-black p-3 text-white md:col-span-1">
          <div className="mb-2 font-medium">Add Note</div>
          {/* Curated presets */}
          <div className="flex flex-col gap-2">
            {NOTE_PRESETS.map((p) => (
              <button
                key={p.label}
                className="flex min-w-0 items-center gap-2 rounded border px-2 py-1 text-left text-xs hover:bg-neutral-50 whitespace-nowrap"
                title={p.label}
                onClick={() => quickInsertNote(p.label)}
              >
                {p.gif ? (
                  // Optional GIF preview if assets are added to /public and wired here
                  <Image
                    src={p.gif}
                    alt=""
                    width={16}
                    height={16}
                    className="h-4 w-4 flex-none rounded object-cover"
                  />
                ) : null}
                <span className="truncate">{p.label}</span>
              </button>
            ))}
          </div>
          {/* Custom note input, compact and fits within card */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input
              className="min-w-0 flex-1 rounded border px-2 py-1 text-sm"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Custom note"
            />
            <button className="rounded border px-2 py-1 text-xs" onClick={addNote}>
              Add
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-4 md:col-span-1">
          <div className="rounded border bg-black p-3 text-white">
            <div className="mb-2 font-medium">Sets</div>
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <label className="flex items-center gap-2 text-sm">
                  <span className="text-neutral-400">Set count</span>
                  <input
                    type="number"
                    className="w-20 rounded border bg-black px-2 py-1"
                    value={setCountInput}
                    onChange={(e) => setSetCountInput(Math.max(0, parseInt(e.target.value) || 0))}
                    min={0}
                  />
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <span className="text-neutral-400">Encore count</span>
                  <input
                    type="number"
                    className="w-24 rounded border bg-black px-2 py-1"
                    value={encoreCountInput}
                    onChange={(e) =>
                      setEncoreCountInput(Math.max(0, parseInt(e.target.value) || 0))
                    }
                    min={0}
                  />
                </label>
                <button className="rounded bg-black px-3 py-2" onClick={applySetTemplate}>
                  Apply template
                </button>
              </div>
              <div className="text-xs text-neutral-500">
                Tip: After creating sets, use the &quot;Add to set&quot; controls above to quickly
                place songs into the right set. You can also drag items in the list.
              </div>
              <div className="mt-2 border-t border-neutral-800 pt-2">
                <div className="mb-1 text-xs text-neutral-400">Quick add a custom section</div>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    className="min-w-0 flex-1 rounded border px-2 py-1 text-sm"
                    value={sectionTitle}
                    onChange={(e) => setSectionTitle(e.target.value)}
                    placeholder="e.g., Soundcheck, Interlude"
                  />
                  <button className="rounded border px-2 py-1 text-xs" onClick={addSection}>
                    Add section
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="rounded border bg-black p-3 text-white">
            <div className="mb-2 font-medium">Add Break</div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <input
                className="min-w-0 flex-1 rounded border px-2 py-1 text-sm"
                value={breakTitle}
                onChange={(e) => setBreakTitle(e.target.value)}
                placeholder="Break title"
              />
              <input
                type="number"
                className="w-20 rounded border px-2 py-1 text-sm"
                value={breakMin}
                onChange={(e) => setBreakMin(parseInt(e.target.value) || 0)}
              />
              <button className="rounded border px-2 py-1 text-xs" onClick={addBreak}>
                Add
              </button>
              <span className="text-[11px] text-gray-600">Minutes</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
