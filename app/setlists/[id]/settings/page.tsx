'use client';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

// Minimal local types for this page
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
  date?: string;
  venue?: string;
  addGapAfterEachSong?: boolean;
  projectId?: string;
  public?: boolean;
  songGapSec?: number;
  showNotesAfterLyrics?: boolean;
  showColourFlip?: boolean;
};

export default function SetlistSettingsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [setlist, setSetlist] = useState<Setlist | null>(null);
  const [isPublic, setIsPublic] = useState(false);
  const [saving, setSaving] = useState(false);
  const [defaultSongGapSec, setDefaultSongGapSec] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/setlists/${id}`);
      if (res.ok) {
        const s = (await res.json()) as Setlist;
        setSetlist(s);
        setIsPublic(!!(s as any).public);
      }
      // Fetch global defaults to display helpful info
      const st = await fetch('/api/settings');
      if (st.ok) {
        const data = await st.json();
        setDefaultSongGapSec(data.defaultSongGapSec ?? null);
      }
    })();
  }, [id]);

  async function save(next: Partial<Setlist>) {
    const res = await fetch(`/api/setlists/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(next),
    });
    if (res.ok) setSetlist(await res.json());
  }

  const sortedItems = useMemo(() => {
    return [...(setlist?.items || [])].sort((a, b) => a.order - b.order);
  }, [setlist]);

  const effectiveSongGapSec = useMemo(() => {
    const local = setlist?.songGapSec;
    if (typeof local === 'number') return local;
    if (typeof defaultSongGapSec === 'number') return defaultSongGapSec;
    return 30;
  }, [setlist?.songGapSec, defaultSongGapSec]);

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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Settings — {setlist.name}</h2>
        <a className="rounded border px-3 py-1 text-sm" href={`/setlists/${id}`}>
          Back to setlist
        </a>
      </div>

      <div className="rounded border bg-black p-3 text-white">
        <div className="mb-2 font-medium">Display</div>
        <label className="flex items-center gap-2 text-sm">
          <span className="w-56 text-neutral-400">Show artist</span>
          <input
            type="checkbox"
            checked={!!setlist.showArtist}
            onChange={(e) => save({ showArtist: e.target.checked })}
          />
        </label>
        <label className="mt-2 flex items-center gap-2 text-sm">
          <span className="w-56 text-neutral-400">Show key</span>
          <input
            type="checkbox"
            checked={!!setlist.showKey}
            onChange={(e) => save({ showKey: e.target.checked })}
          />
          <span className="text-xs text-neutral-500">Display base key in list meta</span>
        </label>
        <label className="mt-2 flex items-center gap-2 text-sm">
          <span className="w-56 text-neutral-400">Show transposed key</span>
          <input
            type="checkbox"
            checked={!!setlist.showTransposedKey}
            onChange={(e) => save({ showTransposedKey: e.target.checked })}
          />
          <span className="text-xs text-neutral-500">Display as “Title (Bb)”</span>
        </label>
      </div>

      <div className="rounded border bg-black p-3 text-white">
        <div className="mb-2 font-medium">Song gaps</div>
        <label className="flex items-center gap-2 text-sm">
          <span className="w-56 text-neutral-400">Add gap after each song</span>
          <input
            type="checkbox"
            checked={!!setlist.addGapAfterEachSong}
            onChange={(e) => save({ addGapAfterEachSong: e.target.checked })}
          />
          <span className="text-xs text-neutral-500">{effectiveSongGapSec}s per song</span>
        </label>
        <div className="mt-3 flex items-center gap-3">
          <span className="w-56 text-sm text-neutral-400">Gap length (seconds)</span>
          <input
            type="range"
            min={10}
            max={120}
            step={10}
            value={
              typeof setlist.songGapSec === 'number' ? setlist.songGapSec : effectiveSongGapSec
            }
            onChange={(e) => {
              const val = parseInt(e.target.value, 10) || effectiveSongGapSec;
              // Persist per-setlist song gap seconds
              save({ songGapSec: val } as any);
            }}
          />
          <span className="text-sm">
            {typeof setlist.songGapSec === 'number' ? setlist.songGapSec : effectiveSongGapSec}s
          </span>
        </div>
        <div className="mt-1 text-xs text-neutral-500">
          Applies when enabled. Defaults to global setting if not specified.
        </div>
      </div>

      <div className="rounded border bg-black p-3 text-white">
        <div className="mb-2 font-medium">Visibility</div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isPublic}
            onChange={async (e) => {
              const next = e.target.checked;
              setIsPublic(next);
              setSaving(true);
              await save({ public: next } as any);
              setSaving(false);
            }}
          />
          <span>Make setlist public/searchable</span>
          <span
            title="Selecting public makes the setlist discoverable and searchable for your friends, fans, band members, techs and anyone else!"
            className="ml-1 cursor-help text-xs text-neutral-400 rounded border border-neutral-700 px-1"
          >
            i
          </span>
        </label>
      </div>

      <div className="rounded border bg-black p-3 text-white">
        <div className="mb-2 font-medium">Lyric mode settings</div>
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={!!(setlist as any).showNotesAfterLyrics}
              onChange={(e) => save({ showNotesAfterLyrics: e.target.checked })}
            />
            <span>
              Display notes after lyrics
              <span className="block text-xs text-neutral-400">
                Displays the setlist notes on completion of the lyric prompter (useful for prompts,
                merch, social media, etc).
              </span>
            </span>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={!!setlist.showColourFlip}
              onChange={(e) => save({ showColourFlip: e.target.checked })}
            />
            <span>
              Colour flip
              <span className="block text-xs text-neutral-400">
                Changes lyrics to black and backdrop to white.
              </span>
            </span>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" disabled />
            <span>
              What and Where appear
              <span className="block text-xs text-neutral-400">
                Displays the venue location and date before lyrics and during breaks (useful for
                knowing where you are!).
              </span>
            </span>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" disabled />
            <span>
              Show live clock
              <span className="block text-xs text-neutral-400">
                Displays the current time (in green, just under prev/next) throughout lyric mode to
                help avoid overruns.
              </span>
            </span>
          </label>
        </div>
      </div>

      <div className="rounded border bg-black p-3 text-white">
        <div className="mb-2 font-medium">Utilities</div>
        <button className="rounded border px-3 py-1 text-sm" onClick={copyJson} disabled={saving}>
          Copy JSON
        </button>
      </div>
    </div>
  );
}
