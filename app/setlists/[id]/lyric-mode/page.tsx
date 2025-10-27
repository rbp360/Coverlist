'use client';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import LyricTeleprompter from '@/components/LyricTeleprompter';

type Item = {
  id: string;
  type: 'song' | 'break' | 'note' | 'section';
  order: number;
  title?: string;
  artist?: string;
  durationSec?: number;
  songId?: string;
};
type Setlist = {
  id: string;
  name: string;
  items: Item[];
  projectId: string;
};
type ProjectSong = {
  id: string;
  title: string;
  artist: string;
  durationSec?: number;
  isrc?: string;
};

type Step =
  | { kind: 'song'; setIndex: number; setTitle?: string; song: ProjectSong }
  | { kind: 'endOfSet'; setIndex: number; setTitle?: string };

export default function LyricModePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [setlist, setSetlist] = useState<Setlist | null>(null);
  const [songs, setSongs] = useState<ProjectSong[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stepIdx, setStepIdx] = useState(0);
  // Prevent page scroll while in lyric mode
  useEffect(() => {
    const prevDoc = document.documentElement.style.overflow;
    const prevBody = document.body.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = prevDoc;
      document.body.style.overflow = prevBody;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const res = await fetch(`/api/setlists/${id}`);
        if (!res.ok) {
          setError(res.status === 401 ? 'Please sign in.' : 'Failed to load setlist');
          setLoading(false);
          return;
        }
        const s = (await res.json()) as Setlist;
        if (cancelled) return;
        setSetlist(s);
        const ps = await fetch(`/api/projects/${s.projectId}/songs`);
        if (ps.ok) {
          const data = await ps.json();
          setSongs((data.songs || []) as ProjectSong[]);
        } else {
          setError('Failed to load project songs');
        }
      } catch {
        setError('Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const steps: Step[] = useMemo(() => {
    if (!setlist) return [];
    const byId = new Map(songs.map((s) => [s.id, s] as const));
    const items = [...(setlist.items || [])].sort((a, b) => a.order - b.order);

    const result: Step[] = [];
    let currentSet = 0; // 0 means pre-section block
    let pendingSongs: ProjectSong[] = [];
    const flushBlock = () => {
      if (pendingSongs.length === 0) return;
      const setIndex = Math.max(1, currentSet === 0 ? 1 : currentSet);
      for (const song of pendingSongs) {
        result.push({ kind: 'song', setIndex, setTitle: undefined, song });
      }
      result.push({ kind: 'endOfSet', setIndex, setTitle: undefined });
      pendingSongs = [];
    };

    for (const it of items) {
      if (it.type === 'section') {
        // Close the previous block and start a new set
        flushBlock();
        currentSet += 1;
        continue;
      }
      if (it.type !== 'song') continue;
      const song = it.songId ? byId.get(it.songId) : undefined;
      if (song) pendingSongs.push(song);
    }
    // Flush trailing
    flushBlock();

    // Edge case: no sections and no songs — nothing to show
    return result;
  }, [setlist, songs]);

  useEffect(() => {
    // Reset to first step when steps change
    setStepIdx(0);
  }, [steps.length]);

  // Page-level hotkeys for prev/next song (placed after steps to have length)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || target?.isContentEditable) return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setStepIdx((i) => Math.min(steps.length - 1, i + 1));
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp' || e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setStepIdx((i) => Math.max(0, i - 1));
      } else if (e.key === 'Escape') {
        e.preventDefault();
        router.push(`/setlists/${id}`);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [id, router, steps.length]);

  if (loading) return <div className="h-screen w-screen bg-black p-6 text-white">Loading…</div>;
  if (error) return <div className="h-screen w-screen bg-black p-6 text-red-400">{error}</div>;
  if (!setlist) return null;
  if (steps.length === 0)
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-black text-white">
        <div className="text-center">
          <div className="text-2xl font-semibold">Lyric mode</div>
          <div className="mt-2 text-neutral-400">No songs found in this setlist.</div>
          <div className="mt-6">
            <a className="rounded border px-4 py-2" href={`/setlists/${id}`}>
              Back to setlist
            </a>
          </div>
        </div>
      </div>
    );

  const step = steps[Math.max(0, Math.min(stepIdx, steps.length - 1))];
  const atFirst = stepIdx <= 0;
  const atLast = stepIdx >= steps.length - 1;

  return (
    <div className="flex h-screen w-screen flex-col bg-black text-white">
      <div className="flex items-center gap-2 p-2 text-sm">
        <a className="rounded border px-2 py-1" href={`/setlists/${id}`}>
          Back
        </a>
        <div className="ml-2 text-neutral-400">Lyric mode</div>
        <div className="ml-auto flex items-center gap-2">
          <button
            className="rounded border px-2 py-1 disabled:opacity-50"
            onClick={() => setStepIdx((i) => Math.max(0, i - 1))}
            disabled={atFirst}
          >
            Prev song
          </button>
          <div className="text-xs text-neutral-400">
            Step {stepIdx + 1} / {steps.length}
          </div>
          <button
            className="rounded border px-2 py-1 disabled:opacity-50"
            onClick={() => setStepIdx((i) => Math.min(steps.length - 1, i + 1))}
            disabled={atLast}
          >
            Next song
          </button>
        </div>
      </div>

      <div className="relative flex-1">
        {step.kind === 'song' ? (
          <LyricTeleprompter
            key={step.song.id}
            isrc={step.song.isrc}
            titleHint={step.song.title}
            artistHint={step.song.artist}
            durationMs={(step.song.durationSec ?? 180) * 1000}
            className="absolute inset-0"
            // Do not auto-start to give vocalist control
            autoStart={false}
            enableHotkeys={true}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="px-8 text-center">
              <div className="text-[5vh] font-semibold">End of Set {step.setIndex}</div>
              <div className="mt-4 text-[2.5vh] text-neutral-400">Press Next to continue</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
