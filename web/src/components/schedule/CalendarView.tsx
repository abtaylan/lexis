'use client';

// components/schedule/CalendarView.tsx — Çalışma Programı için Takvim
// gösterim modu (15 Ekim 2026 kullanıcı isteği): "genel yıllık, aylık,
// haftalık seçenekleri olsun, Program haritası dışında buradan da istediğim
// tarih aralığında ne var görebileyim".
//
// 15 Ekim 2026 — ikinci geri bildirim turu: "takvim modunda tarihler değişse
// bile hep aynı ders içeriği yazılı gözüküyor, burası hatalı olmuş" — ESKİ
// kod sadece study_schedule'ı (tek bir haftalık TEKRARLI şablon) day_of_week'e
// göre gösteriyordu, bu yüzden HANGİ tarihe tıklanırsa tıklansın aynı hafta
// içeriği çıkıyordu. Artık GET /schedule/roadmap'ten (study_roadmap_weeks)
// 20 haftanın TAMAMI çekiliyor ve her maddenin kendi GERÇEK tarihine
// (item.date) göre bir Map<tarih, maddeler> kuruluyor — böylece her tarih
// kendi haftasının gerçek konusunu gösterir. Roadmap'in kapsadığı tarih
// aralığı dışındaki günler (henüz program oluşturulmamışsa ya da roadmap
// tarih aralığının dışındaysa) eski haftalık-tekrarlı study_schedule
// mantığına düşer (geriye dönük uyumluluk).
//
// Ayrıca kullanıcı isteği: gün kutuları kare/dikdörtgen olsun ve
// yeşil/turuncu/kırmızı/sarı (soft tonlar) ile renklendirilsin + gün detay
// panelinde bir "Yapıldı" anahtarı olsun (bkz. backend
// schedule_day_completions + /schedule/day-completion(s)).
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Clock, X, Check, ExternalLink, NotebookPen } from 'lucide-react';
import { scheduleApi } from '@/lib/api';
import type { ScheduleItem, ScheduleTemplateItem, RoadmapWeek } from '@/types';

type CalendarMode = 'week' | 'month' | 'year';
type DayStatus = 'done' | 'scheduled' | 'missed' | 'none';

const WEEKDAY_SHORT_TR = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
const MONTH_NAMES_TR = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];

// Soft tonlar — kullanıcı isteği: "bu renklerin soft tonları kullanılsın".
// Uygulamanın geri kalanında zaten kullanılan paletle tutarlı (bkz.
// schedule/page.tsx ve roadmap/page.tsx'teki aynı renkler).
const STATUS_STYLES: Record<DayStatus, { bg: string; text: string; dot: string }> = {
  done: { bg: 'bg-[#E1F5EE]', text: 'text-[#0F6E56]', dot: 'bg-[#0F6E56]' },
  scheduled: { bg: 'bg-[#FEF3E7]', text: 'text-[#B7791F]', dot: 'bg-[#B7791F]' },
  missed: { bg: 'bg-[#FDEEEA]', text: 'text-[#9A3412]', dot: 'bg-[#9A3412]' },
  none: { bg: 'bg-[#FEF9E7]', text: 'text-[#D4A017]', dot: 'bg-[#D4A017]' },
};

const STATUS_LABEL: Record<DayStatus, string> = {
  done: 'Yapıldı',
  scheduled: 'Çalışılacak',
  missed: 'Çalışılmadı',
  none: 'Program yok',
};

type DisplayItem = {
  key: string;
  time_slot: string;
  activity: string;
  link_url?: string;
  related_topics?: ScheduleTemplateItem['related_topics'];
  topic_number?: number | null;
};

