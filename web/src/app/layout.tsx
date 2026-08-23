import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'Lexis — Kelime Öğrenme Platformu',
  description: 'İngilizce-Türkçe kelime öğrenme, spaced repetition ve quiz ile.',
};

// İlk boyamadan (paint) önce çalışan, engelleyici (blocking) küçük script:
// localStorage'daki tema tercihini (ya da sistem tercihini) okuyup
// <html data-theme="..."> attribute'unu React hidrate olmadan hemen ayarlar.
// Bu olmadan sayfa bir an için yanlış temayla açılıp sonra "flash" ederdi
// (bkz. src/store/theme.tsx — aynı mantığı client tarafında da uyguluyor).
const THEME_INIT_SCRIPT = `
(function () {
  try {
    var saved = localStorage.getItem('lexis_theme_mode');
    var scheme = saved === 'light' || saved === 'dark'
      ? saved
      : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', scheme);
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        <Providers>{children}</Providers>
        {/* Vercel projeye bağlıysa otomatik veri toplamaya başlar, ek config
            gerekmez — bkz. backlog Bölüm 6. Build/lokal ortamda no-op'tur. */}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
