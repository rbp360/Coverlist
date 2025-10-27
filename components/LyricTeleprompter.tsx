'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { fetchSyncedLyricsLRCLib, findActiveIndex, LyricLine } from '@/lib/lyrics';

import styles from './LyricTeleprompter.module.css';

type ExternalClock = {
  getPositionMs: () => number;
  playing: boolean;
};

export type LyricTeleprompterProps = {
  spotifyId?: string; // for future integration; prefer isrc when available
  isrc?: string;
  durationMs: number;
  /** Optional unsynced lyrics to show if synced not found */
  fallbackPlainLyrics?: string;
  /** Auto-start on first render */
  autoStart?: boolean;
  /** Use an external audio clock instead of the internal timer */
  externalClock?: ExternalClock;
  /** Optional artist/title/album hint for LRCLib if ISRC missing */
  titleHint?: string;
  artistHint?: string;
  albumHint?: string;
  /** Enable built-in hotkeys (space=start/pause, r=restart, ]/ArrowDown=next line) */
  enableHotkeys?: boolean;
  /** Prevent manual user scroll interfering with auto-scroll */
  lockUserScroll?: boolean;
  className?: string;
  style?: React.CSSProperties;
};

type PlayState = 'idle' | 'playing' | 'paused' | 'ended';

