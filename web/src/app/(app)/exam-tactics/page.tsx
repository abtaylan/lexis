'use client';

// app/(app)/exam-tactics/page.tsx — "Sınav Taktikleri", web.
// mobile/src/app/(app)/exam-tactics.tsx ile aynı desen: GET /exams/tactics'ten
// gelen satırlar ikiye ayrılır — topic_tag DOLU olanlar (gerçek bir gramer
// konusuna bağlı, başlığa tıklayınca YERİNDE açılır/kapanır, altındaki
// "Pratik Yap" butonuna basınca o konunun soru havuzuna götürür) ve
// topic_tag BOŞ olanlar (soru-TİPİNE ait genel strateji, "Genel Stratejiler"
// grubunda her zaman açık gösterilir, bkz. backend list_exam_tactics).
//
// 23 Kasım 2026 kullanıcı geri bildirimi ("başlıklara tıklayınca
// ayrıntıları görmeliyiz ... sarı renkli alan okunaklı olmuyor ... örnekler
// çok olmalı, taktikler isimlendirilmeli"): önceden konu bazlı taktiklere
// tıklayınca direkt pratik sayfasına gidiliyordu -- artık ortak
// ExamTacticCard bileşeniyle yerinde açılıp kapanıyor (literal sayfa
// numaralı "sayfalama" yerine akordeon -- sadece 25 taktik olduğu için bu
// daha kullanışlı) ve birden fazla örnek + okunaklı nötr metin rengiyle
// gösteriliyor.
import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Loader2, Sparkles } from 'lucide-react';
import { examsApi } from '@/lib/api';
import { useLocale, type Locale } from '@/lib/i18n';
import type { ExamTacticItem } from '@/types';
import { ExamTacticCard } from '@/components/ExamTacticCard';

const L: Partial<Record<Locale, Record<string, string>>> = {
  tr: {
    back: 'Geri',
    title: 'Sınav Taktikleri',
    subtitle: 'YDS/YÖKDİL sorularında çoğu zaman kelime veya gramer bilgisinden önce bir çözüm taktiği işe yarar.',
    generalGroupLabel: 'Genel Stratejiler',
    topicGroupLabel: 'Konu Bazlı Taktikler',
    topicLabel: 'Konu',
    badgeLabel: 'Taktik',
    examplesLabel: 'Örnekler',
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
    topicLabel: 'Topic',
    badgeLabel: 'Tactic',
    examplesLabel: 'Examples',
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
                  <ExamTacticCard
                    key={item.id}
                    collapsible
                    title={item.title_tr}
                    tactic={item.tactic_tr}
                    examples={item.examples_tr}
                    badgeLabel={t.badgeLabel}
                    examplesLabel={t.examplesLabel}
                  />
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
                  <ExamTacticCard
                    key={item.id}
                    collapsible
                    title={item.title_tr}
                    subtitle={item.related_grammar_topic ? `${t.topicLabel}: ${item.related_grammar_topic.title_tr}` : null}
                    tactic={item.tactic_tr}
                    examples={item.examples_tr}
                    badgeLabel={t.badgeLabel}
                    examplesLabel={t.examplesLabel}
                    footer={
                      <button
                        onClick={() => openTopicPractice(item)}
                        className="w-full bg-[#378ADD] hover:bg-[#2d73c4] text-white rounded-xl py-2.5 text-sm font-medium transition-colors"
                      >
                        {t.practiceBtn}
                      </button>
                    }
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
