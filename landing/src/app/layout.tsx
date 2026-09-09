import type { Metadata } from 'next';
import './globals.css';
import { LocaleProvider } from '@/lib/i18n';
import { SITE_URL, SOCIAL_LINKS } from '@/lib/config';

const TITLE = 'Lexis — Kelime, program ve oyunla dil öğren';
const DESCRIPTION =
  'Lexis; kişisel kelime listeni, günlük çalışma programını ve arkadaşlarınla yarışabildiğin oyunları tek bir yerde birleştiren, 9 dilde arayüz sunan ücretsiz dil öğrenme uygulaması.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE,
    template: '%s — Lexis',
  },
  description: DESCRIPTION,
  keywords: [
    'lexis',
    'lexis kelime uygulaması',
    'kelime öğrenme uygulaması',
    'dil öğrenme uygulaması',
    'aralıklı tekrar',
    'spaced repetition',
    'kelime ezberleme',
    'ingilizce kelime öğren',
    'kelime kartları',
    'flashcard',
  ],
  applicationName: 'Lexis',
  authors: [{ name: 'Lexis' }],
  category: 'education',
  icons: {
    icon: '/logo-icon.png',
    apple: '/logo-icon.png',
  },
  alternates: {
    canonical: '/',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
    },
  },
  openGraph: {
    type: 'website',
    locale: 'tr_TR',
    url: SITE_URL,
    siteName: 'Lexis',
    title: TITLE,
    description: DESCRIPTION,
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Lexis — Kelime, program ve oyunla dil öğren',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: ['/og-image.png'],
  },
  verification: {
    // Google Search Console'da alan adı doğrulaması yapıldığında buraya
    // dokunmadan Vercel'de NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION env değişkeni
    // eklenip yeniden deploy edilmesi yeterli (4 Eylül 2026).
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || undefined,
  },
};

// SoftwareApplication JSON-LD — Google'ın arama sonuçlarında Lexis'i bir
// uygulama olarak tanıyıp (potansiyel olarak yıldız/fiyat gibi zengin
// sonuçlarla) göstermesi için (4 Eylül 2026). Henüz gerçek bir puan/yorum
// verisi olmadığından aggregateRating bilerek eklenmedi — uydurma veri
// Google'ın spam politikalarını ihlal eder; mağazalarda yeterli yorum
// birikince (bkz. Play Console / App Store Connect) eklenebilir.
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Lexis',
  applicationCategory: 'EducationApplication',
  operatingSystem: 'Android, iOS, Web',
  description: DESCRIPTION,
  url: SITE_URL,
  image: `${SITE_URL}/logo-full.png`,
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'TRY',
  },
  sameAs: SOCIAL_LINKS.filter((s) => s.href).map((s) => s.href as string),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <head>
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>
        <LocaleProvider>{children}</LocaleProvider>
      </body>
    </html>
  );
}
