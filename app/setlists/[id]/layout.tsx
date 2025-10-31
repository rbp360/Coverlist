import { usePathname } from 'next/navigation';

export default function SetlistLayout({ children }: { children: React.ReactNode }) {
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
  // If in lyric mode, wrap in a fullscreen div, but do NOT render <html>/<body>
  if (pathname.endsWith('/lyric-mode')) {
    return (
      <div className="min-h-screen bg-black text-white antialiased w-full h-full">{children}</div>
    );
  }
  // Otherwise, render children as normal (root layout will provide app shell)
  return <>{children}</>;
}