export default function LyricTeleprompter(props: LyricTeleprompterProps) {
  const {
    isrc,
    durationMs,
    fallbackPlainLyrics,
    autoStart,
    externalClock,
    titleHint,
    artistHint,
    albumHint,
    enableHotkeys = true,
    lockUserScroll = true,
    className,
    style,
  } = props;

  const [lines, setLines] = useState<LyricLine[]>([]);
  const [plain, setPlain] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  const [state, setState] = useState<PlayState>('idle');
  const [startAt, setStartAt] = useState<number | null>(null); // performance.now()
  const [offsetMs, setOffsetMs] = useState<number>(0); // accumulated paused offset
  const [currentMs, setCurrentMs] = useState<number>(0);

  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const autoScrollFlag = useRef(false);
  const lastTargetRef = useRef(0);

  // Fetch lyrics on mount / prop changes
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setError(null);
      setLines([]);
      setPlain(undefined);
      try {
        const res = await fetchSyncedLyricsLRCLib({
          isrc,
          title: titleHint,
          artist: artistHint,
          album: albumHint,
          durationMs,
        });
        if (cancelled) return;
        setLines(res.lines);
        setPlain(res.plain || fallbackPlainLyrics);
        if (!res.lines.length && !res.plain && !fallbackPlainLyrics) {
          setError('No lyrics found.');
        }
      } catch (e) {
        if (!cancelled) setError('Failed to load lyrics.');
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [isrc, titleHint, artistHint, albumHint, durationMs, fallbackPlainLyrics]);

  // Internal clock loop (if external clock not provided)
  useEffect(() => {
    if (externalClock) return; // external clock drives currentMs via another effect
    let raf = 0;
    const tick = () => {
      if (state === 'playing' && startAt != null) {
        const elapsed = performance.now() - startAt; // ms
        const t = Math.min(durationMs, offsetMs + elapsed);
        setCurrentMs(t);
        if (t >= durationMs) {
          setState('ended');
        } else {
          raf = requestAnimationFrame(tick);
        }
      }
    };
    if (state === 'playing') {
      raf = requestAnimationFrame(tick);
    }
    return () => cancelAnimationFrame(raf);
  }, [state, startAt, offsetMs, durationMs, externalClock]);

  // External clock integration: when provided, mirror it to currentMs/state
  useEffect(() => {
    if (!externalClock) return;
    let raf = 0;
    const tick = () => {
      const playing = externalClock.playing;
      const t = Math.min(durationMs, externalClock.getPositionMs());
      setCurrentMs(t);
      setState(t >= durationMs ? 'ended' : playing ? 'playing' : 'paused');
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [externalClock, durationMs]);

  const activeIndex = useMemo(() => findActiveIndex(lines, currentMs), [lines, currentMs]);

  // Smooth scroll: keep ~30% of content above current line, using viewport scrollTop
  useEffect(() => {
    const scroller = scrollerRef.current;
    const viewport = viewportRef.current;
    if (!scroller || !viewport) return;
    if (!lines.length) return;

    // Find the current and next line elements
    const lineNodes = Array.from(scroller.querySelectorAll(`[data-line-index]`)) as HTMLElement[];
    const currentEl = lineNodes[activeIndex];
    if (!currentEl) return;

    const viewportHeight = viewport.clientHeight;
    const anchor = Math.round(viewportHeight * 0.3);
    const targetY = Math.max(0, currentEl.offsetTop - anchor);
    const maxScroll = Math.max(0, scroller.scrollHeight - viewportHeight);
    const clampedY = Math.min(targetY, maxScroll);

    // Programmatic scroll of the viewport (hide scrollbar via CSS)
    try {
      autoScrollFlag.current = true;
      lastTargetRef.current = clampedY;
      viewport.scrollTo({ top: clampedY, behavior: 'smooth' });
    } catch {
      autoScrollFlag.current = true;
      lastTargetRef.current = clampedY;
      viewport.scrollTop = clampedY;
    }
    // Clear auto flag shortly after the smooth scroll likely finishes
    const t = setTimeout(() => {
      autoScrollFlag.current = false;
    }, 350);
    return () => clearTimeout(t);
  }, [activeIndex, lines.length]);

  // Lock user scroll to avoid interference; still allow programmatic scroll
  useEffect(() => {
    if (!lockUserScroll) return;
    const viewport = viewportRef.current;
    if (!viewport) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
    };
    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
    };
    const onScroll = () => {
      if (autoScrollFlag.current) return; // ignore programmatic
      // snap back to last target
      viewport.scrollTop = lastTargetRef.current;
    };
    viewport.addEventListener('wheel', onWheel, { passive: false });
    viewport.addEventListener('touchmove', onTouchMove, { passive: false });
    viewport.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      viewport.removeEventListener('wheel', onWheel as any);
      viewport.removeEventListener('touchmove', onTouchMove as any);
      viewport.removeEventListener('scroll', onScroll as any);
    };
  }, [lockUserScroll]);

  const progressPct = Math.max(0, Math.min(100, (currentMs / Math.max(1, durationMs)) * 100));

  // Controls
  const start = useCallback(() => {
    if (externalClock) return; // external drives playback
    setState('playing');
    setStartAt(performance.now());
    setOffsetMs(0);
    setCurrentMs(0);
  }, [externalClock]);

  const pause = useCallback(() => {
    if (externalClock) return;
    if (state !== 'playing') return;
    setState('paused');
    setOffsetMs(currentMs);
    setStartAt(null);
  }, [state, currentMs, externalClock]);

  const resume = useCallback(() => {
    if (externalClock) return;
    if (state !== 'paused') return;
    setState('playing');
    setStartAt(performance.now());
  }, [state, externalClock]);

  const restart = useCallback(() => {
    if (externalClock) return;
    setState('idle');
    setStartAt(null);
    setOffsetMs(0);
    setCurrentMs(0);
  }, [externalClock]);

  const next = useCallback(() => {
    if (!lines.length) return;
    const idx = Math.min(lines.length - 1, activeIndex + 1);
    const t = lines[idx]?.time ?? currentMs;
    if (externalClock) {
      // With an external clock, we'd call into the player to seek; leave as no-op
      return;
    }
    // Seek our internal clock
    setCurrentMs(t);
    setOffsetMs(t);
    setStartAt(state === 'playing' ? performance.now() : null);
  }, [lines, activeIndex, currentMs, state, externalClock]);

  // Auto-start when requested
  useEffect(() => {
    if (autoStart && state === 'idle' && !externalClock && lines.length) {
      start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart, lines.length, externalClock, state]);

  // Hotkeys: space=start/pause, r=restart, ] or ArrowDown=next line
  useEffect(() => {
    if (!enableHotkeys) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || target?.isContentEditable) return;
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        if (state === 'idle') start();
        else if (state === 'playing') pause();
        else if (state === 'paused') resume();
        return;
      }
      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        restart();
        return;
      }
      if (e.key === ']' || e.key === '.' || e.key === 'ArrowDown') {
        e.preventDefault();
        next();
        return;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enableHotkeys, state, start, pause, resume, restart, next]);

  const showPlainFallback = !lines.length && (plain || fallbackPlainLyrics);

  return (
    <div className={[styles.wrapper, className].filter(Boolean).join(' ')} style={style}>
      <div className={[styles.viewport, styles.faders].join(' ')} ref={viewportRef}>
        {showPlainFallback ? (
          <div className={styles.plainWrapper}>{plain || fallbackPlainLyrics}</div>
        ) : (
          <div ref={scrollerRef} className={styles.scroller}>
            {lines.map((line, i) => {
              const isActive = i === activeIndex;
              return (
                <div
                  key={`${line.time}-${i}`}
                  data-line-index={i}
                  className={[styles.line, isActive ? styles.active : ''].join(' ')}
                >
                  {line.text || '\u00A0'}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className={styles.controls}>
        {!externalClock && (
          <>
            {state === 'idle' && (
              <button onClick={start} className={styles.goButton} title="Space to start">
                Go
              </button>
            )}
            {state === 'playing' && <button onClick={pause}>Pause</button>}
            {state === 'paused' && <button onClick={resume}>Resume</button>}
            {(state === 'paused' || state === 'ended') && (
              <button onClick={restart}>Restart</button>
            )}
            <button onClick={next}>Next</button>
          </>
        )}
        {externalClock && <span>External clock: {state}</span>}
        <div className={styles.progressBar} aria-label="Progress">
          <div className={styles.progressInner} style={{ width: `${progressPct}%` }} />
        </div>
      </div>

      {error && (
        <div className={styles.controls}>
          <span className={styles.error}>{error}</span>
        </div>
      )}
    </div>
  );
}
