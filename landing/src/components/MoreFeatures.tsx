'use client';

import { Swords, Map, Award, BarChart3 } from 'lucide-react';
import { useLocale } from '@/lib/i18n';
import { Reveal } from './Reveal';

/**
 * Görev haritası, düello, rozet/unvan ve raporlama gibi uygulamaya
 * sonradan eklenen özellikleri tek satırda özetleyen, kartsız 4'lü
 * ızgara — DirectionB tasarım yönelimindeki "no-card grid + gradyan
 * nokta" dilini takip eder (bkz. globals.css .feature-dot).
 */
export function MoreFeatures() {
  const { t } = useLocale();

  const items = [
    { icon: Swords, title: t('m1Title'), desc: t('m1Desc') },
    { icon: Map, title: t('m2Title'), desc: t('m2Desc') },
    { icon: Award, title: t('m3Title'), desc: t('m3Desc') },
    { icon: BarChart3, title: t('m4Title'), desc: t('m4Desc') },
  ];

  return (
    <section className="mx-auto max-w-6xl px-5 py-20">
      <Reveal className="max-w-2xl mb-14">
        <h2 className="display text-3xl sm:text-4xl font-bold tracking-tight text-gray-900">{t('moreTitle')}</h2>
        <p className="mt-3 text-lg text-gray-500">{t('moreSubtitle')}</p>
      </Reveal>

      <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-0">
        {items.map((item, i) => (
          <Reveal key={item.title} delay={i * 80} variant={i % 2 === 0 ? 'left' : 'right'}>
            <div
              className={`flex flex-col gap-3 lg:px-7 first:lg:pl-0 last:lg:pr-0 ${
                i > 0 ? 'lg:border-l lg:border-gray-200' : ''
              }`}
            >
              <span className="feature-dot" />
              <div className="w-11 h-11 rounded-xl bg-[var(--brand-50)] text-[var(--brand-600)] flex items-center justify-center">
                <item.icon className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-gray-900">{item.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
