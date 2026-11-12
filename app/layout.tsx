import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import SoundLayer from '@/components/SoundLayer';
import './globals.css';

export const metadata: Metadata = {
  title: 'Karaoke Room — TV & HP',
  description:
    'Aplikasi karaoke streaming: TV sebagai pemutar, HP siapa saja sebagai operator playlist lewat QR code.',
};

export const viewport: Viewport = {
  themeColor: '#07060f',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id">
      <body>
        {children}
        <SoundLayer />
      </body>
    </html>
  );
}
