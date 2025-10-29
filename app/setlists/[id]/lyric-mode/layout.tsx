import '@/app/globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Lyric Mode',
  description: 'Performance lyric mode for setlists',
};

export default function LyricModeLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-black text-white antialiased">{children}</body>
    </html>
  );
}
