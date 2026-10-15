'use client';

// app/(app)/roadmap/page.tsx — Canlı "Program Haritası" (15 Ekim 2026 kullanıcı isteği):
// "uygulama içinde tüm 20 haftayı kaydırarak gezebileceğin canlı bir ekran olması
// gerekiyor... bundan dolayı canlı ortamda 20 haftayı da görmeliyim." PDF/Excel/Word
// dışa aktarımların yanında, backend study_roadmap_weeks tablosundan (bkz.
// GET /schedule/roadmap) 20 haftanın tamamını çeken, kaydırılabilir, güncel haftayı
// otomatik vurgulayan bir ekran. Her hafta tek bir gramer konusuna odaklanır (Gramer
// Rehberi'nin gerçek sırasına göre) — Faz 3 haftalarında ise sabit bir tekrar/deneme
// yapısı gösterilir (focus_note).
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Loader2, MapPin, ChevronDown, ChevronUp, Calendar, Clock,
  ExternalLink, Sparkles, RefreshCw, ArrowLeft,
} from 'lucide-react';
import { scheduleApi } from '@/lib/api';
import { getErrorMessage } from '@/lib/errors';
import type { RoadmapWeek } from '@/types';

const PHASE_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  'Faz 1': { bg: 'bg-[#E6F1FB]', text: 'text-[#185FA5]', dot: 'bg-[#185FA5]' },
  'Faz 2': { bg: 'bg-[#EEEDFE]', text: 'text-[#534AB7]', dot: 'bg-[#534AB7]' },
  'Faz 3': { bg: 'bg-[#FDEEEA]', text: 'text-[#9A3412]', dot: 'bg-[#9A3412]' },
};

const LEVEL_LABELS: Record<string, string> = { a2: 'A2', b1: 'B1', b2: 'B2', c1: 'C1' };

function fmtDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
}

function fmtRange(start: string, end: string): string {
  const s = new Date(start + 'T00:00:00');
  const e = new Date(end + 'T00:00:00');
  const sameMonth = s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear();
  if (sameMonth) {
    return `${s.getDate()}-${e.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}`;
  }
  return `${s.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })} - ${e.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}`;
}

// 15 Ekim 2026 kullanıcı geri bildirimi -- "burada günler karışmış, 15 ekim
// perşembe günü olması lazım": eski kod start_date'in HER ZAMAN Pazartesi
// olduğunu varsayıyordu (DAY_OFFSET_FROM_MONDAY) ve .toISOString() ile saat
// dilimi kayması (yerel gece yarısı -> UTC'de bir önceki gün) yaşıyordu. Artık
// backend her maddeye gerçek bir "date" alanı ekliyor (bkz. study_roadmap_weeks
// güncelleme script'i); burada sadece o tarihi okuyup GERÇEK takvim gününün
// adını hesaplıyoruz -- day_of_week integer'ı artık yalnızca "haftanın
// kaçıncı maddesi" anlamına geliyor, gerçek haftanın günüyle karıştırılmamalı.
const WEEKDAY_NAMES_TR = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

function realWeekdayLabel(dateIso: string): string {
  // new Date(iso+'T00:00:00') yerel saat olarak ayrıştırılır; .getDay() de
  // yerel takvime göre çalışır, böylece .toISOString() kaynaklı saat dilimi
  // kayması oluşmaz.
  const d = new Date(dateIso + 'T00:00:00');
  return WEEKDAY_NAMES_TR[d.getDay()];
}

