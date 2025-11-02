'use client';

import { useRef, useState } from 'react';

export default function LandingVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setMuted(videoRef.current.muted);
    }
  };

  return (
    <div className="mt-10 flex flex-col items-center justify-center">
      <div className="relative w-full flex justify-center">
        <video
          ref={videoRef}
          src="/video/SD%20vid.mp4"
          autoPlay
          loop
          playsInline
          muted={muted}
          className="w-full max-w-xl md:max-w-lg h-auto object-cover rounded-lg shadow-lg border-4 border-green-700"
          style={{ maxWidth: '65%' }}
          poster="/images/hero-band-bg.jpg"
        />
        <button
          type="button"
          aria-label="Toggle video sound"
          className="absolute bottom-4 right-4 bg-black/60 hover:bg-black/80 text-white rounded-full p-2 shadow-lg focus:outline-none focus:ring-2 focus:ring-green-400 z-10"
          onClick={toggleMute}
        >
          {muted ? (
            <svg
              width="24"
              height="24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="feather feather-volume-x"
            >
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
              <line x1="23" y1="9" x2="17" y2="15"></line>
              <line x1="17" y1="9" x2="23" y2="15"></line>
            </svg>
          ) : (
            <svg
              width="24"
              height="24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="feather feather-volume-2"
            >
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
              <path d="M19 12c0-1.77-1.02-3.29-2.5-4.03"></path>
              <path d="M19 12c0 1.77-1.02 3.29-2.5 4.03"></path>
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
