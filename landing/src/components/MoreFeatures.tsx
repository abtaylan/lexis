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

      {/* KULLANICI GERİ BİLDİRİMİ (19 Eylül): önce ayraç çizgilerini tutarlı
          hale getirdik, ama kullanıcı çizgileri tamamen kaldırmayı tercih
          etti ("kartlar arasındaki çizgiler kalksın"). Artık ayırma işini
          tamamen grid `gap` boşluğu yapıyor, border yok. */}
      <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:items-stretch">
        {items.map((item, i) => (
          <Reveal key={item.title} delay={i * 80} variant={i % 2 === 0 ? 'left' : 'right'} className="h-full">
            <div className="flex h-full flex-col gap-3">
              <span className="feature-dot" />
              <div className="w-12 h-12 rounded-xl bg-[var(--brand-50)] text-[var(--brand-600)] flex items-center justify-center">
                <item.icon className="w-6 h-6" />
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
