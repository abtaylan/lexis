'use client';

// components/schedule/CalendarView.tsx — Çalışma Programı için Takvim
// gösterim modu (15 Ekim 2026 kullanıcı isteği): "genel yıllık, aylık,
// haftalık seçenekleri olsun, Program haritası dışında buradan da istediğim
// tarih aralığında ne var görebileyim". study_schedule HAFTANIN GÜNÜNE göre
// tekrar eden bir program olduğundan (tarihe özel değil), herhangi bir
// takvim tarihi için o günün haftanın hangi günü olduğuna (date.getDay())
// bakılarak o gün için planlanan maddeler gösterilir — ScheduleItem.day_of_week
// JS Date.getDay() ile aynı 0=Pazar..6=Cumartesi sözleşimini kullanıyor.
import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Clock, X } from 'lucide-react';
import type { ScheduleItem } from '@/types';

type CalendarMode = 'week' | 'month' | 'year';

const WEEKDAY_SHORT_TR = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
const MONTH_NAMES_TR = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function startOfWeek(d: Date): Date {
  const r = new Date(d);
  r.setDate(r.getDate() - r.getDay());
  r.setHours(0, 0, 0, 0);
  return r;
}

function fmtRangeTr(start: Date, end: Date): string {
  const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
  const s = start.toLocaleDateString('tr-TR', { day: 'numeric', month: sameMonth ? undefined : 'long' });
  const e = end.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
  return `${s} – ${e}`;
}

