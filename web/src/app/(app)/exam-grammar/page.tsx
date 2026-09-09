'use client';

// app/(app)/exam-grammar/page.tsx — Sınav Hazırlık: Gramer Rehberi liste sayfası, web.
// mobile/src/app/(app)/exam-grammar.tsx ile aynı desen ve aynı backend uçları
// (bkz. backend/app/api/routes/grammar.py). exam-prep/page.tsx'in select-type
// aşamasındaki "Gramer Rehberi" linkinden açılır.
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ChevronRight, Loader2 } from 'lucide-react';
import { grammarApi } from '@/lib/api';
import { useLocale, type Locale } from '@/lib/i18n';
import type { GrammarCategory, GrammarTopicSummary } from '@/types';

// Merkezi lib/i18n.tsx sözlüğüne dokunmadan yerel çeviri — exam-prep/page.tsx
// ve u/[username]/page.tsx'teki desenle aynı yaklaşım.
const L: Partial<Record<Locale, Record<string, string>>> = {
  tr: {
    back: 'Geri',
    title: 'Gramer Rehberi',
    subtitle: 'YDS/YÖKDİL sınavlarında en sık çıkan konular — kural, örnek ve Türkçe konuşanlara özgü hatalar.',
    emptyState: 'Bu kategoride henüz konu yok.',
    loading: 'Yükleniyor…',
  },
  en: {
    back: 'Back',
    title: 'Grammar Guide',
    subtitle: 'The most common topics in YDS/YÖKDİL exams — rules, examples, and mistakes specific to Turkish speakers.',
    emptyState: 'No topics in this category yet.',
    loading: 'Loading…',
  },
};

export default function ExamGrammarPage() {
  const router = useRouter();
  const { locale } = useLocale();
  const t = L[locale] ?? L.tr!;

  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ['grammar-categories'],
    queryFn: grammarApi.listCategories,
  });
  const { data: topics, isLoading: topicsLoading } = useQuery({
    queryKey: ['grammar-topics'],
    queryFn: grammarApi.listTopics,
  });

  const loading = categoriesLoading || topicsLoading;

  const topicsByCategory: Record<string, GrammarTopicSummary[]> = {};
  (topics ?? []).forEach((topic) => {
    if (!topicsByCategory[topic.category_id]) topicsByCategory[topic.category_id] = [];
    topicsByCategory[topic.category_id].push(topic);
  });

  const orderedCategories: GrammarCategory[] = [...(categories ?? [])].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="p-6 max-w-xl mx-auto">
      <button
        onClick={() => router.push('/exam-prep')}
        className="flex items-center gap-1.5 text-sm font-semibold text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        {t.back}
      </button>

      <h1 className="text-lg font-bold text-gray-900 dark:text-slate-100">{t.title}</h1>
      <p className="text-sm text-gray-500 dark:text-slate-400 mt-2 leading-relaxed">{t.subtitle}</p>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-400 dark:text-slate-500">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-6">
          {orderedCategories.map((category) => {
            const categoryTopics = (topicsByCategory[category.id] ?? []).sort((a, b) => a.sort_order - b.sort_order);
            return (
              <div key={category.id}>
                <p className="text-xs font-bold uppercase tracking-wide text-gray-400 dark:text-slate-500 mb-2">
                  {category.name_tr}
                </p>
                {categoryTopics.length === 0 ? (
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-4">
                    <p className="text-sm text-gray-400 dark:text-slate-500">{t.emptyState}</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {categoryTopics.map((topic) => (
                      <Link
                        key={topic.id}
                        href={`/exam-grammar/${topic.slug}`}
                        className="w-full flex items-center justify-between gap-3 bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-4 transition-all hover:border-gray-200 dark:hover:border-slate-700 hover:shadow-md"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-gray-900 dark:text-slate-100">{topic.title_tr}</p>
                          <p className="text-sm text-gray-400 dark:text-slate-500 mt-0.5 truncate">{topic.summary_tr}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 shrink-0 text-gray-300 dark:text-slate-600" />
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
