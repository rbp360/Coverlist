import '@/app/globals.css';
import { usePathname } from 'next/navigation';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Setlist',
  description: 'Setlist and lyric mode',
};

export default function SetlistLayout({ children }: { children: React.ReactNode }) {
  // Only run this hook on the client
  if (typeof window !== 'undefined') {
    const pathname = window.location.pathname;
    if (pathname.endsWith('/lyric-mode')) {
      // Fullscreen lyric mode, no header/footer
      return (
        <html lang="en" className="dark">
          <body className="min-h-screen bg-black text-white antialiased">{children}</body>
        </html>
      );
    }
  }
  // Fallback: render children normally (header/footer will come from root layout)
  return children;
}
