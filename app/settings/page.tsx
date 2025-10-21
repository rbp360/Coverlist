'use client';
import { useEffect, useState } from 'react';

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [gap, setGap] = useState(30);
  const [mode, setMode] = useState<'none' | 'stub'>('stub');
  const [enrichOnImport, setEnrichOnImport] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const s = await res.json();
        setGap(s.defaultSongGapSec ?? 30);
        setMode(s.enrichmentMode ?? 'stub');
        setEnrichOnImport(!!s.enrichOnImport);
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
      body: JSON.stringify({ defaultSongGapSec: gap, enrichmentMode: mode, enrichOnImport }),
    });
    setSaving(false);
    if (res.ok) setMsg('Saved');
    else setMsg('Save failed');
  }

  if (loading) return <div>Loading…</div>;

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Settings</h2>
      <div className="rounded border bg-white p-3">
        <div className="mb-1 font-medium">Default gap after each song</div>
        <div className="text-sm text-neutral-600 mb-2">
          Applies when enabled on a setlist. Range 20-120 seconds.
        </div>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={20}
            max={120}
            value={gap}
            onChange={(e) => setGap(parseInt(e.target.value) || 20)}
          />
          <div className="w-16 text-right text-sm">{gap}s</div>
          <button
            className="rounded bg-black px-3 py-2 text-white"
            disabled={saving}
            onClick={save}
          >
            Save
          </button>
        </div>
        {msg && <div className="mt-2 text-sm text-neutral-700">{msg}</div>}
      </div>

      <div className="rounded border bg-white p-3">
        <div className="mb-1 font-medium">Key/Tempo Enrichment</div>
        <div className="text-sm text-neutral-600 mb-2">
          Choose how enrichment works for key and tempo.
        </div>
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-2 text-sm">
            <span className="w-32 text-neutral-500">Mode</span>
            <select
              className="rounded border px-2 py-1"
              value={mode}
              onChange={(e) => setMode(e.target.value as any)}
            >
              <option value="none">None</option>
              <option value="stub">Stub (deterministic)</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <span className="w-32 text-neutral-500">On import</span>
            <input
              type="checkbox"
              checked={enrichOnImport}
              onChange={(e) => setEnrichOnImport(e.target.checked)}
            />
            <span className="text-xs text-neutral-500">
              Automatically enrich key/tempo when importing songs
            </span>
          </label>
          <div>
            <button
              className="rounded bg-black px-3 py-2 text-white"
              disabled={saving}
              onClick={save}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
