'use client';

// app/(app)/exam-tactics/page.tsx — "Sınav Taktikleri", web.
// mobile/src/app/(app)/exam-tactics.tsx ile aynı desen: GET /exams/tactics'ten
// gelen satırlar ikiye ayrılır — topic_tag DOLU olanlar (gerçek bir gramer
// konusuna bağlı, dokununca o konunun soru havuzuyla pratiğe götürür) ve
// topic_tag BOŞ olanlar (soru-TİPİNE ait genel strateji, "Genel Stratejiler"
// grubunda salt okunur gösterilir, bkz. backend list_exam_tactics).
import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ChevronRight, Lightbulb, Loader2, Sparkles } from 'lucide-react';
import { examsApi } from '@/lib/api';
import { useLocale, type Locale } from '@/lib/i18n';
import type { ExamTacticItem } from '@/types';

const L: Partial<Record<Locale, Record<string, string>>> = {
  tr: {
    back: 'Geri',
    title: 'Sınav Taktikleri',
    subtitle: 'YDS/YÖKDİL sorularında çoğu zaman kelime veya gramer bilgisinden önce bir çözüm taktiği işe yarar.',
    generalGroupLabel: 'Genel Stratejiler',
    topicGroupLabel: 'Konu Bazlı Taktikler',
    exampleLabel: 'Örnek',
    practiceBtn: 'Bu Konudan Pratik Yap',
    loading: 'Yükleniyor…',
    error: 'Bir şeyler ters gitti, tekrar dene.',
    empty: 'Henüz taktik eklenmedi.',
  },
  en: {
    back: 'Back',
    title: 'Exam Tactics',
    subtitle: 'On YDS/YÖKDİL questions, a solving tactic is often more useful than vocabulary or grammar knowledge alone.',
    generalGroupLabel: 'General Strategies',
    topicGroupLabel: 'Topic-Based Tactics',
    exampleLabel: 'Example',
    practiceBtn: 'Practice This Topic',
    loading: 'Loading…',
    error: 'Something went wrong, please try again.',
    empty: 'No tactics added yet.',
  },
};

export default function ExamTacticsPage() {
  const router = useRouter();
  const { locale } = useLocale();
  const t = L[locale] ?? L.tr!;

  const { data, isLoading, isError } = useQuery({
    queryKey: ['exam-tactics'],
    queryFn: examsApi.listTactics,
  });

  const generalTactics = useMemo(() => (data ?? []).filter((item) => !item.topic_tag), [data]);
  const topicTactics = useMemo(() => (data ?? []).filter((item) => !!item.topic_tag), [data]);

  function openTopicPractice(item: ExamTacticItem) {
    if (!item.topic_tag) return;
    router.push(`/exam-topic-practice?topic_tag=${encodeURIComponent(item.topic_tag)}&limit=8`);
  }

  return (
    <div className="p-6 max-w-xl mx-auto">
      <button
        onClick={() => router.push('/exam-prep')}
        className="flex items-center gap-1.5 text-sm font-semibold text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        {t.back}
      </button>

      <div className="flex items-center gap-2 mb-1">
        <div className="w-8 h-8 rounded-xl bg-[#FAEEDA] flex items-center justify-center">
          <Sparkles className="w-4 h-4" style={{ color: '#854F0B' }} />
        </div>
        <h1 className="text-lg font-bold text-gray-900 dark:text-slate-100">{t.title}</h1>
      </div>
      <p className="text-sm text-gray-500 dark:text-slate-400 mt-2 leading-relaxed">{t.subtitle}</p>

      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-gray-400 dark:text-slate-500">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : isError ? (
        <p className="text-sm text-red-600 dark:text-red-400 mt-6">{t.error}</p>
      ) : (data?.length ?? 0) === 0 ? (
        <p className="text-sm text-gray-400 dark:text-slate-500 mt-6">{t.empty}</p>
      ) : (
        <div className="mt-6 flex flex-col gap-6">
          {generalTactics.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-gray-400 dark:text-slate-500 mb-3">
                {t.generalGroupLabel}
              </p>
              <div className="flex flex-col gap-3">
                {generalTactics.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-transparent p-4"
                    style={{ backgroundColor: '#FAEEDA' }}
                  >
                    <div className="flex items-center gap-1.5">
                      <Lightbulb className="w-4 h-4" style={{ color: '#854F0B' }} />
                      <span className="text-sm font-bold" style={{ color: '#854F0B' }}>
                        {item.title_tr}
                      </span>
                    </div>
                    <p className="text-sm mt-1.5 leading-relaxed" style={{ color: '#854F0B' }}>
                      {item.tactic_tr}
                    </p>
                    {item.worked_example_tr && (
                      <p className="text-xs italic mt-2 leading-relaxed" style={{ color: '#854F0B' }}>
                        {t.exampleLabel}: {item.worked_example_tr}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {topicTactics.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-gray-400 dark:text-slate-500 mb-3">
                {t.topicGroupLabel}
              </p>
              <div className="flex flex-col gap-3">
                {topicTactics.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => openTopicPractice(item)}
                    className="w-full text-left bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-4 transition-all hover:border-gray-200 dark:hover:border-slate-700 hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-gray-900 dark:text-slate-100">
                          {item.related_grammar_topic?.title_tr ?? item.title_tr}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                          {item.tactic_tr}
                        </p>
                        {item.worked_example_tr && (
                          <p className="text-xs italic text-gray-400 dark:text-slate-500 mt-2 leading-relaxed">
                            {t.exampleLabel}: {item.worked_example_tr}
                          </p>
                        )}
                        <span
                          className="inline-flex items-center gap-1 text-xs font-bold mt-3"
                          style={{ color: '#378ADD' }}
                        >
                          {t.practiceBtn}
                          <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
