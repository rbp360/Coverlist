'use client';
import { useEffect, useRef, useState } from 'react';

// Simple animated dashboard mockup for SongDeck landing page
export default function AnimatedDashboardDemo() {
  const [step, setStep] = useState(0);
  const steps = [
    'Add song to setlist',
    'Move song in setlist',
    'Start Lyric Mode',
    'Load Spotify Playlist',
    'Lyric Scroller Active',
  ];
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setStep((s) => (s + 1) % steps.length);
    }, 2000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [steps.length]);

  return (
    <div className="w-[340px] h-[220px] bg-gray-900/80 rounded-2xl shadow-2xl border-2 border-green-400 flex flex-col items-center justify-center relative overflow-hidden">
      {/* Setlist mockup */}
      <div className="absolute left-4 top-4 w-40 h-32 bg-gray-800 rounded-lg shadow-inner p-2">
        <div className="text-xs text-green-300 font-bold mb-1">Setlist</div>
        <div
          className={`transition-all duration-700 ${step === 0 ? 'bg-green-500/80' : 'bg-gray-700'} rounded px-2 py-1 mb-1 text-white`}
        >
          Don’t Stop Believin’
        </div>
        <div
          className={`transition-all duration-700 ${step === 1 ? 'bg-green-500/80' : 'bg-gray-700'} rounded px-2 py-1 mb-1 text-white`}
        >
          Superstition
        </div>
        <div className="bg-gray-700 rounded px-2 py-1 text-white">Valerie</div>
      </div>
      {/* Lyric mode mockup */}
      <div className="absolute right-4 top-4 w-36 h-20 bg-gray-800 rounded-lg shadow-inner p-2 flex flex-col items-center">
        <div className="text-xs text-blue-300 font-bold mb-1">Lyric Mode</div>
        <div
          className={`transition-all duration-700 w-full text-center ${step === 2 || step === 4 ? 'text-green-300' : 'text-gray-400'} font-mono text-xs`}
        >
          {step === 4 ? '🎤 "Just a small town girl..."' : '—'}
        </div>
      </div>
      {/* Playlist mockup */}
      <div className="absolute left-1/2 -translate-x-1/2 bottom-4 w-60 h-10 bg-gray-800 rounded-lg shadow-inner flex items-center px-3">
        <div className="text-xs text-pink-300 font-bold mr-2">Spotify Playlist</div>
        <div
          className={`transition-all duration-700 ${step === 3 ? 'text-green-400' : 'text-gray-400'} font-mono`}
        >
          {step === 3 ? 'Loaded: Rehearsal Mix' : '—'}
        </div>
      </div>
      {/* Step label */}
      <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 bg-black/80 px-4 py-2 rounded-full text-green-200 font-semibold text-base shadow-lg border border-green-700 animate-pulse">
        {steps[step]}
      </div>
    </div>
  );
}
