'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import TrashIcon from '../../../../components/TrashIcon';

type Setlist = { id: string; name: string; showArtist: boolean; items: any[] };
type CacheStatus = 'idle' | 'saving' | 'saved' | 'error';

export default function ProjectSetlistsPage() {
  const { id } = useParams<{ id: string }>();
  const [setlists, setSetlists] = useState<Setlist[]>([]);
  const [name, setName] = useState('New Setlist');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [creating, setCreating] = useState<string | null>(null);
  const [copying, setCopying] = useState<string | null>(null);
  const [playlistUrls, setPlaylistUrls] = useState<Record<string, string>>({});
  const [deleting, setDeleting] = useState<string | null>(null);
  const [cacheStatus, setCacheStatus] = useState<Record<string, CacheStatus>>({});

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const res = await fetch(`/api/projects/${id}/setlists`, { cache: 'no-store' });
      if (res.ok) {
        setSetlists((await res.json()).setlists);
      } else {
        // Surface a friendly hint when auth or project lookup fails
        if (res.status === 401) setLoadError('Your session may have expired. Please log in again.');
        else if (res.status === 404)
          setLoadError('Project not found or you no longer have access to it.');
        else setLoadError('Unable to load setlists.');
        setSetlists([]);
      }
    } catch (e) {
      setLoadError('Network error loading setlists.');
      setSetlists([]);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function create() {
    const res = await fetch(`/api/projects/${id}/setlists`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, showArtist: true }),
    });
    if (res.ok) {
      setName('New Setlist');
      load();
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Setlists</h2>
      {loadError && (
        <div className="rounded border border-red-600 bg-red-50 p-3 text-sm text-red-700">
          {loadError}
          <div className="mt-2 flex gap-2">
            <Link className="underline" href="/login">
              Go to login
            </Link>
            <button
              className="underline"
              onClick={async () => {
                await fetch('/api/auth/logout', { method: 'POST' });
                window.location.href = '/login';
              }}
            >
              Log out and back in
            </button>
          </div>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="new-setlist-input" className="sr-only">
          Setlist name
        </label>
        <input
          id="new-setlist-input"
          className="flex-1 rounded border px-3 py-2"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New Setlist"
          title="Setlist name"
        />
        <button
          className="rounded border border-green-500 bg-green-600 px-3 py-2 text-white transition-colors hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2"
          onClick={create}
        >
          Create
        </button>
      </div>
      <div className="rounded border bg-black text-white overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr>
              <th className="p-2 text-left">Setlist</th>
              <th className="p-2 text-left">Songs</th>
              <th className="p-2 text-left">Duration</th>
              <th className="p-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {setlists.map((s) => {
              const items = (s.items || []).slice();
              const songCount = items.filter((i) => i.type === 'song').length;
              const duration = items.reduce((acc, it) => acc + (it.durationSec || 0), 0);
              function fmt(sec?: number) {
                if (!sec && sec !== 0) return '';
                const m = Math.floor((sec || 0) / 60);
                const s = String((sec || 0) % 60).padStart(2, '0');
                return `${m}:${s}`;
              }
              return (
                <Link href={`/setlists/${s.id}`} key={s.id} legacyBehavior passHref>
                  <tr
                    className="border-t hover:bg-neutral-900 group cursor-pointer"
                    tabIndex={0}
                    title="Open setlist editor"
                    role="button"
                    aria-label={`Open setlist ${s.name}`}
                    style={{ outline: 'none' }}
                  >
                    <td className="p-2 flex items-center gap-2">
                      <span className="flex-1 truncate font-medium">{s.name}</span>
                    </td>
                    <td className="p-2 text-neutral-400">{songCount}</td>
                    <td className="p-2 text-neutral-400">{fmt(duration)}</td>
                    <td className="p-2 flex flex-wrap gap-2 items-center">
                      <button
                        className="rounded border border-red-600 p-1 text-red-600 opacity-80 hover:opacity-100 disabled:opacity-50"
                        title="Delete setlist"
                        aria-label="Delete setlist"
                        disabled={deleting === s.id}
                        tabIndex={-1}
                        onClick={async (e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (!confirm('Are you sure you want to delete this setlist?')) return;
                          try {
                            setDeleting(s.id);
                            const res = await fetch(`/api/setlists/${s.id}`, { method: 'DELETE' });
                            if (!res.ok) throw new Error('Failed to delete');
                            await load();
                          } catch (e) {
                            alert('Unable to delete setlist.');
                          } finally {
                            setDeleting(null);
                          }
                        }}
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                      <button
                        className="rounded border border-blue-600 px-2 py-1 text-xs text-blue-500 ml-1 opacity-80 hover:opacity-100 disabled:opacity-50"
                        title="Copy setlist"
                        aria-label="Copy setlist"
                        disabled={copying === s.id}
                        tabIndex={-1}
                        onClick={async (e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          try {
                            setCopying(s.id);
                            const getRes = await fetch(`/api/setlists/${s.id}`);
                            if (!getRes.ok) throw new Error('Failed to read setlist');
                            const src = await getRes.json();
                            const payload = {
                              name: `${src.name} (copy)`,
                              showArtist:
                                typeof src.showArtist === 'boolean' ? src.showArtist : true,
                              items: Array.isArray(src.items) ? src.items : [],
                            };
                            const createRes = await fetch(`/api/projects/${id}/setlists`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify(payload),
                            });
                            if (!createRes.ok) throw new Error('Failed to create copy');
                            await load();
                          } catch (e) {
                            alert('Unable to copy setlist.');
                          } finally {
                            setCopying(null);
                          }
                        }}
                      >
                        {copying === s.id ? 'Copying…' : 'Copy'}
                      </button>
                      <button
                        className="ml-1 p-1 rounded-full border border-green-600 bg-black hover:bg-green-950 focus:outline-none focus:ring-2 focus:ring-green-400"
                        title="Create Spotify Playlist"
                        aria-label="Create Spotify Playlist"
                        tabIndex={-1}
                        style={{ lineHeight: 0 }}
                        onClick={async (e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          try {
                            const res = await fetch(
                              '/api/integrations/spotify/create-from-setlist',
                              {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ setlistId: s.id }),
                              },
                            );
                            if (res.status === 401) {
                              const returnTo =
                                typeof window !== 'undefined'
                                  ? window.location.href
                                  : `/projects/${id}/setlists`;
                              window.location.href = `/api/integrations/spotify/login?returnTo=${encodeURIComponent(returnTo)}`;
                              return;
                            }
                            if (!res.ok) throw new Error('Failed to create playlist');
                            const json = await res.json();
                            if (json.url) window.open(json.url, '_blank', 'noopener');
                          } catch (e) {
                            alert('Unable to create Spotify playlist.');
                          }
                        }}
                      >
                        <svg
                          width="22"
                          height="22"
                          viewBox="0 0 22 22"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <circle
                            cx="11"
                            cy="11"
                            r="10"
                            fill="#22c55e"
                            stroke="#22c55e"
                            strokeWidth="2"
                          />
                          <rect x="7" y="7" width="8" height="1.5" rx="0.75" fill="#fff" />
                          <rect x="7" y="10" width="8" height="1.5" rx="0.75" fill="#fff" />
                          <rect x="7" y="13" width="8" height="1.5" rx="0.75" fill="#fff" />
                        </svg>
                      </button>
                      <button
                        className="rounded border border-blue-600 px-2 py-1 text-xs text-blue-400 hover:bg-blue-900"
                        title="Lyric Mode"
                        aria-label="Lyric Mode"
                        tabIndex={-1}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          window.location.href = `/setlists/${s.id}/lyric-mode`;
                        }}
                      >
                        🎤 Lyric Mode
                      </button>
                      <button
                        className="rounded border border-yellow-500 px-2 py-1 text-xs text-yellow-400 hover:bg-yellow-900"
                        title="Cache Offline"
                        aria-label="Cache Offline"
                        disabled={cacheStatus[s.id] === 'saving'}
                        tabIndex={-1}
                        onClick={async (e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setCacheStatus((prev) => ({ ...prev, [s.id]: 'saving' }));
                          try {
                            const setlistRes = await fetch(`/api/setlists/${s.id}`);
                            if (!setlistRes.ok) throw new Error('Failed to fetch setlist');
                            const setlistData = await setlistRes.json();
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
                            localStorage.setItem(`offline-setlist-${s.id}`, JSON.stringify(cache));
                            setCacheStatus((prev) => ({ ...prev, [s.id]: 'saved' }));
                            setTimeout(
                              () => setCacheStatus((prev) => ({ ...prev, [s.id]: 'idle' })),
                              2000,
                            );
                          } catch {
                            setCacheStatus((prev) => ({ ...prev, [s.id]: 'error' }));
                            setTimeout(
                              () => setCacheStatus((prev) => ({ ...prev, [s.id]: 'idle' })),
                              2000,
                            );
                          }
                        }}
                      >
                        💾 Cache Offline
                      </button>
                      {cacheStatus[s.id] && cacheStatus[s.id] !== 'idle' && (
                        <span
                          className={
                            cacheStatus[s.id] === 'saved'
                              ? 'ml-2 text-green-400'
                              : cacheStatus[s.id] === 'saving'
                                ? 'ml-2 text-yellow-400'
                                : 'ml-2 text-red-400'
                          }
                        >
                          {cacheStatus[s.id] === 'saving' && 'Saving...'}
                          {cacheStatus[s.id] === 'saved' && 'Saved for offline use!'}
                          {cacheStatus[s.id] === 'error' && 'Error saving offline.'}
                        </span>
                      )}
                    </td>
                  </tr>
                </Link>
              );
            })}
            {setlists.length === 0 && (
              <tr>
                <td className="p-4 text-sm text-neutral-600" colSpan={4}>
                  No setlists yet. Use Create above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
