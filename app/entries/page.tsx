'use client';
import { useEffect, useState } from 'react';

type Entry = {
  id: string;
  location: string;
  item: string;
  price: number;
  notes?: string;
};

export default function EntriesPage() {
  const [entries, setEntries] = useState<Entry[]>([]);

  useEffect(() => {
    fetch('/api/entries').then(async (r) => {
      if (r.status === 401) window.location.href = '/login';
      else setEntries(await r.json());
    });
  }, []);

  async function onLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Your Entries</h2>
        <div className="space-x-2">
          <a href="/entries/add" className="rounded bg-black px-3 py-2 text-white">
            Add Entry
          </a>
          <button onClick={onLogout} className="rounded border px-3 py-2">
            Logout
          </button>
        </div>
      </div>
      <ul className="divide-y rounded border bg-black text-white">
        {entries.map((e) => (
          <li key={e.id} className="flex items-center justify-between p-3">
            <div>
              <div className="font-medium">
                {e.item} <span className="text-gray-500">@ {e.location}</span>
              </div>
              {e.notes && <div className="text-sm text-gray-600">{e.notes}</div>}
            </div>
            <div className="flex items-center gap-3">
              <div className="tabular-nums">${e.price.toFixed(2)}</div>
              <a className="rounded border px-2 py-1 text-sm" href={`/entries/${e.id}`}>
                Edit
              </a>
              <button
                className="rounded border px-2 py-1 text-sm"
                onClick={async () => {
                  if (!confirm('Delete this entry?')) return;
                  await fetch(`/api/entries/${e.id}`, { method: 'DELETE' });
                  setEntries((cur) => cur.filter((x) => x.id !== e.id));
                }}
              >
                Delete
              </button>
            </div>
          </li>
        ))}
        {entries.length === 0 && <li className="p-4 text-sm text-gray-600">No entries yet.</li>}
      </ul>
    </div>
  );
}
