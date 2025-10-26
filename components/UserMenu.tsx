'use client';
/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import SignOutButton from './SignOutButton';

export default function UserMenu() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [user, setUser] = useState<{ name?: string; avatarUrl?: string } | null>(null);
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Determine auth state quickly without flicker
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch('/api/profile', { cache: 'no-store' });
        if (!mounted) return;
        if (!res.ok) {
          setAuthed(false);
          setUser(null);
          return;
        }
        const data = (await res.json()) as {
          user?: { name?: string; avatarUrl?: string };
        };
        setAuthed(true);
        setUser(data.user ?? null);
      } catch {
        if (!mounted) return;
        setAuthed(false);
        setUser(null);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Close on outside click or Escape
  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (authed === null || authed === false) return null; // avoid flicker and hide when not authed

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Open user menu"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-full border border-neutral-700 px-2 py-1 text-sm text-neutral-300 hover:bg-neutral-800"
      >
        {user?.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt=""
            className="h-7 w-7 rounded-full object-cover border border-neutral-700"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-neutral-700 text-xs text-neutral-500">
            {user?.name?.[0] || '👤'}
          </span>
        )}
        <span className="hidden sm:inline">Profile</span>
      </button>

      {open && (
        <div
          role="menu"
          aria-label="User menu"
          className="absolute right-0 z-20 mt-2 w-56 overflow-hidden rounded-md border border-neutral-800 bg-neutral-900/95 shadow-xl backdrop-blur"
        >
          <div className="py-1 text-sm">
            <>
              <Link
                role="menuitem"
                href="/settings"
                className="block px-3 py-2 text-neutral-200 hover:bg-neutral-800 hover:text-white"
                onClick={() => setOpen(false)}
              >
                Settings
              </Link>
              <div className="my-1 border-t border-neutral-800" />
              <div className="px-2 pb-2 pt-1">
                <SignOutButton className="w-full rounded px-3 py-2 text-left text-red-300 hover:bg-red-500/10 hover:text-red-200" />
              </div>
            </>
          </div>
        </div>
      )}
    </div>
  );
}
