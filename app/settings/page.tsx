'use client';
import { useEffect, useState } from 'react';

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [gap, setGap] = useState(30);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const s = await res.json();
        setGap(s.defaultSongGapSec ?? 30);
      }
      setLoading(false);
    })();
  }, []);

  async function save() {
    setSaving(true);
    setMsg(null);
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ defaultSongGapSec: gap }),
    });
    setSaving(false);
    if (res.ok) setMsg('Saved'); else setMsg('Save failed');
  }

  if (loading) return <div>Loading…</div>;

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Settings</h2>
      <div className="rounded border bg-white p-3">
        <div className="mb-1 font-medium">Default gap after each song</div>
        <div className="text-sm text-neutral-600 mb-2">Applies when enabled on a setlist. Range 20-120 seconds.</div>
        <div className="flex items-center gap-3">
          <input type="range" min={20} max={120} value={gap} onChange={(e)=>setGap(parseInt(e.target.value)||20)} />
          <div className="w-16 text-right text-sm">{gap}s</div>
          <button className="rounded bg-black px-3 py-2 text-white" disabled={saving} onClick={save}>Save</button>
        </div>
        {msg && <div className="mt-2 text-sm text-neutral-700">{msg}</div>}
      </div>
    </div>
  );
}
