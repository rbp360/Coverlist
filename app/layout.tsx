/* eslint-disable @next/next/no-img-element */
import './globals.css';

import Link from 'next/link';

import BackButton from '@/components/BackButton';

import UserMenu from '../components/UserMenu';

import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'SongDeck',
  description: 'Every song. Every set. Every rehearsal. One place.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-black text-white antialiased">
        <header className="border-b border-neutral-800 bg-neutral-900/80 backdrop-blur">
          <div className="mx-auto max-w-5xl px-4 py-4 flex items-center justify-between">
            <Link href="/" className="logo-font text-2xl tracking-tight">
              <span className="text-brand-500">Song</span>Deck
            </Link>
            <nav className="text-sm text-neutral-300 space-x-4 flex items-center gap-3">
              <BackButton fallback="/projects" />
              <Link href="/projects" className="hover:text-white">
                Projects
              </Link>
              <Link href="/repertoire" className="hover:text-white">
                My Repertoire
              </Link>
              <Link href="/songs" className="hover:text-white">
                Add Songs
              </Link>
              <UserMenu />
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
        <footer className="border-t border-neutral-800 bg-neutral-900">
          <div className="mx-auto max-w-5xl px-4 py-4 text-sm text-neutral-400">
            © {new Date().getFullYear()} SongDeck
          </div>
        </footer>
      </body>
    </html>
  );
}