function WeekCard({
  week,
  isCurrent,
  expanded,
  onToggle,
  todayIso,
}: {
  week: RoadmapWeek;
  isCurrent: boolean;
  expanded: boolean;
  onToggle: () => void;
  todayIso: string;
}) {
  const colors = PHASE_COLORS[week.phase_label] ?? PHASE_COLORS['Faz 1'];
  const grouped = useMemo(() => {
    // Artık day_of_week'e göre değil, maddenin GERÇEK tarihine (item.date)
    // göre grupluyoruz -- date alanı yoksa (eski/önbelleklenmiş veri), geriye
    // dönük uyumluluk için start_date'i kullanıyoruz.
    const byDate: Record<string, typeof week.schedule_items> = {};
    for (const item of week.schedule_items) {
      const d = item.date ?? week.start_date;
      (byDate[d] ??= []).push(item);
    }
    return Object.keys(byDate)
      .sort()
      .map((date) => ({
        date,
        items: byDate[date].sort((a, b) => a.time_slot.localeCompare(b.time_slot)),
      }))
      .filter((g) => g.items.length > 0);
  }, [week]);

  return (
    <div
      id={`roadmap-week-${week.week_number}`}
      className={`bg-white dark:bg-slate-900 rounded-2xl border shadow-sm overflow-hidden transition-colors ${
        isCurrent ? 'border-[#378ADD] ring-2 ring-[#378ADD]/30' : 'border-gray-100 dark:border-slate-800'
      }`}
    >
      <button onClick={onToggle} className="w-full flex items-center justify-between gap-3 p-4 text-left">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${colors.bg}`}>
            <span className={`text-sm font-bold ${colors.text}`}>{week.week_number}</span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${colors.bg} ${colors.text}`}>{week.phase_label}</span>
              {isCurrent && (
                <span className="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#E1F5EE] text-[#0F6E56]">
                  <MapPin className="w-3 h-3" />Şu Anki Hafta
                </span>
              )}
              {week.level && (
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400">
                  {LEVEL_LABELS[week.level] ?? week.level.toUpperCase()}
                </span>
              )}
            </div>
            <p className="text-sm font-semibold text-gray-900 dark:text-slate-100 mt-1 truncate">
              {week.topic_title_tr ?? week.focus_note ?? `Hafta ${week.week_number}`}
            </p>
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{fmtRange(week.start_date, week.end_date)}</p>
          </div>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />}
      </button>

      {expanded && (
        <div className="border-t border-gray-100 dark:border-slate-800 p-4 pt-3 space-y-3">
          {grouped.map(({ date, items }) => {
            const isToday = date === todayIso;
            return (
              <div key={date} className={`rounded-xl p-3 ${isToday ? 'bg-[#FEF9E7] ring-1 ring-[#D4A017]/40' : 'bg-gray-50 dark:bg-slate-800/60'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-xs font-semibold text-gray-700 dark:text-slate-300">{realWeekdayLabel(date)}</span>
                  <span className="text-xs text-gray-400 dark:text-slate-500">{fmtDate(date)}</span>
                  {isToday && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[#D4A017] text-white">Bugün</span>}
                </div>
                <div className="space-y-1.5">
                  {items.map((it, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-gray-600 dark:text-slate-400">
                      <Clock className="w-3 h-3 shrink-0 text-gray-300" />
                      <span className="shrink-0 font-medium text-gray-500 dark:text-slate-500">{it.time_slot}</span>
                      {it.link_url ? (
                        <Link href={it.link_url} className="flex items-center gap-1 text-[#378ADD] hover:underline truncate">
                          {it.activity}<ExternalLink className="w-3 h-3 shrink-0" />
                        </Link>
                      ) : (
                        <span className="truncate">{it.activity}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function RoadmapPage() {
  const [weeks, setWeeks] = useState<RoadmapWeek[]>([]);
  const [todayIso, setTodayIso] = useState('');
  const [currentWeekNumber, setCurrentWeekNumber] = useState<number | null>(null);
  const [expandedWeek, setExpandedWeek] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const scrolledRef = useRef(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await scheduleApi.getRoadmap();
      setWeeks(res.weeks);
      setTodayIso(res.today);
      setCurrentWeekNumber(res.current_week_number);
      setExpandedWeek((prev) => prev ?? res.current_week_number);
    } catch (e) {
      // 15 Ekim 2026 kullanıcı geri bildirimi: backend 405/500 gibi genel
      // HTTP-protokol hatalarında FastAPI'nin ham İngilizce "detail" metnini
      // ("Method Not Allowed" vb.) kullanıcıya göstermek yanıltıcıydı — bu
      // tür durumlarda her zaman Türkçe genel mesajı gösteriyoruz; sadece
      // kendi ürettiğimiz 400/404/422 Türkçe doğrulama mesajları olduğunda
      // backend'in detail alanı aynen gösteriliyor.
      const status = (e as { response?: { status?: number } })?.response?.status;
      if (status === 405 || status === undefined || status >= 500) {
        setError('Program haritası şu anda yüklenemedi. Lütfen birkaç dakika sonra tekrar deneyin.');
      } else {
        setError(getErrorMessage(e, 'Program haritası yüklenemedi.'));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (scrolledRef.current || loading || currentWeekNumber == null) return;
    const el = document.getElementById(`roadmap-week-${currentWeekNumber}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      scrolledRef.current = true;
    }
  }, [loading, currentWeekNumber]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <Link href="/schedule" className="inline-flex items-center gap-1.5 text-xs text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 mb-1">
            <ArrowLeft className="w-3.5 h-3.5" />Programa Dön
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Program Haritası</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
            20 haftalık YÖKDİL hazırlık programının tamamı — Gramer Rehberi'nin sırasına göre, her hafta tek bir konu.
          </p>
        </div>
        <button onClick={load} disabled={loading} className="flex items-center gap-2 bg-[#EEEDFE] hover:bg-[#e0ddfc] text-[#534AB7] rounded-xl px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />Yenile
        </button>
      </div>

      {loading ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-12 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-gray-400 dark:text-slate-500"><Loader2 className="w-6 h-6 animate-spin" /><span className="text-sm">Yükleniyor…</span></div>
        </div>
      ) : error ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-8 text-center text-sm text-red-500">{error}</div>
      ) : weeks.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-12 flex flex-col items-center justify-center gap-3 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#EEEDFE] flex items-center justify-center"><Sparkles className="w-7 h-7 text-[#534AB7]" /></div>
          <p className="text-sm font-medium text-gray-700 dark:text-slate-300">Henüz bir yol haritan yok.</p>
          <p className="text-xs text-gray-400 dark:text-slate-500 max-w-xs">Programını oluşturduğunda 20 haftalık yol haritan burada görünecek.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {weeks.map((week) => (
            <WeekCard
              key={week.id}
              week={week}
              isCurrent={week.week_number === currentWeekNumber}
              expanded={expandedWeek === week.week_number}
              onToggle={() => setExpandedWeek((prev) => (prev === week.week_number ? null : week.week_number))}
              todayIso={todayIso}
            />
          ))}
        </div>
      )}
    </div>
  );
}
