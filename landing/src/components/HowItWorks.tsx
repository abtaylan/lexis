'use client';

import { UserPlus, ListPlus, CalendarCheck, Swords } from 'lucide-react';
import { useLocale } from '@/lib/i18n';

export function HowItWorks() {
  const { t } = useLocale();

  const steps = [
    { icon: UserPlus, title: t('how1Title'), desc: t('how1Desc') },
    { icon: ListPlus, title: t('how2Title'), desc: t('how2Desc') },
    { icon: CalendarCheck, title: t('how3Title'), desc: t('how3Desc') },
    { icon: Swords, title: t('how4Title'), desc: t('how4Desc') },
  ];

  return (
    <section id="how" className="mx-auto max-w-6xl px-5 py-20">
      <div className="max-w-2xl">
        <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900">{t('howTitle')}</h2>
        <p className="mt-3 text-lg text-gray-500">{t('howSubtitle')}</p>
      </div>

      <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((step, i) => (
          <div key={step.title} className="relative">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-[var(--brand-50)] text-[var(--brand-600)] flex items-center justify-center shrink-0">
                <step.icon className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-gray-300">{String(i + 1).padStart(2, '0')}</span>
            </div>
            <h3 className="mt-4 text-base font-semibold text-gray-900">{step.title}</h3>
            <p className="mt-1.5 text-sm text-gray-500 leading-relaxed">{step.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
