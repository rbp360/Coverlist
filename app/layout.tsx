import './globals.css';
import BackButton from '@/components/BackButton';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SongDeck',
  description: 'Every song. Every set. Every rehearsal. One place.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-neutral-950 text-neutral-100 antialiased">
        <header className="border-b border-neutral-800 bg-neutral-900/80 backdrop-blur">
          <div className="mx-auto max-w-5xl px-4 py-4 flex items-center justify-between">
            <a href="/" className="text-xl font-semibold tracking-tight">
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
              <a href="/profile" className="hover:text-white">
                Profile
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
