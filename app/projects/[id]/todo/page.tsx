'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

export default function ProjectTodoPage() {
  const { id } = useParams<{ id: string }>();
  const [items, setItems] = useState<Array<any>>([]);
  const [members, setMembers] = useState<Array<{ id: string; name?: string; email: string }>>([]);
  const [me, setMe] = useState<{ id: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [todoRes, memRes, meRes] = await Promise.all([
          fetch(`/api/projects/${id}/todo`),
          fetch(`/api/projects/${id}/members`),
          fetch(`/api/profile`),
        ]);
        if (todoRes.ok) {
          const j = await todoRes.json();
          setItems(j.items || []);
        }
        if (memRes.ok) {
          const j = await memRes.json();
          setMembers(j.members || []);
        }
        if (meRes.ok) {
          const j = await meRes.json();
          setMe(j.user || null);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const memberMap = useMemo(() => {
    const map = new Map<string, { id: string; name?: string; email: string }>();
    members.forEach((m) => map.set(m.id, m));
    return map;
  }, [members]);

  function tallyVotes(votes?: Record<string, 'yes' | 'no'>) {
    const total = members.length;
    let yes = 0;
    let no = 0;
    if (votes) {
      Object.values(votes).forEach((v) => {
        if (v === 'yes') yes += 1;
        else if (v === 'no') no += 1;
      });
    }
    const voted = yes + no;
    const unvoted = Math.max(0, total - voted);
    return { total, yes, no, unvoted };
  }

  async function setVote(itemId: string, vote: 'yes' | 'no' | null) {
    setBusy(itemId);
    try {
      const res = await fetch(`/api/projects/${id}/todo`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: itemId, vote }),
      });
      if (res.ok) {
        const updated = await res.json();
        setItems((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
      }
    } finally {
      setBusy(null);
    }
  }

  async function resolveSpotify(item: any) {
    setBusy(item.id);
    try {
      const res = await fetch(`/api/projects/${id}/todo/${item.id}/resolve-spotify`, {
        method: 'POST',
      });
      if (res.status === 401) {
        const returnTo =
          typeof window !== 'undefined' ? window.location.href : `/projects/${id}/todo`;
        window.location.href = `/api/integrations/spotify/login?returnTo=${encodeURIComponent(returnTo)}`;
        return;
      }
      if (res.ok) {
        const json = await res.json();
        if (json?.url) {
          setItems((prev) => prev.map((x) => (x.id === item.id ? { ...x, url: json.url } : x)));
          try {
            window.open(json.url, '_blank', 'noopener');
          } catch {}
        }
      }
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-2xl font-semibold">Project To-Do</h2>
        <Link className="rounded border px-3 py-1" href={`/projects/${id}/rehearsal`}>
          Back to Rehearsal
        </Link>
      </div>
      <div className="text-sm text-neutral-500">
        See what others in your project have suggested and cast your vote.
      </div>

      <div className="overflow-auto rounded border bg-black text-white">
        <table className="min-w-full text-sm">
          <thead className="bg-black text-left text-white">
            <tr>
              <th className="p-2">Title</th>
              <th className="p-2">Artist</th>
              <th className="p-2">Notes</th>
              <th className="p-2">Link</th>
              <th className="p-2">Suggested by</th>
              <th className="p-2">Votes</th>
              <th className="p-2">Your vote</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => {
              const tally = tallyVotes(it.votes);
              const mine = me ? (it.votes || {})[me.id] : undefined;
              const sugg = memberMap.get(it.suggestedBy);
              return (
                <tr key={it.id} className="border-t">
                  <td className="p-2 font-medium">{it.title}</td>
                  <td className="p-2 text-neutral-400">{it.artist}</td>
                  <td className="p-2 text-neutral-300">{it.notes || ''}</td>
                  <td className="p-2">
                    {it.url ? (
                      <a className="underline" href={it.url} target="_blank" rel="noreferrer">
                        Open
                      </a>
                    ) : (
                      <button
                        className="rounded border px-2 py-0.5 text-xs"
                        onClick={() => resolveSpotify(it)}
                        disabled={busy === it.id}
                        title="Find on Spotify"
                      >
                        {busy === it.id ? 'Finding…' : 'Find'}
                      </button>
                    )}
                  </td>
                  <td className="p-2">{sugg ? sugg.name || sugg.email : '—'}</td>
                  <td className="p-2 text-neutral-300">
                    Yes: {tally.yes}/{tally.total} • No: {tally.no}/{tally.total} • Not voted:{' '}
                    {tally.unvoted}
                  </td>
                  <td className="p-2">
                    <div className="flex items-center gap-2">
                      <button
                        className={`rounded border px-2 py-0.5 text-xs ${mine === 'yes' ? 'bg-white text-black' : ''}`}
                        onClick={() => setVote(it.id, mine === 'yes' ? null : 'yes')}
                        disabled={busy === it.id}
                        title="Vote yes"
                      >
                        ✓ Yes
                      </button>
                      <button
                        className={`rounded border px-2 py-0.5 text-xs ${mine === 'no' ? 'bg-white text-black' : ''}`}
                        onClick={() => setVote(it.id, mine === 'no' ? null : 'no')}
                        disabled={busy === it.id}
                        title="Vote no"
                      >
                        ✕ No
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={7} className="p-4 text-neutral-600">
                  No suggestions yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