function isoOf(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

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
  const [roadmapWeeks, setRoadmapWeeks] = useState<RoadmapWeek[]>([]);
  const [completions, setCompletions] = useState<Record<string, boolean>>({});
  const [savingCompletion, setSavingCompletion] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [roadmap, comps] = await Promise.all([
        scheduleApi.getRoadmap().catch(() => null),
        scheduleApi.getDayCompletions().catch(() => []),
      ]);
      if (!alive) return;
      if (roadmap) setRoadmapWeeks(roadmap.weeks);
      setCompletions(Object.fromEntries((comps ?? []).map((c) => [c.date, c.is_done])));
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Her maddenin GERÇEK tarihine (item.date) göre kurulmuş harita — her
  // tarih kendi haftasının gerçek konusunu gösterir (bkz. dosya başı notu).
  const itemsByDate = useMemo(() => {
    const map: Record<string, DisplayItem[]> = {};
    for (const w of roadmapWeeks) {
      for (const it of w.schedule_items) {
        if (!it.date) continue;
        (map[it.date] ??= []).push({
          key: `${w.id}-${it.date}-${it.time_slot}-${it.activity_key ?? it.activity}`,
          time_slot: it.time_slot,
          activity: it.activity,
          link_url: it.link_url,
          related_topics: it.related_topics,
          topic_number: it.topic_number,
        });
      }
    }
    for (const d of Object.keys(map)) map[d].sort((a, b) => a.time_slot.localeCompare(b.time_slot));
    return map;
  }, [roadmapWeeks]);

  const roadmapRange = useMemo(() => {
    if (roadmapWeeks.length === 0) return null;
    return { start: roadmapWeeks[0].start_date, end: roadmapWeeks[roadmapWeeks.length - 1].end_date };
  }, [roadmapWeeks]);

  // Geriye dönük uyumluluk: roadmap tarih aralığının DIŞINDaki günler için
  // (ör. henüz 20 haftalık program oluşturulmamışsa) eski haftalık-tekrarlı
  // study_schedule mantığına düş.
  const itemsByDow = useMemo(() => {
    const map: Record<number, DisplayItem[]> = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
    for (const it of items) {
      if (!it.is_active) continue;
      (map[it.day_of_week] ??= []).push({
        key: it.id,
        time_slot: it.time_slot,
        activity: it.activity,
        link_url: it.resolved_link_url || it.link_url,
        related_topics: it.related_topics,
        topic_number: it.topic_number,
      });
    }
    for (const dow of Object.keys(map)) {
      map[Number(dow)].sort((a, b) => a.time_slot.localeCompare(b.time_slot));
    }
    return map;
  }, [items]);

  function itemsForDate(d: Date): DisplayItem[] {
    const iso = isoOf(d);
    if (roadmapRange && iso >= roadmapRange.start && iso <= roadmapRange.end) {
      return itemsByDate[iso] ?? [];
    }
    return itemsByDow[d.getDay()] ?? [];
  }

  const todayIso = isoOf(new Date());

  function statusForDate(d: Date): DayStatus {
    const iso = isoOf(d);
    const dayItems = itemsForDate(d);
    if (dayItems.length === 0) return 'none';
    if (completions[iso]) return 'done';
    return iso < todayIso ? 'missed' : 'scheduled';
  }

  async function toggleDone(d: Date, done: boolean) {
    const iso = isoOf(d);
    setSavingCompletion(true);
    setCompletions((prev) => ({ ...prev, [iso]: done }));
    try {
      await scheduleApi.setDayCompletion(iso, done);
    } catch {
      // Hata olursa optimistik güncellemeyi geri al.
      setCompletions((prev) => ({ ...prev, [iso]: !done }));
    } finally {
      setSavingCompletion(false);
    }
  }

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

      {/* Renk lejandı */}
      <div className="flex items-center gap-3 flex-wrap mb-3">
        {(['done', 'scheduled', 'missed', 'none'] as DayStatus[]).map((s) => (
          <div key={s} className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-sm ${STATUS_STYLES[s].dot}`} />
            <span className="text-[11px] text-gray-500 dark:text-slate-400">{STATUS_LABEL[s]}</span>
          </div>
        ))}
      </div>

      {mode === 'week' && <WeekGrid anchor={anchor} statusForDate={statusForDate} itemCountForDate={(d) => itemsForDate(d).length} today={today} onPickDate={setSelectedDate} />}
      {mode === 'month' && <MonthGrid anchor={anchor} statusForDate={statusForDate} today={today} onPickDate={setSelectedDate} />}
      {mode === 'year' && <YearGrid anchor={anchor} statusForDate={statusForDate} today={today} onPickMonth={(d) => { setAnchor(d); setMode('month'); }} />}

      {selectedDate && (
        <DayDetailPanel
          date={selectedDate}
          items={itemsForDate(selectedDate)}
          status={statusForDate(selectedDate)}
          isDone={!!completions[isoOf(selectedDate)]}
          saving={savingCompletion}
          onToggleDone={(done) => toggleDone(selectedDate, done)}
          onClose={() => setSelectedDate(null)}
        />
      )}
    </div>
  );
}

function DayDetailPanel({
  date, items, status, isDone, saving, onToggleDone, onClose,
}: {
  date: Date;
  items: DisplayItem[];
  status: DayStatus;
  isDone: boolean;
  saving: boolean;
  onToggleDone: (done: boolean) => void;
  onClose: () => void;
}) {
  const style = STATUS_STYLES[status];
  return (
    <div className="mt-3 bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-4">
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <p className="text-sm font-bold text-gray-900 dark:text-slate-100">
            {date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' })}
          </p>
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${style.bg} ${style.text}`}>{STATUS_LABEL[status]}</span>
        </div>
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-400">
          <X className="w-4 h-4" />
        </button>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-gray-400 dark:text-slate-500">Bu gün için planlanmış bir etkinlik yok.</p>
      ) : (
        <>
          <div className="flex flex-col gap-1.5">
            {items.map((it) => (
              <div key={it.key} className="rounded-lg py-1.5 px-2 hover:bg-gray-50 dark:hover:bg-slate-800">
                <a
                  href={it.link_url || undefined}
                  target={it.link_url ? '_blank' : undefined}
                  rel="noreferrer"
                  className="flex items-center gap-2 text-sm"
                >
                  <Clock className="w-3.5 h-3.5 shrink-0 text-gray-400" />
                  <span className="text-xs font-mono text-gray-400 dark:text-slate-500 shrink-0">{it.time_slot}</span>
                  <span className="text-gray-700 dark:text-slate-300 truncate">
                    {it.topic_number ? `${it.topic_number}. ` : ''}
                    {it.activity}
                  </span>
                  {it.link_url && <ExternalLink className="w-3 h-3 shrink-0 text-gray-300" />}
                </a>
                {it.related_topics && it.related_topics.length > 0 && (
                  <div className="mt-1 ml-6">
                    {/* 16 Ekim 2026, kullanıcı isteği -- bunların sadece
                        referans değil, bu haftanın GERÇEK ek konuları
                        olduğu açıkça belirtiliyor (bkz. kullanıcı sorusu:
                        "tek konu mu, yoksa diğerlerine de mi?"). */}
                    <p className="text-[10px] font-semibold text-gray-400 dark:text-slate-500 mb-1">
                      Bu hafta bunları da çalışmalısın:
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {it.related_topics.map((rt) => (
                        <a
                          key={rt.slug}
                          href={rt.link_url}
                          className="text-[11px] px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400 hover:bg-[#E6F1FB] hover:text-[#185FA5] transition-colors truncate max-w-full"
                          title={rt.title}
                        >
                          {rt.topic_number ? `${rt.topic_number}. ` : ''}
                          {rt.title}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* 15 Ekim 2026 kullanıcı isteği — "yapıldı seçeneği olsun" */}
          <button
            onClick={() => onToggleDone(!isDone)}
            disabled={saving}
            className={`mt-3 w-full flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 ${
              isDone ? 'bg-[#E1F5EE] text-[#0F6E56] hover:bg-[#cdeee2]' : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-200 hover:dark:bg-slate-700'
            }`}
          >
            <Check className="w-4 h-4" />
            {isDone ? 'Yapıldı olarak işaretlendi' : 'Yapıldı olarak işaretle'}
          </button>

          {/* 15 Ekim 2026 kullanıcı isteği — Yapıldı işaretlenen gün için
              Çalışma Notlarım'a (Gemini/NotebookLM özet) hızlı geçiş. */}
          {isDone && (
            <Link
              href={`/study-notes/${isoOf(date)}`}
              className="mt-2 w-full flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold text-gray-500 dark:text-slate-400 hover:text-[#378ADD] hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
            >
              <NotebookPen className="w-3.5 h-3.5" />
              Çalışma Notlarım&apos;da Aç
            </Link>
          )}
        </>
      )}
    </div>
  );
}

function StatusCell({
  isToday, status, children, onClick, className = '', style,
}: {
  isToday: boolean;
  status: DayStatus;
  children: React.ReactNode;
  onClick: () => void;
  className?: string;
  style?: React.CSSProperties;
}) {
  const s = STATUS_STYLES[status];
  return (
    <button
      onClick={onClick}
      style={style}
      className={`rounded-lg border transition-colors ${s.bg} ${isToday ? 'ring-2 ring-[#378ADD] border-[#378ADD]' : 'border-transparent hover:opacity-80'} ${className}`}
    >
      {children}
    </button>
  );
}

function WeekGrid({
  anchor, statusForDate, itemCountForDate, today, onPickDate,
}: {
  anchor: Date;
  statusForDate: (d: Date) => DayStatus;
  itemCountForDate: (d: Date) => number;
  today: Date;
  onPickDate: (d: Date) => void;
}) {
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
          const status = statusForDate(d);
          const isToday = sameDay(d, today);
          const count = itemCountForDate(d);
          const s = STATUS_STYLES[status];
          return (
            <StatusCell key={d.toISOString()} isToday={isToday} status={status} onClick={() => onPickDate(d)} className="flex flex-col items-start gap-1 p-2 text-left" style={{ minHeight: 86 }}>
              <span className={`text-[10px] font-semibold ${s.text}`}>{WEEKDAY_SHORT_TR[dow]}</span>
              <span className="text-sm font-bold text-gray-900 dark:text-slate-100">{d.getDate()}</span>
              <span className={`text-[10px] ${s.text}`}>{count > 0 ? `${count} madde` : ''}</span>
            </StatusCell>
          );
        })}
      </div>
    </div>
  );
}

function MonthGrid({
  anchor, statusForDate, today, onPickDate,
}: {
  anchor: Date;
  statusForDate: (d: Date) => DayStatus;
  today: Date;
  onPickDate: (d: Date) => void;
}) {
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
          const status = statusForDate(d);
          const isToday = sameDay(d, today);
          return (
            <StatusCell
              key={d.toISOString()}
              isToday={isToday}
              status={status}
              onClick={() => onPickDate(d)}
              className={`flex items-center justify-center ${inMonth ? '' : 'opacity-30'}`}
              style={{ minHeight: 44 }}
            >
              <span className={`text-xs font-semibold ${STATUS_STYLES[status].text}`}>{d.getDate()}</span>
            </StatusCell>
          );
        })}
      </div>
    </div>
  );
}

function YearGrid({
  anchor, statusForDate, today, onPickMonth,
}: {
  anchor: Date;
  statusForDate: (d: Date) => DayStatus;
  today: Date;
  onPickMonth: (d: Date) => void;
}) {
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
                  const isToday = sameDay(d, today);
                  const status = statusForDate(d);
                  const s = STATUS_STYLES[status];
                  return (
                    <span
                      key={d.toISOString()}
                      className={`flex items-center justify-center rounded text-[8px] ${s.bg} ${s.text} ${!inMonth ? 'opacity-20' : ''} ${isToday ? 'ring-1 ring-[#378ADD]' : ''}`}
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
