'use client';

import Image from 'next/image';
import { useLocale } from '@/lib/i18n';
import { Reveal } from './Reveal';

export function Showcase() {
  const { t, locale } = useLocale();
  // Lexis 12 dilde çalışıyor; ekran görüntüleri ise bunlardan 8'i için ayrı
  // çekildi (en/de/fr/es/it/ru/ar/ja). tr, pt, zh ve ko bilinçli olarak kök/
  // varsayılan sete (`public/screenshots/*.png`) düşer.
  const LOCALIZED_SCREENSHOTS = ['en', 'de', 'fr', 'es', 'it', 'ru', 'ar', 'ja'];
  const screenshotSrc = (name: string) =>
    LOCALIZED_SCREENSHOTS.includes(locale) ? `/screenshots/${locale}/${name}.png` : `/screenshots/${name}.png`;

  const items = [
    { src: screenshotSrc('dashboard'), caption: t('showcaseItem1') },
    { src: screenshotSrc('words'), caption: t('showcaseItem2') },
    { src: screenshotSrc('game'), caption: t('showcaseItem3') },
  ];

  return (
    <section className="bg-gray-50 border-y border-gray-100 py-24 overflow-hidden">
      <div className="mx-auto max-w-6xl px-5">
        <Reveal className="max-w-2xl mx-auto text-center">
          <h2 className="display text-3xl sm:text-4xl font-bold tracking-tight text-gray-900">{t('showcaseTitle')}</h2>
          <p className="mt-3 text-lg text-gray-500">{t('showcaseSubtitle')}</p>
        </Reveal>

        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          {items.map((item, i) => (
            <Reveal key={item.src} delay={i * 110} variant={i === 0 ? 'left' : i === 2 ? 'right' : 'scale'}>
              <figure className="rounded-2xl border border-gray-100 bg-white p-2.5 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all">
                <div className="img-reveal overflow-hidden rounded-xl bg-gray-100">
                  <Image
                    src={item.src}
                    alt={item.caption}
                    width={900}
                    height={577}
                    className="w-full h-auto object-cover object-top"
                  />
                </div>
                <figcaption className="mt-3 px-1.5 pb-1 text-sm font-medium text-gray-600 text-center">
                  {item.caption}
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
