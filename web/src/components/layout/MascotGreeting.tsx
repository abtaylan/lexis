// components/layout/MascotGreeting.tsx — Madde 3 (Görsel/GUI), "maskot/
// avatar sistemi" (24 Eylül 2026). Dashboard'ın en üstünde, günün
// durumuna (bugünkü hedef ilerlemesi + seri) göre ruh hali değişen bir
// maskot + konuşma balonu. CefrBadge/XPBar/DailyWordCard/StreakHeatmap
// ile aynı yerde yaşıyor ama onlardan farklı olarak kendi veri çekmiyor —
// dashboard zaten sahip olduğu `stats`'ı prop olarak geçiyor (aynı
// GET /stats çağrısının tekrarını önlemek için).
'use client';

import { Mascot, type MascotMood } from './Mascot';
import { useLocale, type Locale } from '@/lib/i18n';

interface MascotGreetingProps {
  streak: number;
  todayAdded: number;
  dailyGoal: number;
}

const L: Partial<Record<Locale, { celebrate: string; happy: string; idle: string; sad: string }>> = {
  tr: {
    celebrate: 'Harika! Bugünkü hedefini tamamladın. 🎉',
    happy: 'Güzel gidiyorsun, böyle devam!',
    idle: `Serin ${'{streak}'} günde — bugün de bir kelime ekleyelim mi?`,
    sad: 'Bugün henüz başlamadın. Küçük bir adım at, ben yardım edeyim!',
  },
  en: {
    celebrate: "Nice! You've hit today's goal. 🎉",
    happy: "You're doing great, keep it up!",
    idle: `{streak}-day streak going — add a word today too?`,
    sad: "You haven't started today. One small step — I'll cheer you on!",
  },
};

function moodFor(streak: number, todayAdded: number, dailyGoal: number): MascotMood {
  if (dailyGoal > 0 && todayAdded >= dailyGoal) return 'celebrate';
  if (todayAdded > 0) return 'happy';
  if (streak > 0) return 'idle';
  return 'sad';
}

export function MascotGreeting({ streak, todayAdded, dailyGoal }: MascotGreetingProps) {
  const { locale } = useLocale();
  const t = L[locale] ?? L.tr!;
  const mood = moodFor(streak, todayAdded, dailyGoal);
  const message = t[mood].replace('{streak}', String(streak));

  return (
    <div className="rounded-2xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 flex items-center gap-3">
      <Mascot mood={mood} size={52} className="shrink-0" />
      <div className="relative flex-1 rounded-2xl rounded-tl-sm bg-gray-50 dark:bg-slate-800/70 px-3.5 py-2.5">
        <p className="text-sm text-gray-700 dark:text-slate-200 leading-snug">{message}</p>
      </div>
    </div>
  );
}
