'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

// Dayglo color palette (Tailwind + custom)
const PROJECT_COLORS = [
  'text-green-400',
  'text-pink-400', // more dayglo pink
  'text-orange-400', // orange
  'text-sky-400', // blue
  'text-yellow-300', // yellow
  'text-fuchsia-700', // darker purple (last)
];
function getProjectColor(projectId: string, projects: { id: string }[]): string {
  const idx = projects.findIndex((p) => p.id === projectId);
  return PROJECT_COLORS[idx % PROJECT_COLORS.length] || 'text-green-400';
}

type Song = {
  id: string;
  title: string;
  artist: string;
  durationSec?: number;
  key?: string;
  tempo?: number;
  transposedKey?: string;
  notes?: string;
  url?: string;
  isrc?: string;
};

function fmt(sec?: number) {
  if (!sec) return '';
  const m = Math.floor(sec / 60);
  const s = String(sec % 60).padStart(2, '0');
  return `${m}:${s}`;
}

function formatKey(key?: string) {
  if (!key) return '';
  return key.charAt(0).toUpperCase() + key.slice(1).toLowerCase();
}

export default function RepertoirePage() {
  const { id } = useParams<{ id: string }>();
  const [songs, setSongs] = useState<Song[]>([]);
  const [saving, setSaving] = useState<string | null>(null);
  const [resolving, setResolving] = useState<string | null>(null);
  // Removed AI enrichment; manual key/tempo only
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [project, setProject] = useState<any | null>(null);
  const [allProjects, setAllProjects] = useState<any[]>([]);

  const filtered = songs;

  async function load() {
    const res = await fetch(`/api/projects/${id}/songs`);
    if (res.ok) setSongs((await res.json()).songs);
  }

  async function loadProject() {
    const res = await fetch(`/api/projects/${id}`);
    if (res.ok) setProject(await res.json());
  }

  async function loadAllProjects() {
    const res = await fetch('/api/projects');
    if (res.ok) setAllProjects(await res.json());
  }

  useEffect(() => {
    load();
    loadProject();
    loadAllProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function saveField(song: Song, patch: Partial<Song>) {
    setSaving(song.id);
    const res = await fetch(`/api/projects/${id}/songs`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: song.id, ...patch }),
    });
    setSaving(null);
    if (res.ok) {
      const updated = await res.json();
      setSongs((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    }
  }

  // Enrichment button removed

  // Find color for this project
  const projectColor =
    project && allProjects.length ? getProjectColor(project.id, allProjects) : 'text-green-400';

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        {project && (
          <>
            <span className={`truncate font-semibold text-2xl ${projectColor}`}>
              {project.name}
            </span>
            <span className="text-xl text-neutral-400">/</span>
          </>
        )}
        <h2 className="text-2xl font-semibold">Project Repertoire</h2>
      </div>
      {/* Song search moved to /repertoire. Listing below shows this project's songs. */}
      <div className="overflow-auto rounded border bg-black text-white">
        <table className="min-w-full text-sm">
          <thead className="bg-black text-left text-white">
            <tr>
              <th className="p-2 w-10">&nbsp;</th>
              <th className="p-2">Title</th>
              <th className="p-2">Artist</th>
              <th className="p-2">Dur</th>
              <th className="p-2">Key</th>
              <th className="p-2">Tempo</th>
              {/* Removed auto-generate column */}
              <th className="p-2">Notes</th>
              <th className="p-2">Spotify</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
              <tr key={s.id} className="border-t">
                <td className="p-2">
                  <button
                    className="rounded border p-1 text-xs hover:bg-neutral-100"
                    aria-label={`Delete ${s.title} by ${s.artist}`}
                    title="Delete this song from the repertoire"
                    onClick={async () => {
                      const confirmed = window.confirm(
                        `Delete \"${s.title}\" by ${s.artist}? This cannot be undone.`,
                      );
                      if (!confirmed) return;
                      setDeleting(s.id);
                      const res = await fetch(`/api/projects/${id}/songs`, {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ songId: s.id }),
                      });
                      setDeleting(null);
                      if (res.ok) {
                        setSongs((prev) => prev.filter((x) => x.id !== s.id));
                      }
                    }}
                    disabled={deleting === s.id}
                  >
                    {deleting === s.id ? (
                      '…'
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="h-4 w-4"
                      >
                        <path d="M9 3a1 1 0 0 0-1 1v1H5.5a1 1 0 1 0 0 2H6v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7h.5a1 1 0 1 0 0-2H16V4a1 1 0 0 0-1-1H9zm2 2h2V4h-2v1zM8 7h10v12a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V7zm3 3a1 1 0 1 0-2 0v7a1 1 0 1 0 2 0v-7zm5 0a1 1 0 1 0-2 0v7a1 1 0 1 0 2 0v-7z" />
                      </svg>
                    )}
                  </button>
                </td>
                <td className="p-2">{s.title}</td>
                <td className="p-2 text-neutral-600">{s.artist}</td>
                <td className="p-2 text-neutral-600">{fmt(s.durationSec)}</td>
                <td className="p-2">
                  <input
                    className="w-24 rounded border px-2 py-1 font-mono"
                    style={{
                      fontFamily:
                        'ui-monospace, SFMono-Regular, "SF Mono", Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                    }}
                    defaultValue={formatKey(s.key)}
                    onBlur={(e) => saveField(s, { key: formatKey(e.target.value) || undefined })}
                  />
                </td>
                <td className="p-2">
                  <input
                    type="number"
                    className="w-20 rounded border px-2 py-1"
                    defaultValue={s.tempo || ''}
                    onBlur={(e) =>
                      saveField(s, { tempo: e.target.value ? Number(e.target.value) : undefined })
                    }
                  />
                </td>
                {/* Auto-generate removed; keep manual key/tempo inputs */}
                <td className="p-2">
                  <input
                    className="w-48 rounded border px-2 py-1"
                    defaultValue={s.notes || ''}
                    onBlur={(e) => saveField(s, { notes: e.target.value || undefined })}
                  />
                </td>
                <td className="p-2">
                  {s.url ? (
                    <a
                      className="inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-xs whitespace-nowrap hover:bg-neutral-100"
                      href={s.url}
                      target="_blank"
                      rel="noreferrer"
                      title="Open in Spotify"
                      aria-label={`Open ${s.title} on Spotify`}
                    >
                      <span
                        aria-hidden
                        className="inline-block h-3.5 w-3.5 rounded-full"
                        style={{ backgroundColor: '#1DB954' }}
                      />
                      <span className="underline-offset-2 hover:underline">Open</span>
                    </a>
                  ) : (
                    <button
                      className="group inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-xs whitespace-nowrap hover:bg-neutral-100 disabled:opacity-50"
                      title="Find on Spotify"
                      aria-label={`Find ${s.title} on Spotify`}
                      disabled={resolving === s.id}
                      onClick={async () => {
                        try {
                          setResolving(s.id);
                          const res = await fetch(
                            `/api/projects/${id}/songs/${s.id}/resolve-spotify`,
                            { method: 'POST' },
                          );
                          if (res.status === 401) {
                            const returnTo =
                              typeof window !== 'undefined'
                                ? window.location.href
                                : `/projects/${id}/repertoire`;
                            window.location.href = `/api/integrations/spotify/login?returnTo=${encodeURIComponent(
                              returnTo,
                            )}`;
                            return;
                          }
                          if (!res.ok) {
                            // Fallback: open a public search if resolver fails
                            const searchUrl = s.isrc
                              ? `https://open.spotify.com/search/${encodeURIComponent(s.isrc)}`
                              : `https://open.spotify.com/search/${encodeURIComponent(`${s.title} ${s.artist}`)}`;
                            window.open(searchUrl, '_blank', 'noopener');
                            return;
                          }
                          const json = await res.json();
                          if (json?.song?.url) {
                            setSongs((prev) =>
                              prev.map((x) => (x.id === s.id ? { ...x, url: json.song.url } : x)),
                            );
                            try {
                              window.open(json.song.url, '_blank', 'noopener');
                            } catch {}
                          } else {
                            const searchUrl = s.isrc
                              ? `https://open.spotify.com/search/${encodeURIComponent(s.isrc)}`
                              : `https://open.spotify.com/search/${encodeURIComponent(`${s.title} ${s.artist}`)}`;
                            window.open(searchUrl, '_blank', 'noopener');
                          }
                        } catch {
                          // Ignore
                        } finally {
                          setResolving(null);
                        }
                      }}
                    >
                      {/* Green dot + tiny equalizer animation instead of a GIF to keep it lightweight */}
                      <span className="relative inline-flex items-end gap-0.5">
                        <span
                          aria-hidden
                          className="inline-block h-3.5 w-3.5 rounded-full"
                          style={{ backgroundColor: '#1DB954' }}
                        />
                        <span className="inline-flex items-end gap-[2px] pl-[2px]">
                          <span className="h-2 w-[2px] bg-black/60 animate-pulse [animation-duration:1200ms]" />
                          <span className="h-1.5 w-[2px] bg-black/60 animate-pulse [animation-duration:900ms]" />
                          <span className="h-2.5 w-[2px] bg-black/60 animate-pulse [animation-duration:1500ms]" />
                        </span>
                      </span>
                      <span>{resolving === s.id ? 'Finding…' : 'Find'}</span>
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="p-4 text-neutral-600">
                  No songs found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="space-y-1">
        {saving && <div className="text-sm text-neutral-600">Saving changes…</div>}
      </div>

      {/* Jump to To-Do list, Add from My Repertoire, and Export Entire Repertoire cards */}
      <div className="flex flex-row gap-4 mt-4">
        <div className="flex-1 rounded border bg-black p-4 flex flex-col items-center justify-between">
          <div className="mb-2 text-sm text-neutral-600">
            Click to access the To-Do list, see what others in your project have suggested, and give
            them a rating.
          </div>
          <Link
            className="inline-block rounded bg-black px-3 py-2 text-white border"
            href={`/projects/${id}/todo`}
          >
            Jump to To-Do list
          </Link>
        </div>
        <div className="flex-1 rounded border bg-black p-4 flex flex-col items-start justify-between">
          <div className="mb-2 text-sm text-neutral-600">Add songs from my repertoire</div>
          <Link
            className="inline-block rounded bg-black px-3 py-2 text-white border"
            href="/repertoire"
          >
            Go to My Repertoire
          </Link>
        </div>
        <div className="flex-1 rounded border bg-black p-4 flex flex-col items-start justify-between">
          <div className="mb-2 text-sm text-neutral-600">
            Export your entire song repertoire to send to others or publish on your media channels.
          </div>
          <button
            className="inline-block rounded bg-black px-3 py-2 text-white border mb-2"
            onClick={async () => {
              // Download PDF
              window.open(`/api/projects/${id}/repertoire/export/pdf`, '_blank');
            }}
          >
            Export Entire Repertoire (PDF)
          </button>
          <a
            className="rounded bg-black px-3 py-2 text-white border text-center cursor-pointer hover:bg-neutral-900 mt-2 mb-2 w-full max-w-xs"
            href={`/projects/${id}/repertoire/export/public`}
            target="_blank"
            rel="noopener noreferrer"
            title="Open a shareable, always-up-to-date online version of this repertoire"
          >
            Show Current Repertoire Online
          </a>
        </div>
      </div>
    </div>
  );
}
