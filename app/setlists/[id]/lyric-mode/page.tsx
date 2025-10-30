'use client';
import { useParams, useRouter } from 'next/navigation';
import React, { useEffect, useMemo, useState } from 'react';

// ...existing code...
// LiveClock component: shows current time in green, updates every second
function LiveClock({ colourFlip }: { colourFlip: boolean }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  const timeStr = now.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  return (
    <span
      className={
        colourFlip
          ? 'text-green-700 text-xs mt-1 font-mono drop-shadow'
          : 'text-green-400 text-xs mt-1 font-mono drop-shadow'
      }
      style={{ letterSpacing: '0.05em' }}
    >
      {timeStr}
    </span>
  );
}

import LyricTeleprompter from '@/components/LyricTeleprompter';

type Item = {
  id: string;
  type: 'song' | 'break' | 'note' | 'section';
  order: number;
  title?: string;
  artist?: string;
  durationSec?: number;
  songId?: string;
  note?: string;
};
type Setlist = {
  id: string;
  name: string;
  items: Item[];
  projectId: string;
  showNotesAfterLyrics?: boolean;
  showColourFlip?: boolean;
  showWhatWhere?: boolean;
  showLiveClock?: boolean;
  date?: string;
  venue?: string;
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  // Allow page scroll in lyric mode so controls are accessible

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

  if (!mounted) return null;
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

  // Show what/where page before first song if enabled
  const showWhatWhere = !!setlist?.showWhatWhere && stepIdx === 0 && step.kind === 'song';
  // Show what/where during breaks (endOfSet)
  const showWhatWhereBreak = !!setlist?.showWhatWhere && step.kind === 'endOfSet';

  return (
    <div
      className={`flex h-screen flex-col overflow-x-hidden max-w-screen w-full mx-auto ${setlist?.showColourFlip ? 'bg-white text-black' : 'bg-black text-white'}`}
    >
      {/* Lyric mode navigation bar only (no global header) */}
      <div
        className="relative flex flex-wrap items-center gap-2 px-2 py-1 text-sm bg-black/80 z-10 max-w-full w-full overflow-x-auto mx-auto"
        style={{ boxSizing: 'border-box', marginBottom: '-0.25rem' }}
      >
        <div className="flex items-center gap-2">
          <button
            className="rounded border px-2 py-1 text-xs hover:bg-neutral-800 transition"
            onClick={() => router.push(`/setlists/${id}`)}
            aria-label="Leave lyric mode"
          >
            Leave lyric mode
          </button>
        </div>
        <div className="flex items-center gap-2 ml-auto flex-wrap min-w-0">
          <button
            className="rounded border px-2 py-1 font-semibold disabled:opacity-50"
            onClick={() => setStepIdx((i) => Math.max(0, i - 1))}
            disabled={atFirst}
            aria-label="Previous song"
          >
            ◀ Prev
          </button>
          <div className="text-xs text-neutral-400 whitespace-nowrap">
            Song {stepIdx + 1} / {steps.length}
          </div>
          <button
            className="rounded border px-2 py-1 font-semibold disabled:opacity-50"
            onClick={() => setStepIdx((i) => Math.min(steps.length - 1, i + 1))}
            disabled={atLast}
            aria-label="Next song"
          >
            Next ▶
          </button>
        </div>
        {/* Centered song title, only for song steps */}
        {step.kind === 'song' && (
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center max-w-[60vw] text-center pointer-events-none select-none">
            <span className="text-base font-semibold text-white" title={step.song.title}>
              {step.song.title}
            </span>
            {setlist.showLiveClock && <LiveClock colourFlip={!!setlist.showColourFlip} />}
          </div>
        )}
      </div>

      {/* LyricTeleprompter or End of Set message */}
      <div className="flex-1 flex min-h-0">
        {showWhatWhere ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="px-8 text-center">
              <div className="text-2xl font-semibold mb-2">{setlist.venue || 'Venue'}</div>
              <div className="text-lg text-neutral-500 mb-4">{setlist.date || 'Date'}</div>
              <div className="mt-6 text-neutral-400 text-base">Press Next to start lyrics</div>
            </div>
          </div>
        ) : step.kind === 'song' ? (
          <LyricTeleprompter
            key={step.song.id}
            isrc={step.song.isrc}
            titleHint={step.song.title}
            artistHint={step.song.artist}
            durationMs={(step.song.durationSec ?? 180) * 1000}
            autoStart={false}
            enableHotkeys={true}
            colourFlip={!!setlist?.showColourFlip}
            appendedNote={(() => {
              if (!setlist || !setlist.showNotesAfterLyrics) return null;
              const items = [...setlist.items].sort((a, b) => a.order - b.order);
              const songIdx = items.findIndex(
                (item) => item.type === 'song' && item.songId === step.song.id,
              );
              if (songIdx === -1) return null;
              const next = items[songIdx + 1];
              if (next && next.type === 'note' && next.note) return next.note;
              return null;
            })()}
          />
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <div className="px-8 text-center">
              {showWhatWhereBreak && (
                <>
                  <div className="text-2xl font-semibold mb-2">{setlist.venue || 'Venue'}</div>
                  <div className="text-lg text-neutral-500 mb-4">{setlist.date || 'Date'}</div>
                </>
              )}
              <div className="text-[5vh] font-semibold">End of Set {step.setIndex}</div>
              <div className="mt-4 text-[2.5vh] text-neutral-400">Press Next to continue</div>
            </div>
          </div>
        )}
      </div>
      {/* Flashing red live/recording indicator */}
    </div>
  );
}
