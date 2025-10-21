'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

type Result = {
  mbid?: string;
  title: string;
  artist: string;
  durationSec?: number;
  release?: string;
};
type Song = { id: string; title: string; artist: string; mbid?: string };

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<any | null>(null);
  const [q, setQ] = useState('');
  const [artist, setArtist] = useState('');
  const [genre, setGenre] = useState('');
  const [results, setResults] = useState<Result[]>([]);
  const [page, setPage] = useState(1); // 1-based page index
  const [message, setMessage] = useState<string | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [importing, setImporting] = useState<string | null>(null);
  const [invites, setInvites] = useState<any[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/projects/${id}`);
      if (res.ok) setProject(await res.json());
      // Load existing songs for this project to detect already imported items
      const rs = await fetch(`/api/projects/${id}/songs`);
      if (rs.ok) setSongs((await rs.json()).songs);
    })();
  }, [id]);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams({ q, limit: '30' });
    if (artist.trim()) params.set('artist', artist.trim());
    if (genre.trim()) params.set('genre', genre.trim());
    const res = await fetch(`/api/musicbrainz/search?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      setResults(data.results || []);
      setPage(1); // reset to first page on new search
    }
  }

  async function importSong(r: Result) {
    setMessage(null);
    setImporting(r.mbid || `${r.title}|${r.artist}`);
    const res = await fetch('/api/songs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: id,
        title: r.title,
        artist: r.artist,
        durationSec: r.durationSec,
        mbid: r.mbid,
      }),
    });
    if (res.ok) {
      const created = await res.json();
      setSongs((prev) => [...prev, created]);
      setMessage('Imported!');
      // Pop-up confirmation to make success obvious
      try {
        alert('Song imported successfully');
      } catch {}
    } else {
      setMessage('Import failed');
    }
    setImporting(null);
  }

  function isImported(r: Result): boolean {
    const norm = (s: string) => s.trim().toLowerCase();
    return songs.some((s) =>
      r.mbid && s.mbid
        ? s.mbid === r.mbid
        : norm(s.title) === norm(r.title) && norm(s.artist) === norm(r.artist),
    );
  }

  async function loadInvites() {
    const res = await fetch(`/api/projects/${id}/invites`);
    if (res.ok) setInvites((await res.json()).invites);
  }

  async function createInvite() {
    const res = await fetch(`/api/projects/${id}/invites`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: inviteEmail }),
    });
    if (res.ok) {
      setInviteEmail('');
      loadInvites();
    }
  }

  async function revokeInvite(inviteId: string) {
    const res = await fetch(`/api/invites/${inviteId}/revoke`, { method: 'POST' });
    if (res.ok) loadInvites();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Project</h2>
        <div className="flex gap-2 text-sm">
          <Link className="rounded border px-3 py-1" href={`/projects/${id}/repertoire`}>
            Repertoire
          </Link>
          <Link className="rounded border px-3 py-1" href={`/projects/${id}/setlists`}>
            Setlists
          </Link>
        </div>
      </div>
      {project && (
        <div className="rounded border bg-black p-3 text-white">
          <div className="mb-1 font-medium">Members</div>
          <div className="text-sm text-neutral-700">
            Owner: <span className="text-neutral-500">{project.ownerId}</span>
          </div>
          <ul className="mt-1 list-disc pl-5 text-sm">
            {project.memberIds.length === 0 && (
              <li className="text-neutral-600">No members yet.</li>
            )}
            {project.memberIds.map((m: string) => (
              <li key={m}>
                <span className="text-neutral-500">{m}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="rounded border bg-black p-3 text-white">
        <div className="mb-2 font-medium">Share project</div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            className="rounded border px-3 py-2"
            placeholder="Invite by email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
          />
          <button className="rounded bg-black px-3 py-2 text-white" onClick={createInvite}>
            Invite
          </button>
          <button className="rounded border px-3 py-2" onClick={loadInvites}>
            Refresh
          </button>
          <a
            className="rounded border px-3 py-2"
            href="/invites/accept"
            title="Paste your token to accept an invite"
          >
            Accept invite
          </a>
        </div>
        <ul className="mt-2 divide-y">
          {invites.map((inv) => (
            <li key={inv.id} className="flex items-center justify-between py-2 text-sm">
              <div>
                <div>
                  {inv.email} — <span className="text-neutral-600">{inv.status}</span>
                </div>
                <div className="text-xs text-neutral-500">
                  Token (dev): {inv.token} ·{' '}
                  <a className="underline" href={`/invites/accept?token=${inv.token}`}>
                    accept
                  </a>
                </div>
              </div>
              {inv.status === 'pending' && (
                <button className="rounded border px-2 py-1" onClick={() => revokeInvite(inv.id)}>
                  Revoke
                </button>
              )}
            </li>
          ))}
          {invites.length === 0 && (
            <li className="py-2 text-sm text-neutral-600">No invites yet.</li>
          )}
        </ul>
      </div>
      <form onSubmit={search} className="grid gap-2 md:grid-cols-4">
        <input
          className="rounded border px-3 py-2"
          placeholder="Title (e.g., Wonderwall)"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <input
          className="rounded border px-3 py-2"
          placeholder="Artist (optional)"
          value={artist}
          onChange={(e) => setArtist(e.target.value)}
        />
        <input
          className="rounded border px-3 py-2"
          placeholder="Genre/Tag (optional)"
          value={genre}
          onChange={(e) => setGenre(e.target.value)}
        />
        <button className="rounded bg-black px-3 py-2 text-white">Search</button>
      </form>
      {message && <p className="text-sm text-gray-700">{message}</p>}
      <ul className="divide-y rounded border bg-black text-white">
        {results.slice((page - 1) * 10, page * 10).map((r) => {
          const imported = isImported(r);
          const isBusy = importing === (r.mbid || `${r.title}|${r.artist}`);
          return (
            <li
              key={`${r.mbid}-${r.title}-${r.artist}`}
              className="flex items-center justify-between p-3"
            >
              <div>
                <div className="font-medium">
                  {r.title} <span className="text-gray-500">— {r.artist}</span>
                </div>
                {(r.durationSec || r.release) && (
                  <div className="text-sm text-gray-600">
                    {r.durationSec != null && (
                      <>
                        {Math.floor(r.durationSec / 60)}:
                        {String(r.durationSec % 60).padStart(2, '0')}
                        {r.release ? ' • ' : ''}
                      </>
                    )}
                    {r.release && <span className="text-xs text-gray-500">{r.release}</span>}
                  </div>
                )}
              </div>
              <button
                className={`rounded border px-3 py-1 text-sm ${imported ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => !imported && !isBusy && importSong(r)}
                disabled={imported || isBusy}
                title={imported ? 'Already imported' : 'Import this song'}
              >
                {imported ? 'Already imported' : isBusy ? 'Importing…' : 'Import'}
              </button>
            </li>
          );
        })}
        {results.length === 0 && (
          <li className="p-4 text-sm text-gray-600">No results yet. Try searching.</li>
        )}
      </ul>
      {/* Pagination controls */}
      {results.length > 10 && (
        <div className="mt-2 flex items-center justify-center gap-2">
          <button
            className="rounded border px-2 py-1 text-sm disabled:opacity-50"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Prev
          </button>
          {Array.from({ length: Math.min(3, Math.ceil(results.length / 10)) }, (_, i) => i + 1).map(
            (p) => (
              <button
                key={p}
                className={`rounded border px-2 py-1 text-sm ${page === p ? 'bg-white text-black' : ''}`}
                onClick={() => setPage(p)}
              >
                {p}
              </button>
            ),
          )}
          <button
            className="rounded border px-2 py-1 text-sm disabled:opacity-50"
            onClick={() => setPage((p) => Math.min(Math.ceil(results.length / 10), p + 1))}
            disabled={page >= Math.ceil(results.length / 10)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
