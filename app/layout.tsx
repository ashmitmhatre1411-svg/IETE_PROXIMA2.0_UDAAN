import type { Metadata, Viewport } from 'next';
import '@fontsource-variable/unbounded';
import '@fontsource-variable/instrument-sans';
import './globals.css';

export const metadata: Metadata = {
  title: 'PROXIMA 2.0 — UDAAN UNLOCKED · Live Leaderboard',
  description: 'Live treasure hunt leaderboard for PROXIMA 2.0 — UDAAN UNLOCKED, organised by IETE SPIT.',
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: '#090719',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
