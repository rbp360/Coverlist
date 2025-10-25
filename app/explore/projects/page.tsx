'use client';
import { useEffect, useState } from 'react';

export default function ExploreProjectsPage() {
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<
    Array<{
      id: string;
      name: string;
      ownerName?: string;
      memberCount: number;
      isMember: boolean;
      joinRequestStatus?: string | null;
    }>
  >([]);
  const [requesting, setRequesting] = useState<string | null>(null);

  async function search() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set('q', q.trim());
      const res = await fetch(`/api/projects/search?${params.toString()}`);
      const data = await res.json();
      setResults(data.results || []);
    } finally {
      setLoading(false);
    }
  }

  async function requestJoin(projectId: string) {
    setRequesting(projectId);
    try {
      const res = await fetch(`/api/projects/${projectId}/join-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (res.ok) {
        setResults((prev) =>
          prev.map((p) => (p.id === projectId ? { ...p, joinRequestStatus: data.status } : p)),
        );
        try {
          alert('Request sent');
        } catch {}
      }
    } finally {
      setRequesting(null);
    }
  }

  useEffect(() => {
    search();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Find Projects</h2>
      <div className="flex gap-2">
        <input
          className="flex-1 rounded border px-3 py-2"
          placeholder="Search projects by name"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button
          className="rounded bg-black px-3 py-2 text-white"
          onClick={search}
          disabled={loading}
        >
          {loading ? 'Searching…' : 'Search'}
        </button>
      </div>
      <ul className="divide-y rounded border bg-black text-white">
        {results.map((p) => (
          <li key={p.id} className="flex items-center justify-between p-3">
            <div>
              <div className="font-medium">{p.name}</div>
              <div className="text-xs text-neutral-400">
                Owner: {p.ownerName || 'Unknown'} • Members: {p.memberCount}
              </div>
            </div>
            <div>
              {p.isMember ? (
                <span className="text-xs text-neutral-400">You are a member</span>
              ) : p.joinRequestStatus === 'pending' ? (
                <span className="text-xs text-neutral-400">Request pending</span>
              ) : (
                <button
                  className="rounded border px-3 py-1 text-sm"
                  disabled={!!requesting}
                  onClick={() => requestJoin(p.id)}
                >
                  {requesting === p.id ? 'Requesting…' : 'Request to Join'}
                </button>
              )}
            </div>
          </li>
        ))}
        {results.length === 0 && !loading && (
          <li className="p-4 text-sm text-neutral-400">No projects found.</li>
        )}
      </ul>
    </div>
  );
}
