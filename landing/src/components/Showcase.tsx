'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useLocale } from '@/lib/i18n';
import { Reveal } from './Reveal';

/**
 * Uygulama önizlemesi — önceki sürüm (scroll'a bağlı sabitlenen panel)
 * hem masaüstünde hem mobilde ayrı ayrı kurgu gerektiriyordu ve kırılgandı
 * (bkz. sticky+overflow-hidden notu, web-craft skill). Bunun yerine tek,
 * basit ve her ekran boyutunda aynı çalışan bir kurgu: üstte tıklanabilir
 * sekmeler (pill), altında tarayıcı-penceresi görünümlü tek bir çerçeve —
 * seçili sekmenin ekran görüntüsü crossfade ile değişir. Scroll'a bağımlı
 * hiçbir davranış yok.
 */
export function Showcase() {
  const { t, locale } = useLocale();
  const [active, setActive] = useState(0);

  // Lexis 12 dilde çalışıyor; ekran görüntüleri ise bunlardan 8'i için ayrı
  // çekildi (en/de/fr/es/it/ru/ar/ja). tr, pt, zh ve ko bilinçli olarak kök/
  // varsayılan sete (`public/screenshots/*.png`) düşer.
  const LOCALIZED_SCREENSHOTS = ['en', 'de', 'fr', 'es', 'it', 'ru', 'ar', 'ja'];
  const screenshotSrc = (name: string) =>
    LOCALIZED_SCREENSHOTS.includes(locale) ? `/screenshots/${locale}/${name}.png` : `/screenshots/${name}.png`;

  const items = [
    { src: screenshotSrc('dashboard'), label: t('showcaseItem1') },
    { src: screenshotSrc('words'), label: t('showcaseItem2') },
    { src: screenshotSrc('game'), label: t('showcaseItem3') },
  ];

  return (
    <section className="bg-gray-50 border-y border-gray-100 py-24">
      <div className="mx-auto max-w-5xl px-5">
        <Reveal className="max-w-2xl mx-auto text-center">
          <h2 className="display text-3xl sm:text-4xl font-bold tracking-tight text-gray-900">{t('showcaseTitle')}</h2>
          <p className="mt-3 text-lg text-gray-500">{t('showcaseSubtitle')}</p>
        </Reveal>

        <Reveal variant="scale" className="mt-10 flex flex-wrap justify-center gap-2">
          {items.map((item, i) => (
            <button
              key={item.label}
              type="button"
              onClick={() => setActive(i)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                active === i
                  ? 'bg-[var(--navy-900)] text-white shadow-sm'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300 hover:text-gray-900'
              }`}
            >
              {item.label}
            </button>
          ))}
        </Reveal>

        <Reveal variant="scale" delay={80} className="mt-8">
          <div className="mx-auto max-w-3xl overflow-hidden rounded-[24px] border border-gray-200 bg-white shadow-2xl ring-1 ring-black/5">
            <div className="flex items-center gap-1.5 border-b border-gray-100 bg-gray-50 px-4 py-3">
              <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
            </div>
            <div className="relative aspect-[900/577] bg-gray-100">
              {items.map((item, i) => (
                <div key={item.src} className={`crossfade-item ${active === i ? 'is-active' : ''}`}>
                  <Image
                    src={item.src}
                    alt={item.label}
                    fill
                    sizes="(min-width: 768px) 768px, 100vw"
                    className="object-cover object-top"
                    priority={i === 0}
                  />
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
