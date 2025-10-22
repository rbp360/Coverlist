/* eslint-disable @next/next/no-img-element */
import './globals.css';
import BackButton from '@/components/BackButton';
import { getCurrentUser } from '@/lib/auth';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SongDeck',
  description: 'Every song. Every set. Every rehearsal. One place.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const user = getCurrentUser();
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-neutral-950 text-neutral-100 antialiased">
        <header className="border-b border-neutral-800 bg-neutral-900/80 backdrop-blur">
          <div className="mx-auto max-w-5xl px-4 py-4 flex items-center justify-between">
            <a href="/" className="logo-font text-2xl tracking-tight">
              <span className="text-brand-500">Song</span>Deck
            </a>
            <nav className="text-sm text-neutral-300 space-x-4 flex items-center gap-3">
              <BackButton fallback="/projects" />
              <a href="/projects" className="hover:text-white">
                Projects
              </a>
              <a href="/repertoire" className="hover:text-white">
                Repertoire
              </a>
              <a href="/profile" className="flex items-center gap-2 hover:text-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {user?.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt="profile"
                    className="h-7 w-7 rounded-full border border-neutral-700 object-cover"
                  />
                ) : (
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-neutral-700 text-xs text-neutral-500"></span>
                )}
                <span>Profile</span>
              </a>
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
