import type { Metadata, Viewport } from 'next';
import { Archivo, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import SmoothScroll from '@/components/SmoothScroll';

const archivo = Archivo({ subsets: ['latin'], axes: ['wdth'], variable: '--font-archivo', display: 'swap' });
const mono = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '500', '700'], variable: '--font-mono', display: 'swap' });

export const metadata: Metadata = {
  title: 'Krishna Roadlines — Heavy Transport, Pan-India',
  description: 'Krishna Roadlines runs flatbed, platform and container haulage from Gujarat to every state — weighed, loaded, secured and delivered.',
  icons: { icon: '/assets/logo-mark-light.png' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0e1116',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${archivo.variable} ${mono.variable}`}>
      <body>
        <SmoothScroll />
        {children}
      </body>
    </html>
  );
}
