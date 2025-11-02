'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

type CachedSetlist = {
  id: string;
  name: string;
  items: any[];
  lyrics: Record<string, string>;
  updatedAt: string;
};

export default function SetlistManagePage() {
  const { id } = useParams<{ id: string }>();
  const [name, setName] = useState<string>('Setlist');
  const [offlineModal, setOfflineModal] = useState(false);
  const [offlineStatus, setOfflineStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  async function cacheOffline() {
    setOfflineStatus('saving');
    try {
      // Fetch setlist data
      const setlistRes = await fetch(`/api/setlists/${id}`);
      if (!setlistRes.ok) throw new Error('Failed to fetch setlist');
      const setlist = await setlistRes.json();
      // Fetch lyrics for all songs in setlist
      const lyrics: Record<string, string> = {};
      for (const item of setlist.items || []) {
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
      const cache: CachedSetlist = {
        id: setlist.id,
        name: setlist.name,
        items: setlist.items,
        lyrics,
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem(`offline-setlist-${id}`, JSON.stringify(cache));
      setOfflineStatus('saved');
    } catch {
      setOfflineStatus('error');
    }
  }
  const [creating, setCreating] = useState(false);
  const [copying, setCopying] = useState(false);
  const [playlistUrl, setPlaylistUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/setlists/${id}`);
        if (res.ok) {
          const s = await res.json();
          if (!cancelled) setName(s?.name || 'Setlist');
        }
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function createPlaylist() {
    setCreating(true);
    try {
      const res = await fetch('/api/integrations/spotify/create-from-setlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setlistId: id }),
      });
      if (res.status === 401) {
        const returnTo =
          typeof window !== 'undefined' ? window.location.href : `/setlists/${id}/manage`;
        window.location.href = `/api/integrations/spotify/login?returnTo=${encodeURIComponent(returnTo)}`;
        return;
      }
      if (!res.ok) throw new Error('Failed to create playlist');
      const json = await res.json();
      setPlaylistUrl(json.url);
      if (json.url) window.open(json.url, '_blank', 'noopener');
    } catch (e) {
      alert('Unable to create Spotify playlist.');
    } finally {
      setCreating(false);
    }
  }

  async function copySetlist() {
    setCopying(true);
    try {
      const res = await fetch(`/api/setlists/${id}/copy`, { method: 'POST' });
      if (!res.ok) throw new Error('Copy failed');
      // If API returns created setlist id, navigate to it; otherwise just notify
      try {
        const d = await res.json();
        if (d?.id) {
          window.location.href = `/setlists/${d.id}`;
          return;
        }
      } catch {}
      alert('Setlist copied. You can find it in your project setlists.');
    } catch (e) {
      alert('Unable to copy setlist.');
    } finally {
      setCopying(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Manage: {name}</h2>
      </div>

      <div className="rounded border bg-black p-4 text-white">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            className="rounded border px-3 py-3 text-center hover:bg-neutral-900"
            href={`/setlists/${id}/lyric-mode`}
          >
            Lyric Mode
          </Link>
          <Link
            className="rounded border px-3 py-3 text-center hover:bg-blue-900 text-blue-400 font-semibold"
            href={`/setlists/${id}/editor`}
          >
            Open Setlist Editor
          </Link>
          <button
            className="rounded border px-3 py-3 text-center hover:bg-neutral-900"
            onClick={createPlaylist}
            disabled={creating}
            title="Create a Spotify playlist from this setlist"
          >
            {creating ? 'Creating…' : 'Create Playlist'}
          </button>
          <button
            className="rounded border px-3 py-3 text-center hover:bg-neutral-900"
            onClick={() => {
              setOfflineModal(true);
              setOfflineStatus('idle');
            }}
            title="Cache setlist and lyrics offline to your device so they are ready to use, wherever you go!"
          >
            Cache setlist and lyrics offline
          </button>
        </div>
        {playlistUrl && (
          <div className="mt-3 text-sm">
            <a className="underline" href={playlistUrl} target="_blank" rel="noreferrer">
              Open in Spotify
            </a>
          </div>
        )}
      </div>

      {/* Cache setlist and lyrics offline modal */}
      {offlineModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="bg-neutral-900 rounded p-6 max-w-md w-full text-white border">
            <h3 className="text-lg font-semibold mb-2">Cache setlist and lyrics offline</h3>
            <p className="mb-4 text-sm">
              This will cache the lyrics and setlist to your device so they are ready to use,
              wherever you go!
              <br />
              <b>No editing is available in offline mode.</b>
            </p>
            <div className="flex gap-2">
              <button
                className="rounded bg-brand-500 px-4 py-2 text-black font-semibold"
                onClick={async () => {
                  await cacheOffline();
                }}
                disabled={offlineStatus === 'saving' || offlineStatus === 'saved'}
              >
                {offlineStatus === 'saving'
                  ? 'Saving…'
                  : offlineStatus === 'saved'
                    ? 'Saved!'
                    : 'Save for offline'}
              </button>
              <button
                className="rounded border px-4 py-2 text-white"
                onClick={() => setOfflineModal(false)}
              >
                Close
              </button>
            </div>
            {offlineStatus === 'error' && (
              <div className="text-red-400 mt-2">Failed to save for offline use.</div>
            )}
            {offlineStatus === 'saved' && (
              <div className="text-green-400 mt-2">Setlist and lyrics saved for offline use!</div>
            )}
          </div>
        </div>
      )}

      <div>
        <Link className="underline" href="/projects">
          Back to Projects
        </Link>
      </div>
    </div>
  );
}
