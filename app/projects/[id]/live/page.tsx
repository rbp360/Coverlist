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
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Live Mode</h2>
        <Link className="rounded border px-3 py-1 text-sm" href={`/projects/${id}`}>
          Back to Project
        </Link>
      </div>

      <div className="rounded border bg-black text-white">
        <table className="min-w-full text-sm">
          <thead>
            <tr>
              <th className="p-2 text-left">Setlist</th>
              <th className="p-2 text-left">Songs</th>
              <th className="p-2 text-left">Duration</th>
              <th className="p-2 text-left">When/Where</th>
              <th className="p-2 text-left">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="p-2">{r.name}</td>
                <td className="p-2 text-neutral-400">{r.songCount}</td>
                <td className="p-2 text-neutral-400">{fmt(r.duration)}</td>
                <td className="p-2 text-neutral-500">
                  {r.date ? <span>{r.date}</span> : null}
                  {r.venue ? <span className="ml-2">{r.venue}</span> : null}
                </td>
                <td className="p-2">
                  <a
                    className="rounded bg-black px-3 py-1 text-white underline"
                    href={`/setlists/${r.id}/lyric-mode`}
                    target="_blank"
                    rel="noopener"
                  >
                    Open Lyric mode
                  </a>
                </td>
              </tr>
            ))}
            {!loading && rows.length === 0 && (
              <tr>
                <td className="p-4 text-sm text-neutral-600" colSpan={5}>
                  No setlists yet. Create one under the Setlists tab.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
