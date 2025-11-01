import type { ReactNode } from 'react';

export const metadata = {
  title: 'Lyric Mode',
};

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html>
      <body>{children}</body>
    </html>
  );
}
