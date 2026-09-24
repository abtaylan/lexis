'use client';

// components/layout/StreakHeatmap.tsx — Madde 3 (Görsel/GUI), "streak
// heatmap" (24 Eylül 2026). GitHub'ın katkı takvimine benzer bir ızgara:
// son N hafta, her hücre bir gün, renk yoğunluğu o günkü toplam ilerlemeye
// (words_added + words_reviewed) göre değişiyor.
//
// CefrBadge.tsx / XPBar.tsx / DailyWordCard.tsx ile AYNI self-contained
// "soft-disable" deseni: kendi API çağrısını kendi yapar (mevcut
// statsApi.getHistory zaten var, backend değişikliği GEREKMEDİ — sadece
// dashboard'ın kullandığı 14 günlük çağrıdan farklı olarak WEEKS*7 günlük
// bir pencere istiyor), veri gelmeden/hata durumunda sessizce hiçbir şey
// göstermez.
import { useEffect, useState } from 'react';
import { statsApi } from '@/lib/api';
import type { DailyProgress } from '@/types';
import { useLocale, type Locale } from '@/lib/i18n';

const WEEKS = 18; // ~4,5 ay — dar bir dashboard kartına sığacak kompakt bir pencere

const LABELS: Partial<Record<Locale, { title: string; activeDaysTpl: string; less: string; more: string }>> = {
  tr: {
    title: 'Çalışma Takvimi',
    activeDaysTpl: 'son {weeks} haftada {n} gün aktif',
    less: 'Az',
    more: 'Çok',
  },
  en: {
    title: 'Activity Calendar',
    activeDaysTpl: '{n} active days in the last {weeks} weeks',
    less: 'Less',
    more: 'More',
  },
};

const DAY_LABELS_SHORT: Partial<Record<Locale, string[]>> = {
  tr: ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'],
  en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
};

// Yoğunluk seviyesine göre hücre rengi — mevcut kodda "doğru/başarı" için
// zaten kullanılan yeşil paletle (#EAF3DE / #3B6D11, bkz. game/page.tsx,
// dashboard.tsx'teki stat kartları) tutarlı bir 5 kademeli ölçek.
const LEVEL_CLASSES = [
  'bg-gray-100 dark:bg-slate-800', // 0 — hiç ilerleme yok
  'bg-[#D9EFC4] dark:bg-green-950', // 1
  'bg-[#B3DE8F] dark:bg-green-900', // 2
  'bg-[#7FBD52] dark:bg-green-700', // 3
  'bg-[#3B6D11] dark:bg-green-500', // 4 — en yoğun gün
];

function levelFor(count: number): number {
  if (count <= 0) return 0;
  if (count <= 2) return 1;
  if (count <= 5) return 2;
  if (count <= 9) return 3;
  return 4;
}

type DayCell = { date: string; count: number; level: number; isFuture: boolean };

function buildColumns(history: DailyProgress[], weeks: number): DayCell[][] {
  const byDate = new Map<string, number>();
  for (const h of history) {
    byDate.set(h.date, (h.words_added ?? 0) + (h.words_reviewed ?? 0));
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dayOfWeek = (today.getDay() + 6) % 7; // 0 = Pazartesi (bkz. dashboard/page.tsx::getWeekDays ile aynı hafta başlangıcı)
  const mondayThisWeek = new Date(today);
  mondayThisWeek.setDate(today.getDate() - dayOfWeek);
  const start = new Date(mondayThisWeek);
  start.setDate(mondayThisWeek.getDate() - (weeks - 1) * 7);

  const columns: DayCell[][] = [];
  for (let w = 0; w < weeks; w++) {
    const col: DayCell[] = [];
    for (let d = 0; d < 7; d++) {
      const day = new Date(start);
      day.setDate(start.getDate() + w * 7 + d);
      const dateStr = day.toISOString().split('T')[0];
      const isFuture = day > today;
      const count = isFuture ? 0 : byDate.get(dateStr) ?? 0;
      col.push({ date: dateStr, count, level: levelFor(count), isFuture });
    }
    columns.push(col);
  }
  return columns;
}

export function StreakHeatmap() {
  const { locale } = useLocale();
  const [history, setHistory] = useState<DailyProgress[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    statsApi
      .getHistory(WEEKS * 7 + 1)
      .then((res) => {
        if (!cancelled) setHistory(res);
      })
      .catch(() => {
        /* soft-disable -- diğer dashboard kartlarıyla aynı desen */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!history) return null;

  const t = LABELS[locale] ?? LABELS.tr!;
  const dayLabels = DAY_LABELS_SHORT[locale] ?? DAY_LABELS_SHORT.tr!;
  const columns = buildColumns(history, WEEKS);
  const activeDays = columns.flat().filter((c) => !c.isFuture && c.count > 0).length;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm px-4 py-3.5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">{t.title}</p>
        <p className="text-xs text-gray-400 dark:text-slate-500">
          {t.activeDaysTpl.replace('{n}', String(activeDays)).replace('{weeks}', String(WEEKS))}
        </p>
      </div>

      <div className="flex gap-3">
        <div className="flex flex-col justify-between py-[1px] shrink-0">
          {dayLabels.map((d, i) => (
            <span
              key={d}
              className="text-[9px] leading-[11px] text-gray-300 dark:text-slate-600 h-[11px]"
              style={{ visibility: i % 2 === 0 ? 'visible' : 'hidden' }}
            >
              {d}
            </span>
          ))}
        </div>

        <div className="flex-1 overflow-x-auto">
          <div className="flex gap-[3px] w-max">
            {columns.map((col, wi) => (
              <div key={wi} className="flex flex-col gap-[3px]">
                {col.map((cell) => (
                  <div
                    key={cell.date}
                    title={cell.isFuture ? undefined : `${cell.date} — ${cell.count}`}
                    className={`w-[11px] h-[11px] rounded-[2px] ${cell.isFuture ? 'bg-transparent' : LEVEL_CLASSES[cell.level]}`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-1 mt-2.5">
        <span className="text-[10px] text-gray-300 dark:text-slate-600">{t.less}</span>
        {LEVEL_CLASSES.map((cls, i) => (
          <div key={i} className={`w-[9px] h-[9px] rounded-[2px] ${cls}`} />
        ))}
        <span className="text-[10px] text-gray-300 dark:text-slate-600">{t.more}</span>
      </div>
    </div>
  );
}
