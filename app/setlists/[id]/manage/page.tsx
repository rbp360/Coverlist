'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function SetlistManagePage() {
  const { id } = useParams<{ id: string }>();
  const [name, setName] = useState<string>('Setlist');
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
        <Link className="rounded border px-3 py-1 text-sm" href={`/setlists/${id}`}>
          Open Editor
        </Link>
      </div>

      <div className="rounded border bg-black p-4 text-white">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            className="rounded border px-3 py-3 text-center hover:bg-neutral-900"
            href={`/setlists/${id}/lyric-mode`}
          >
            Lyric Mode
          </Link>
          <button
            className="rounded border px-3 py-3 text-center hover:bg-neutral-900"
            onClick={copySetlist}
            disabled={copying}
            title="Create a duplicate of this setlist"
          >
            {copying ? 'Copying…' : 'Copy'}
          </button>
          <button
            className="rounded border px-3 py-3 text-center hover:bg-neutral-900"
            onClick={createPlaylist}
            disabled={creating}
            title="Create a Spotify playlist from this setlist"
          >
            {creating ? 'Creating…' : 'Create Playlist'}
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

      <div>
        <Link className="underline" href="/projects">
          Back to Projects
        </Link>
      </div>
    </div>
  );
}
