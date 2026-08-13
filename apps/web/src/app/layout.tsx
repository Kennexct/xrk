import type { Metadata, Viewport } from 'next';
// Vercel deployment trigger update v2
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: { default: 'SYT Platform', template: '%s — SYT Platform' },
  description: 'Portal resmi Sunflower Youth Team: video, musik, berita, dan kalender kegiatan.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
