'use client';

import { BookOpen, Gamepad2, CalendarDays, Trophy, Users, Globe2 } from 'lucide-react';
import { useLocale } from '@/lib/i18n';

export function Features() {
  const { t } = useLocale();

  const items = [
    { icon: BookOpen, title: t('f1Title'), desc: t('f1Desc'), color: 'bg-[#EEEDFE] text-[#534AB7]' },
    { icon: Gamepad2, title: t('f2Title'), desc: t('f2Desc'), color: 'bg-[#FAEEDA] text-[#854F0B]' },
    { icon: CalendarDays, title: t('f3Title'), desc: t('f3Desc'), color: 'bg-[#E6F1FB] text-[#185FA5]' },
    { icon: Trophy, title: t('f4Title'), desc: t('f4Desc'), color: 'bg-[#FAEEDA] text-[#854F0B]' },
    { icon: Users, title: t('f5Title'), desc: t('f5Desc'), color: 'bg-[#E1F5EE] text-[#0F6E56]' },
    { icon: Globe2, title: t('f6Title'), desc: t('f6Desc'), color: 'bg-[#EAF3DE] text-[#3B6D11]' },
  ];

  return (
    <section id="features" className="mx-auto max-w-6xl px-5 py-20">
      <div className="max-w-2xl">
        <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900">{t('featuresTitle')}</h2>
        <p className="mt-3 text-lg text-gray-500">{t('featuresSubtitle')}</p>
      </div>

      <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 stagger">
        {items.map((item) => (
          <div
            key={item.title}
            className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
          >
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${item.color}`}>
              <item.icon className="w-5 h-5" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-gray-900">{item.title}</h3>
            <p className="mt-1.5 text-sm text-gray-500 leading-relaxed">{item.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
