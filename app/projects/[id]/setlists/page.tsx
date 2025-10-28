'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

type Setlist = { id: string; name: string; showArtist: boolean; items: any[] };

export default function ProjectSetlistsPage() {
  const { id } = useParams<{ id: string }>();
  const [setlists, setSetlists] = useState<Setlist[]>([]);
  const [name, setName] = useState('New Setlist');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [creating, setCreating] = useState<string | null>(null);
  const [copying, setCopying] = useState<string | null>(null);
  const [playlistUrls, setPlaylistUrls] = useState<Record<string, string>>({});
  const [deleting, setDeleting] = useState<string | null>(null);

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
                // Try clearing the session and send user to login
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
        <input
          className="flex-1 rounded border px-3 py-2"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button className="rounded bg-black px-3 py-2 text-white" onClick={create}>
          Create
        </button>
      </div>

      <ul className="divide-y rounded border bg-black text-white">
        {setlists.map((s) => {
          const songCount = (s.items || []).filter((it: any) => it?.type === 'song').length;
          return (
            <li key={s.id} className="flex items-center justify-between p-3 gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <button
                    className="rounded border border-red-600 px-2 py-1 text-xs text-red-600 disabled:opacity-50"
                    title="Delete setlist"
                    aria-label="Delete setlist"
                    disabled={deleting === s.id}
                    onClick={async () => {
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
                    🗑️
                  </button>
                  <div className="font-medium">{s.name}</div>
                </div>
                <div className="text-sm text-gray-600">
                  {songCount} {songCount === 1 ? 'song' : 'songs'}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link className="rounded border px-3 py-1 text-sm" href={`/setlists/${s.id}`}>
                  Edit
                </Link>
                <button
                  className="rounded border px-3 py-1 text-sm"
                  disabled={copying === s.id}
                  onClick={async () => {
                    try {
                      const suggested = `${s.name} (copy)`;
                      const newName = window.prompt(
                        'What do you want to name this copy?',
                        suggested,
                      );
                      if (!newName) return; // user cancelled
                      setCopying(s.id);
                      // Fetch the full setlist to get items/showArtist
                      const getRes = await fetch(`/api/setlists/${s.id}`);
                      if (!getRes.ok) throw new Error('Failed to read setlist');
                      const src = await getRes.json();
                      const payload = {
                        name: newName.trim() || suggested,
                        showArtist: typeof src.showArtist === 'boolean' ? src.showArtist : true,
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
                  className="rounded border px-3 py-1 text-sm"
                  disabled={creating === s.id}
                  onClick={async () => {
                    setCreating(s.id);
                    try {
                      const res = await fetch('/api/integrations/spotify/create-from-setlist', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ setlistId: s.id }),
                      });
                      if (res.status === 401) {
                        // Kick off OAuth
                        const returnTo =
                          typeof window !== 'undefined' ? window.location.href : '/profile';
                        window.location.href = `/api/integrations/spotify/login?returnTo=${encodeURIComponent(returnTo)}`;
                        return;
                      }
                      if (!res.ok) throw new Error('Failed to create playlist');
                      const json = await res.json();
                      setPlaylistUrls((prev) => ({ ...prev, [s.id]: json.url }));
                    } catch (e) {
                      alert('Unable to create Spotify playlist.');
                    } finally {
                      setCreating(null);
                    }
                  }}
                >
                  {creating === s.id ? 'Creating…' : 'Create Playlist'}
                </button>
                {playlistUrls[s.id] && (
                  <a
                    className="rounded border px-3 py-1 text-sm underline"
                    href={playlistUrls[s.id]}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open in Spotify
                  </a>
                )}
              </div>
            </li>
          );
        })}
        {setlists.length === 0 && <li className="p-4 text-sm text-gray-600">No setlists yet.</li>}
      </ul>
    </div>
  );
}
