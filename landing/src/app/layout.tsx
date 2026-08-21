import type { Metadata } from 'next';
import './globals.css';
import { LocaleProvider } from '@/lib/i18n';

export const metadata: Metadata = {
  title: 'Lexis — Kelime, program ve oyunla dil öğren',
  description: 'Lexis; kişisel kelime listeni, günlük çalışma programını ve arkadaşlarınla yarışabildiğin oyunları tek bir yerde birleştiren, 9 dilde arayüz sunan ücretsiz dil öğrenme uygulaması.',
  icons: {
    icon: '/logo-icon.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>
        <LocaleProvider>{children}</LocaleProvider>
      </body>
    </html>
  );
}
