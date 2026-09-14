import type { Metadata } from 'next';
import './globals.css';
import { LocaleProvider } from '@/lib/i18n';
import { SITE_URL, SOCIAL_LINKS, CONTACT_EMAIL } from '@/lib/config';

const TITLE = 'Lexis — Kelime, program ve oyunla dil öğren';
const DESCRIPTION =
  'Lexis; kişisel kelime listeni, günlük çalışma programını ve arkadaşlarınla yarışabildiğin oyunları tek bir yerde birleştiren, 12 dilde arayüz sunan ücretsiz dil öğrenme uygulaması.';

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
    // Pinterest "Web sitenizi üzerinize alın" doğrulaması (14 Eylül 2026) —
    // Pinterest ayarlarındaki HTML etiketi seçeneğinden alınan meta tag.
    other: {
      'p:domain_verify': '96a0b5f5a1ab38df4d897a5ab043eace',
    },
  },
};

// SoftwareApplication JSON-LD — Google'ın arama sonuçlarında Lexis'i bir
// uygulama olarak tanıyıp (potansiyel olarak yıldız/fiyat gibi zengin
// sonuçlarla) göstermesi için (4 Eylül 2026). Henüz gerçek bir puan/yorum
// verisi olmadığından aggregateRating bilerek eklenmedi — uydurma veri
// Google'ın spam politikalarını ihlal eder; mağazalarda yeterli yorum
// birikince (bkz. Play Console / App Store Connect) eklenebilir.
const softwareAppJsonLd = {
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

// Organization + WebSite JSON-LD — Google'ın Lexis'i bir marka/kuruluş
// olarak tanıyıp bilgi panelinde göstermesi için (14 Eylül 2026). sameAs
// listesi SoftwareApplication ile aynı kaynaktan (SOCIAL_LINKS) türetildiği
// için elle senkron tutulması gerekmiyor.
const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Lexis',
  url: SITE_URL,
  logo: `${SITE_URL}/logo-full.png`,
  email: CONTACT_EMAIL,
  sameAs: SOCIAL_LINKS.filter((s) => s.href).map((s) => s.href as string),
};

const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Lexis',
  url: SITE_URL,
  inLanguage: ['tr', 'en', 'de', 'fr', 'es', 'it', 'ru', 'ar', 'ja', 'pt', 'zh', 'ko'],
};

// FAQPage JSON-LD — Google arama sonuçlarında "sıkça sorulan sorular" zengin
// snippet'i olarak görünmesini sağlar. Metinler bilerek Türkçe ve
// src/lib/i18n.tsx → dictionaries.tr içindeki faqQ*/faqA* anahtarlarının
// birebir kopyası olarak sabitlendi (varsayılan/indekslenen dil Türkçe) —
// SSS metni i18n.tsx'te değişirse buradaki metnin de elle güncellenmesi
// gerekir.
const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Lexis ücretsiz mi?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Evet, Lexis ücretsiz bir hesapla kullanılmaya başlanabilir. Ek özellikler sunan bir Premium plan da mevcuttur.',
      },
    },
    {
      '@type': 'Question',
      name: 'Hangi dilleri destekliyor?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Uygulama arayüzü 12 dilde (Türkçe, İngilizce, Almanca, Fransızca, İspanyolca, İtalyanca, Portekizce, Arapça, Rusça, Japonca, Korece, Çince) kullanılabilir; öğrenebileceğin diller de aynı dil havuzuna dayanır.',
      },
    },
    {
      '@type': 'Question',
      name: 'Premium ne sağlıyor?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Premium plan, uygulama içindeki bazı ek özellikleri ve reklamsız deneyimi açar. Güncel plan ve fiyat bilgisi için uygulama içindeki Premium sayfasına bakabilirsin.',
      },
    },
    {
      '@type': 'Question',
      name: 'Verilerim güvende mi?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Hesap verilerin ve öğrenme geçmişin sana özeldir; başka kullanıcılar yalnızca sen paylaşmayı tercih ettiğin (profil, istatistik özeti gibi) bilgileri görebilir.',
      },
    },
    {
      '@type': 'Question',
      name: 'Mobil uygulama var mı?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Mobil uygulama şu anda geliştirme aşamasında. Bu sırada web sürümünü telefon tarayıcından da rahatlıkla kullanabilirsin.',
      },
    },
    {
      '@type': 'Question',
      name: 'Nasıl iletişime geçebilirim?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Aşağıdaki e-posta adresinden veya sosyal medya hesaplarımızdan bize ulaşabilirsin.',
      },
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <head>
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareAppJsonLd) }}
        />
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      </head>
      <body>
        <LocaleProvider>{children}</LocaleProvider>
      </body>
    </html>
  );
}
