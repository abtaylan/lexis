'use client';

import { BookOpen, Gamepad2, CalendarDays, Trophy, Users, Globe2 } from 'lucide-react';
import { useLocale } from '@/lib/i18n';
import { Reveal } from './Reveal';
import { RibbonMotif } from './RibbonMotif';
import { useScrollActive } from '@/lib/useScrollActive';

/**
 * Özellikler bölümü "sabitlenen görsel panel + kaydırınca değişen metin
 * bloğu" (scrollytelling) kurgusuyla anlatılıyor. Panel artık Hero/Cta'daki
 * lacivert marka kartıyla aynı dilde (.feature-card, globals.css): her blok
 * görünüm alanının ortasına geldiğinde ikon+numara çapraz geçişle (crossfade)
 * değişir, alttaki ince çubuk 6 özellik içindeki konumu gösterir. Ortak
 * scroll-izleme mantığı useScrollActive hook'unda (Showcase ile paylaşılıyor).
 */
export function Features() {
  const { t } = useLocale();
  const { active, setRef } = useScrollActive();

  const items = [
    { icon: BookOpen, title: t('f1Title'), desc: t('f1Desc') },
    { icon: Gamepad2, title: t('f2Title'), desc: t('f2Desc') },
    { icon: CalendarDays, title: t('f3Title'), desc: t('f3Desc') },
    { icon: Trophy, title: t('f4Title'), desc: t('f4Desc') },
    { icon: Users, title: t('f5Title'), desc: t('f5Desc') },
    { icon: Globe2, title: t('f6Title'), desc: t('f6Desc') },
  ];

  return (
    <section id="features" className="mx-auto max-w-6xl px-5 py-24">
      <Reveal className="max-w-2xl mb-16">
        <h2 className="display text-3xl sm:text-4xl font-bold tracking-tight text-gray-900">{t('featuresTitle')}</h2>
        <p className="mt-3 text-lg text-gray-500">{t('featuresSubtitle')}</p>
      </Reveal>

      <div className="grid gap-12 lg:grid-cols-[400px_1fr]">
        <div className="hidden lg:block">
          <div className="sticky-panel">
            <div className="feature-card relative h-[420px] rounded-[28px] overflow-hidden">
              <RibbonMotif className="absolute -right-12 -top-12 w-56 h-80" opacity={0.16} />
              <div className="relative z-10 flex h-full flex-col p-9">
                <div className="relative flex-1">
                  {items.map((item, i) => (
                    <div key={i} className={`crossfade-item ${active === i ? 'is-active' : ''}`}>
                      <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-white/10 text-white">
                        <item.icon className="w-7 h-7" />
                      </div>
                      <div className="mt-7 text-xs font-bold tracking-wide text-white/40 display">
                        {String(i + 1).padStart(2, '0')} / 06
                      </div>
                      <h3 className="display mt-2 text-2xl font-bold text-white leading-snug">{item.title}</h3>
                    </div>
                  ))}
                </div>

                <div className="relative flex items-center gap-1.5 pt-6">
                  {items.map((_, i) => (
                    <span
                      key={i}
                      className={`h-1 flex-1 rounded-full transition-all duration-500 ${
                        i === active ? 'bg-gradient-to-r from-[#4C6FFF] to-[#7B5CFA]' : 'bg-white/15'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col">
          {/* Mobilde sticky panel yok; ikon her blokta kendi içinde gösterilir. */}
          {items.map((item, i) => (
            <div
              key={i}
              ref={setRef(i)}
              data-index={i}
              className="min-h-[56vh] lg:min-h-[62vh] flex flex-col justify-center border-t border-gray-100 first:border-t-0"
            >
              <div className="lg:hidden w-11 h-11 rounded-xl flex items-center justify-center mb-4 bg-[var(--navy-900)] text-white">
                <item.icon className="w-5 h-5" />
              </div>
              <Reveal variant={i % 2 === 0 ? 'left' : 'right'}>
                <span className="display text-sm font-bold text-[var(--brand-500)]">{String(i + 1).padStart(2, '0')}</span>
                <h3 className="display mt-2 text-xl lg:text-2xl font-bold text-gray-900">{item.title}</h3>
                <p className="mt-3 text-base text-gray-500 leading-relaxed max-w-md">{item.desc}</p>
              </Reveal>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
