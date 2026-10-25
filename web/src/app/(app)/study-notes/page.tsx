'use client';

// app/(app)/study-notes/page.tsx — "Çalışma Notlarım" sayfası (15 Ekim 2026
// kullanıcı isteği): Takvimde bir gün "Yapıldı" olarak işaretlenince burada
// o günün tarihiyle bir kart oluşur. Karta girince o günün konuları
// listelenir (bkz. study-notes/[date]/page.tsx'teki TopicSwitcher), bir
// konuya tıklanınca da o konu için Gemini/NotebookLM talimatları ve
// kullanıcının yapıştırdığı özetler açılır (aynı sayfada, TopicSwitcher
// altında).
//
// GÜNCELLEME (25 Ekim 2026, kullanıcı isteği): her gün kartı kendi tüm
// konu başlıklarını (ana + "+N konu" yerine tek tek yazılan ilgili
// konular) tek tek burada, liste sayfasında gösteriyordu — "Yapıldı"
// işaretlenen gün sayısı arttıkça bu sayfa hızla çok kalabalık/uzun hale
// geliyordu. Artık her gün kartı sadece tarih + kaç konu çalışıldığı
// (sayı) + hangi kaynaklardan not girildiği gösteriyor; konu başlıklarının
// kendisi artık SADECE güne tıklayınca açılan [date] sayfasındaki
// TopicSwitcher'da görünüyor (zaten o sayfa "konuya tıkla → o konunun not
// giriş ekranı açılsın" akışını karşılıyor).
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CalendarX2, ChevronRight, Loader2 } from 'lucide-react';
import { studyNotesApi } from '@/lib/api';
import type { StudyDaySummary, StudyNoteSource } from '@/types';
import { getErrorMessage } from '@/lib/errors';

const SOURCE_LABEL: Record<StudyNoteSource, string> = {
  gemini: 'Gemini',
  notebooklm: 'NotebookLM',
  manual: 'Manuel',
};

function formatDateTr(dateIso: string): string {
  const [y, m, d] = dateIso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' });
}

export default function StudyNotesPage() {
  const [days, setDays] = useState<StudyDaySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    studyNotesApi
      .listDays()
      .then(setDays)
      .catch((e) => setError(getErrorMessage(e, 'Çalışma notları yüklenemedi.')))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Çalışma Notlarım</h1>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5 max-w-2xl">
          Takvimde &quot;Yapıldı&quot; olarak işaretlediğin her gün burada listelenir. Bir güne tıklayınca o gün
          çalıştığın konular listelenir; bir konuya tıklayınca da Gemini/NotebookLM talimatlarını kullanıp aldığın
          özetleri kaydettiğin ekran açılır.
        </p>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-gray-400 dark:text-slate-500">
          <Loader2 className="w-4 h-4 animate-spin" /> Yükleniyor...
        </div>
      )}

      {!loading && error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {!loading && !error && days.length === 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-8 text-center">
          <CalendarX2 className="w-8 h-8 text-gray-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-sm text-gray-500 dark:text-slate-400">
            Henüz &quot;Yapıldı&quot; olarak işaretlenmiş bir gün yok.
          </p>
          <Link
            href="/schedule"
            className="inline-block mt-3 text-sm font-semibold text-[#378ADD] hover:underline"
          >
            Çalışma Programı&apos;na git →
          </Link>
        </div>
      )}

      {!loading && !error && days.length > 0 && (
        <div className="flex flex-col gap-2">
          {days.map((day) => {
            // Ana konu her zaman bir satır sayılır (topic_title boşsa bile
            // activities[0]/"Genel Çalışma Programı" ile aynı satırda
            // gösteriliyordu) + ona bağlı ilgili konular.
            const topicCount = 1 + (day.related_topics?.length ?? 0);
            return (
              <Link
                key={day.date}
                href={`/study-notes/${day.date}`}
                className="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm px-4 py-3 hover:border-[#378ADD]/40 transition-colors flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-bold text-gray-900 dark:text-slate-100 truncate">
                    {formatDateTr(day.date)}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                    {topicCount} konu çalışıldı
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {day.note_sources.length > 0 && (
                    <div className="hidden sm:flex items-center gap-1.5">
                      {day.note_sources.map((s) => (
                        <span
                          key={s}
                          className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[#E1F5EE] text-[#0F6E56]"
                        >
                          {SOURCE_LABEL[s] || s} ✓
                        </span>
                      ))}
                    </div>
                  )}
                  <ChevronRight className="w-4 h-4 text-gray-300 dark:text-slate-600" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}