"use client";
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function EditEntryPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id as string;
  const [location, setLocation] = useState('');
  const [item, setItem] = useState('');
  const [price, setPrice] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/entries/${id}`).then(async (r) => {
      if (r.status === 401) return router.push('/login');
      if (r.status === 404) return router.push('/entries');
      const e = await r.json();
      setLocation(e.location || '');
      setItem(e.item || '');
      setPrice(String(e.price ?? ''));
      setNotes(e.notes || '');
    });
  }, [id, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch(`/api/entries/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ location, item, price: Number(price || 0), notes: notes || undefined })
    });
    if (!res.ok) return setError('Could not update entry');
    router.push('/entries');
  }

  return (
    <div className="mx-auto max-w-md">
      <h2 className="mb-4 text-2xl font-semibold">Edit Entry</h2>
      <form onSubmit={onSubmit} className="space-y-3">
        <input className="w-full rounded border px-3 py-2" placeholder="Location" value={location} onChange={(e) => setLocation(e.target.value)} />
        <input className="w-full rounded border px-3 py-2" placeholder="Item" value={item} onChange={(e) => setItem(e.target.value)} />
        <input className="w-full rounded border px-3 py-2" placeholder="Price" type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} />
        <textarea className="w-full rounded border px-3 py-2" placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-2">
          <button className="rounded bg-black px-3 py-2 text-white">Save</button>
          <a href="/entries" className="rounded border px-3 py-2">Cancel</a>
        </div>
      </form>
    </div>
  );
}
