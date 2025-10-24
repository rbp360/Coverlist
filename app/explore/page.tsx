'use client';
import { useEffect, useState } from 'react';

export default function ExplorePage() {
  const [project, setProject] = useState('');
  const [name, setName] = useState('');
  const [venue, setVenue] = useState('');
  const [date, setDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<
    Array<{
      id: string;
      name: string;
      projectName: string;
      date?: string;
      time?: string;
      venue?: string;
      totalDurationSec?: number;
    }>
  >([]);

  async function search() {
    setLoading(true);
    const params = new URLSearchParams();
    if (project) params.set('project', project);
    if (name) params.set('name', name);
    if (venue) params.set('venue', venue);
    if (date) params.set('date', date);
    const res = await fetch(`/api/public/setlists/search?${params.toString()}`);
    const data = await res.json();
    setResults(data.results || []);
    setLoading(false);
  }

  useEffect(() => {
    search();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Look up setlists</h2>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <input
          className="rounded border px-2 py-1"
          placeholder="Project"
          value={project}
          onChange={(e) => setProject(e.target.value)}
        />
        <input
          className="rounded border px-2 py-1"
          placeholder="Setlist name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className="rounded border px-2 py-1"
          placeholder="Venue"
          value={venue}
          onChange={(e) => setVenue(e.target.value)}
        />
        <input
          className="rounded border px-2 py-1"
          placeholder="Date (YYYY-MM-DD)"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>
      <div>
        <button
          className="rounded bg-brand-500 px-3 py-2 text-black"
          onClick={search}
          disabled={loading}
        >
          {loading ? 'Searching…' : 'Search'}
        </button>
      </div>
      <div className="divide-y">
        {results.map((r) => (
          <a
            key={r.id}
            href={`/explore/${r.id}`}
            className="block py-3 hover:bg-neutral-900 rounded"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">{r.name}</div>
                <div className="text-xs text-neutral-400">
                  {r.projectName}
                  {r.venue ? ` • ${r.venue}` : ''}
                  {r.date ? ` • ${r.date}` : ''}
                  {r.time ? ` • ${r.time}` : ''}
                  {typeof r.totalDurationSec === 'number' && r.totalDurationSec > 0
                    ? ` • ${formatTotal(r.totalDurationSec)}`
                    : ''}
                </div>
              </div>
              <div className="text-xs text-neutral-500">View</div>
            </div>
          </a>
        ))}
        {results.length === 0 && !loading && (
          <div className="text-neutral-500">No public setlists found.</div>
        )}
      </div>
    </div>
  );
}

function formatTotal(totalSec: number): string {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const hLabel = h === 1 ? 'hour' : 'hours';
  const mLabel = m === 1 ? 'minute' : 'minutes';
  if (h > 0 && m > 0) return `${h} ${hLabel} ${m} ${mLabel}`;
  if (h > 0) return `${h} ${hLabel}`;
  return `${m} ${mLabel}`;
}
