'use client';

import Image from 'next/image';
import { useLocale } from '@/lib/i18n';

export function Showcase() {
  const { t } = useLocale();

  const items = [
    { src: '/screenshots/dashboard.png', caption: t('showcaseItem1') },
    { src: '/screenshots/words.png', caption: t('showcaseItem2') },
    { src: '/screenshots/game.png', caption: t('showcaseItem3') },
  ];

  return (
    <section className="bg-gray-50 border-y border-gray-100 py-20">
      <div className="mx-auto max-w-6xl px-5">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900">{t('showcaseTitle')}</h2>
          <p className="mt-3 text-lg text-gray-500">{t('showcaseSubtitle')}</p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          {items.map((item) => (
            <figure
              key={item.src}
              className="rounded-2xl border border-gray-100 bg-white p-2.5 shadow-sm hover:shadow-lg transition-shadow"
            >
              <div className="overflow-hidden rounded-xl bg-gray-100">
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
          ))}
        </div>
      </div>
    </section>
  );
}
