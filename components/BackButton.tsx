'use client';
import { useRouter } from 'next/navigation';
import React from 'react';

export default function BackButton({ fallback = '/' }: { fallback?: string }) {
  const router = useRouter();
  function goBack() {
    try {
      if (typeof window !== 'undefined' && window.history.length > 1) router.back();
      else router.push(fallback);
    } catch {
      router.push(fallback);
    }
  }
  return (
    <button
      type="button"
      onClick={goBack}
      className="rounded border border-neutral-700 px-3 py-1 text-sm text-neutral-200 hover:bg-neutral-800"
      title="Go back"
    >
      ← Back
    </button>
  );
}
