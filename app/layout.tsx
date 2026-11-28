import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: { default: 'TourFlow', template: '%s — TourFlow' },
  description: 'Turizm agentlikləri üçün sürətli, peşəkar tur təklifi yaratma sistemi',
  icons: { icon: '/favicon.svg' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="az" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
