"use client";
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

type Setlist = { id: string; name: string; showArtist: boolean; items: any[] };

export default function ProjectSetlistsPage() {
  const { id } = useParams<{ id: string }>();
  const [setlists, setSetlists] = useState<Setlist[]>([]);
  const [name, setName] = useState('New Setlist');
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [pasteError, setPasteError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/projects/${id}/setlists`);
    if (res.ok) setSetlists((await res.json()).setlists);
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

  async function pasteImport() {
    setPasteError(null);
    try {
      const data = JSON.parse(pasteText);
      // Accept either full setlist or just { name, showArtist, items } or even just { items }
      const payload: any = {
        name: data.name || 'Imported Setlist',
        showArtist: typeof data.showArtist === 'boolean' ? data.showArtist : true,
        items: Array.isArray(data.items) ? data.items : Array.isArray(data) ? data : [],
      };
      const res = await fetch(`/api/projects/${id}/setlists`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Import failed');
      const created = await res.json();
      setPasteText('');
      setPasteOpen(false);
      // navigate to the new setlist
      window.location.href = `/setlists/${created.id}`;
    } catch (e: any) {
      setPasteError(e?.message || 'Invalid JSON');
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Setlists</h2>
      <div className="flex flex-wrap items-center gap-2">
        <input className="flex-1 rounded border px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} />
        <button className="rounded bg-black px-3 py-2 text-white" onClick={create}>Create</button>
        <button className="rounded border px-3 py-2" onClick={() => setPasteOpen((v)=>!v)}>{pasteOpen ? 'Close' : 'Paste JSON'}</button>
      </div>
      {pasteOpen && (
        <div className="rounded border bg-white p-3">
          <div className="mb-2 text-sm text-gray-700">Paste a setlist JSON here. Accepted shapes: full setlist object, an object with keys name/showArtist/items, or simply an array of items.</div>
          <textarea className="h-40 w-full rounded border p-2 font-mono text-sm" value={pasteText} onChange={(e)=>setPasteText(e.target.value)} />
          {pasteError && <div className="mt-2 text-sm text-red-600">{pasteError}</div>}
          <div className="mt-2 flex justify-end">
            <button className="rounded bg-black px-3 py-2 text-white" onClick={pasteImport}>Create from JSON</button>
          </div>
        </div>
      )}
      <ul className="divide-y rounded border bg-white">
        {setlists.map((s) => (
          <li key={s.id} className="flex items-center justify-between p-3 gap-2">
            <div>
              <div className="font-medium">{s.name}</div>
              <div className="text-sm text-gray-600">{s.items.length} items</div>
            </div>
            <div className="flex items-center gap-2">
              <Link className="rounded border px-3 py-1 text-sm" href={`/setlists/${s.id}`}>Edit</Link>
              <button
                className="rounded border px-3 py-1 text-sm"
                onClick={async () => {
                  const res = await fetch(`/api/setlists/${s.id}/copy`, { method: 'POST' });
                  if (res.ok) {
                    await load();
                  }
                }}
              >Copy</button>
            </div>
          </li>
        ))}
        {setlists.length === 0 && <li className="p-4 text-sm text-gray-600">No setlists yet.</li>}
      </ul>
    </div>
  );
}
