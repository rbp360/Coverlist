'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

type Setlist = {
  id: string;
  name: string;
  items: Array<{
    id: string;
    type: 'song' | 'break' | 'note' | 'section';
    order: number;
    durationSec?: number;
  }>;
  date?: string;
  venue?: string;
};

function fmt(sec?: number) {
  if (!sec && sec !== 0) return '';
  const m = Math.floor((sec || 0) / 60);
  const s = String((sec || 0) % 60).padStart(2, '0');
  return `${m}:${s}`;
}

export default function LiveModePickerPage() {
  const { id } = useParams<{ id: string }>();
  const [setlists, setSetlists] = useState<Setlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState('New Setlist');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const res = await fetch(`/api/projects/${id}/setlists`);
        if (!res.ok) {
          setError(res.status === 401 ? 'Please sign in.' : 'Failed to load setlists');
          setLoading(false);
          return;
        }
        const data = await res.json();
        if (!cancelled) setSetlists((data.setlists || []) as Setlist[]);
      } catch {
        if (!cancelled) setError('Failed to load setlists');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const rows = useMemo(() => {
    return setlists.map((s) => {
      const items = (s.items || []).slice().sort((a, b) => a.order - b.order);
      const songCount = items.filter((i) => i.type === 'song').length;
      const duration = items.reduce((acc, it) => acc + (it.durationSec || 0), 0);
      return { id: s.id, name: s.name, date: s.date, venue: s.venue, songCount, duration };
    });
  }, [setlists]);

  return (
    <div className="space-y-4">
      {/* Top controls: Create Setlist + Back to Project */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-1">
          <input
            className="rounded border px-3 py-2 flex-1 min-w-[220px]"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New setlist name"
          />
          <button
            className="rounded bg-black px-3 py-2 text-white"
            onClick={async () => {
              try {
                const res = await fetch(`/api/projects/${id}/setlists`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ name: newName || 'New Setlist', showArtist: true }),
                });
                if (res.ok) {
                  setNewName('New Setlist');
                  const r2 = await fetch(`/api/projects/${id}/setlists`, { cache: 'no-store' });
                  if (r2.ok) setSetlists((await r2.json()).setlists || []);
                }
              } catch {}
            }}
          >
            Create Setlist
          </button>
        </div>
        <Link className="rounded border px-3 py-2 text-sm" href={`/projects/${id}`}>
          Back to Project
        </Link>
      </div>

      {/* Setlists table */}
      <div className="rounded border bg-black text-white">
        <input type="search" className="hidden" aria-hidden="true" readOnly value="" />
        <table className="min-w-full text-sm">
          <thead>
            <tr>
              <th className="p-2 text-left">Setlist</th>
              <th className="p-2 text-left">Songs</th>
              <th className="p-2 text-left">Duration</th>
              <th className="p-2 text-left">When/Where</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.id}
                className="border-t hover:bg-neutral-900 cursor-pointer"
                onClick={() => {
                  window.location.href = `/setlists/${r.id}/manage`;
                }}
                role="link"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    window.location.href = `/setlists/${r.id}/manage`;
                  }
                }}
                title="Open advanced management"
              >
                <td className="p-2">{r.name}</td>
                <td className="p-2 text-neutral-400">{r.songCount}</td>
                <td className="p-2 text-neutral-400">{fmt(r.duration)}</td>
                <td className="p-2 text-neutral-500">
                  {r.date ? <span>{r.date}</span> : null}
                  {r.venue ? <span className="ml-2">{r.venue}</span> : null}
                </td>
              </tr>
            ))}
            {!loading && rows.length === 0 && (
              <tr>
                <td className="p-4 text-sm text-neutral-600" colSpan={4}>
                  No setlists yet. Use Create Setlist above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
