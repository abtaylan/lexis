'use client';

import Image from 'next/image';
import { useLocale } from '@/lib/i18n';
import { Reveal } from './Reveal';
import { useScrollActive } from '@/lib/useScrollActive';

/**
 * Uygulama önizlemesi de Features ile aynı scrollytelling kurgusunu
 * paylaşıyor (useScrollActive): masaüstünde sağda sabitlenen ekran görüntüsü
 * paneli, soldaki 3 başlık bloğundan hangisi ortadaysa ona çapraz geçişle
 * (crossfade) döner. Mobilde sabit panel yerine klasik alt-alta kart listesi
 * gösterilir (aynı .img-reveal wipe efektiyle).
 */
export function Showcase() {
  const { t, locale } = useLocale();
  // Lexis 12 dilde çalışıyor; ekran görüntüleri ise bunlardan 8'i için ayrı
  // çekildi (en/de/fr/es/it/ru/ar/ja). tr, pt, zh ve ko bilinçli olarak kök/
  // varsayılan sete (`public/screenshots/*.png`) düşer.
  const LOCALIZED_SCREENSHOTS = ['en', 'de', 'fr', 'es', 'it', 'ru', 'ar', 'ja'];
  const screenshotSrc = (name: string) =>
    LOCALIZED_SCREENSHOTS.includes(locale) ? `/screenshots/${locale}/${name}.png` : `/screenshots/${name}.png`;

  const { active, setRef } = useScrollActive();

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

        <div className="mt-16 hidden lg:grid gap-14 lg:grid-cols-[1fr_460px] items-start">
          <div className="flex flex-col">
            {items.map((item, i) => (
              <div
                key={item.caption}
                ref={setRef(i)}
                data-index={i}
                className="min-h-[58vh] flex flex-col justify-center border-t border-gray-200 first:border-t-0"
              >
                <Reveal variant={i % 2 === 0 ? 'left' : 'right'}>
                  <span className="display text-sm font-bold text-[var(--brand-500)]">{String(i + 1).padStart(2, '0')} / 03</span>
                  <p className="mt-3 text-xl font-semibold text-gray-900 leading-snug max-w-sm">{item.caption}</p>
                </Reveal>
              </div>
            ))}
          </div>

          <div className="sticky-panel">
            <div className="relative h-[560px] rounded-[24px] shadow-xl ring-1 ring-black/5 overflow-hidden bg-gray-100">
              {items.map((item, i) => (
                <div key={item.src} className={`crossfade-item ${active === i ? 'is-active' : ''}`}>
                  <Image
                    src={item.src}
                    alt={item.caption}
                    fill
                    sizes="460px"
                    className="object-cover object-top"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Mobil: sabit panel yerine klasik kart listesi. */}
        <div className="mt-12 grid gap-6 sm:grid-cols-3 lg:hidden">
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