export function CalendarView({ items }: { items: ScheduleItem[] }) {
  const [mode, setMode] = useState<CalendarMode>('month');
  const [anchor, setAnchor] = useState<Date>(() => new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const itemsByDow = useMemo(() => {
    const map: Record<number, ScheduleItem[]> = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
    for (const it of items) {
      if (!it.is_active) continue;
      (map[it.day_of_week] ??= []).push(it);
    }
    for (const dow of Object.keys(map)) {
      map[Number(dow)].sort((a, b) => a.time_slot.localeCompare(b.time_slot));
    }
    return map;
  }, [items]);

  function go(delta: number) {
    const d = new Date(anchor);
    if (mode === 'week') d.setDate(d.getDate() + delta * 7);
    else if (mode === 'month') d.setMonth(d.getMonth() + delta);
    else d.setFullYear(d.getFullYear() + delta);
    setAnchor(d);
  }

  function goToday() {
    setAnchor(new Date());
    setSelectedDate(null);
  }

  const today = new Date();

  return (
    <div>
      <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-slate-800 rounded-full p-1">
          {(['week', 'month', 'year'] as CalendarMode[]).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setSelectedDate(null); }}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                mode === m ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 shadow-sm' : 'text-gray-500 dark:text-slate-400'
              }`}
            >
              {m === 'week' ? 'Haftalık' : m === 'month' ? 'Aylık' : 'Yıllık'}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => go(-1)}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500 dark:text-slate-400"
            aria-label="Önceki"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={goToday}
            className="px-2.5 py-1 rounded-lg text-xs font-semibold text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800"
          >
            Bugün
          </button>
          <button
            onClick={() => go(1)}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500 dark:text-slate-400"
            aria-label="Sonraki"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {mode === 'week' && <WeekGrid anchor={anchor} itemsByDow={itemsByDow} today={today} onPickDate={setSelectedDate} />}
      {mode === 'month' && <MonthGrid anchor={anchor} itemsByDow={itemsByDow} today={today} onPickDate={setSelectedDate} />}
      {mode === 'year' && <YearGrid anchor={anchor} itemsByDow={itemsByDow} today={today} onPickMonth={(d) => { setAnchor(d); setMode('month'); }} />}

      {selectedDate && (
        <DayDetailPanel date={selectedDate} items={itemsByDow[selectedDate.getDay()] ?? []} onClose={() => setSelectedDate(null)} />
      )}
    </div>
  );
}

function DayDetailPanel({ date, items, onClose }: { date: Date; items: ScheduleItem[]; onClose: () => void }) {
  return (
    <div className="mt-3 bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-4">
      <div className="flex items-center justify-between mb-2.5">
        <p className="text-sm font-bold text-gray-900 dark:text-slate-100">
          {date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' })}
        </p>
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-400">
          <X className="w-4 h-4" />
        </button>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-gray-400 dark:text-slate-500">Bu gün için planlanmış bir etkinlik yok.</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {items.map((it) => (
            <a
              key={it.id}
              href={it.resolved_link_url || it.link_url || undefined}
              target={it.resolved_link_url || it.link_url ? '_blank' : undefined}
              rel="noreferrer"
              className="flex items-center gap-2 text-sm py-1.5 px-2 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800"
            >
              <Clock className="w-3.5 h-3.5 shrink-0 text-gray-400" />
              <span className="text-xs font-mono text-gray-400 dark:text-slate-500 shrink-0">{it.time_slot}</span>
              <span className="text-gray-700 dark:text-slate-300">{it.activity}</span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

function WeekGrid({
  anchor, itemsByDow, today, onPickDate,
}: { anchor: Date; itemsByDow: Record<number, ScheduleItem[]>; today: Date; onPickDate: (d: Date) => void }) {
  const start = startOfWeek(anchor);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
  const end = days[6];

  return (
    <div>
      <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 mb-2">{fmtRangeTr(start, end)}</p>
      <div className="grid grid-cols-7 gap-1.5">
        {days.map((d) => {
          const dow = d.getDay();
          const dayItems = itemsByDow[dow] ?? [];
          const isToday = sameDay(d, today);
          return (
            <button
              key={d.toISOString()}
              onClick={() => onPickDate(d)}
              className={`flex flex-col items-start gap-1 rounded-xl p-2 text-left border transition-colors ${
                isToday
                  ? 'bg-[#378ADD] border-[#378ADD] text-white'
                  : 'bg-white dark:bg-slate-900 border-gray-100 dark:border-slate-800 hover:border-[#378ADD]/40'
              }`}
              style={{ minHeight: 86 }}
            >
              <span className={`text-[10px] font-semibold ${isToday ? 'text-white/80' : 'text-gray-400 dark:text-slate-500'}`}>
                {WEEKDAY_SHORT_TR[dow]}
              </span>
              <span className={`text-sm font-bold ${isToday ? 'text-white' : 'text-gray-900 dark:text-slate-100'}`}>
                {d.getDate()}
              </span>
              <span className={`text-[10px] ${isToday ? 'text-white/80' : 'text-gray-400 dark:text-slate-500'}`}>
                {dayItems.length > 0 ? `${dayItems.length} madde` : ''}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MonthGrid({
  anchor, itemsByDow, today, onPickDate,
}: { anchor: Date; itemsByDow: Record<number, ScheduleItem[]>; today: Date; onPickDate: (d: Date) => void }) {
  const year = anchor.getFullYear();
  const month = anchor.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const gridStart = startOfWeek(firstOfMonth);
  const cells = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    return d;
  });

  return (
    <div>
      <p className="text-sm font-bold text-gray-900 dark:text-slate-100 mb-2">
        {MONTH_NAMES_TR[month]} {year}
      </p>
      <div className="grid grid-cols-7 gap-1 text-center mb-1">
        {WEEKDAY_SHORT_TR.map((w) => (
          <span key={w} className="text-[10px] font-semibold text-gray-400 dark:text-slate-500">{w}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d) => {
          const inMonth = d.getMonth() === month;
          const dow = d.getDay();
          const dayItems = itemsByDow[dow] ?? [];
          const isToday = sameDay(d, today);
          return (
            <button
              key={d.toISOString()}
              onClick={() => onPickDate(d)}
              className={`flex flex-col items-center justify-center gap-0.5 rounded-lg py-1.5 transition-colors ${
                isToday
                  ? 'bg-[#378ADD] text-white'
                  : inMonth
                    ? 'hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-700 dark:text-slate-300'
                    : 'text-gray-300 dark:text-slate-700'
              }`}
              style={{ minHeight: 44 }}
            >
              <span className="text-xs font-semibold">{d.getDate()}</span>
              {dayItems.length > 0 && (
                <span className={`w-1.5 h-1.5 rounded-full ${isToday ? 'bg-white' : 'bg-[#378ADD]'}`} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function YearGrid({
  anchor, itemsByDow, today, onPickMonth,
}: { anchor: Date; itemsByDow: Record<number, ScheduleItem[]>; today: Date; onPickMonth: (d: Date) => void }) {
  const year = anchor.getFullYear();

  return (
    <div>
      <p className="text-sm font-bold text-gray-900 dark:text-slate-100 mb-2">{year}</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {Array.from({ length: 12 }, (_, month) => {
          const firstOfMonth = new Date(year, month, 1);
          const gridStart = startOfWeek(firstOfMonth);
          const cells = Array.from({ length: 42 }, (_, i) => {
            const d = new Date(gridStart);
            d.setDate(gridStart.getDate() + i);
            return d;
          });
          return (
            <button
              key={month}
              onClick={() => onPickMonth(firstOfMonth)}
              className="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 p-2.5 text-left hover:border-[#378ADD]/40 transition-colors"
            >
              <p className="text-xs font-bold text-gray-900 dark:text-slate-100 mb-1.5">{MONTH_NAMES_TR[month]}</p>
              <div className="grid grid-cols-7 gap-[2px]">
                {cells.map((d) => {
                  const inMonth = d.getMonth() === month;
                  const dow = d.getDay();
                  const hasItems = (itemsByDow[dow] ?? []).length > 0;
                  const isToday = sameDay(d, today);
                  return (
                    <span
                      key={d.toISOString()}
                      className={`flex items-center justify-center rounded text-[8px] ${
                        isToday
                          ? 'bg-[#378ADD] text-white font-bold'
                          : !inMonth
                            ? 'text-gray-200 dark:text-slate-800'
                            : hasItems
                              ? 'text-[#378ADD] font-semibold'
                              : 'text-gray-400 dark:text-slate-600'
                      }`}
                      style={{ width: 14, height: 14 }}
                    >
                      {d.getDate()}
                    </span>
                  );
                })}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
