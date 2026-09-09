'use client';

// app/(app)/exam-grammar/[slug]/page.tsx — Sınav Hazırlık: Gramer Rehberi konu
// detay sayfası, web. mobile/src/app/(app)/exam-grammar-detail.tsx ile aynı
// desen. Dinamik segment için useParams() kullanılıyor (bkz. u/[username]/page.tsx
// ve messages/[username]/page.tsx'teki aynı yaklaşım).
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { grammarApi } from '@/lib/api';
import { useLocale, type Locale } from '@/lib/i18n';

const L: Partial<Record<Locale, Record<string, string>>> = {
  tr: {
    back: 'Geri',
    error: 'Bir şeyler ters gitti, tekrar dene.',
    examplesTitle: 'Örnekler',
    mistakesTitle: 'Sık Yapılan Hatalar',
    practiceCta: 'Bu Konuyu Pratik Et',
    noQuestionsYet: 'Bu konu için henüz pratik sorusu eklenmedi.',
  },
  en: {
    back: 'Back',
    error: 'Something went wrong, please try again.',
    examplesTitle: 'Examples',
    mistakesTitle: 'Common Mistakes',
    practiceCta: 'Practice This Topic',
    noQuestionsYet: 'No practice questions for this topic yet.',
  },
};

export default function ExamGrammarDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = typeof params?.slug === 'string' ? params.slug : '';
  const router = useRouter();
  const { locale } = useLocale();
  const t = L[locale] ?? L.tr!;

  const { data: topic, isLoading, isError } = useQuery({
    queryKey: ['grammar-topic', slug],
    queryFn: () => grammarApi.getTopic(slug),
    enabled: !!slug,
  });

  const paragraphs = (topic?.rule_content_md ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  return (
    <div className="p-6 max-w-xl mx-auto">
      <button
        onClick={() => router.push('/exam-grammar')}
        className="flex items-center gap-1.5 text-sm font-semibold text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        {t.back}
      </button>

      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-gray-400 dark:text-slate-500">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : isError || !topic ? (
        <p className="text-sm text-red-600 dark:text-red-400">{t.error}</p>
      ) : (
        <div>
          <div className="flex flex-wrap items-center gap-2">
            {topic.exam_relevance.map((tag) => (
              <span key={tag} className="px-2.5 py-1 rounded-full text-xs font-bold" style={{ backgroundColor: '#E6F1FB', color: '#378ADD' }}>
                {tag.toUpperCase()}
              </span>
            ))}
            <span className="px-2.5 py-1 rounded-full text-xs font-bold" style={{ backgroundColor: '#EEEDFE', color: '#534AB7' }}>
              {topic.level.toUpperCase()}
            </span>
          </div>

          <h1 className="text-xl font-bold text-gray-900 dark:text-slate-100 mt-3">{topic.title_tr}</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1 leading-relaxed">{topic.summary_tr}</p>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-5 mt-5">
            {paragraphs.map((line, idx) => {
              const isBullet = line.startsWith('- ');
              return (
                <p
                  key={idx}
                  className={`text-sm text-gray-700 dark:text-slate-300 leading-relaxed ${idx === 0 ? '' : 'mt-2.5'} ${isBullet ? 'ml-4' : ''}`}
                >
                  {isBullet ? `•  ${line.slice(2)}` : line}
                </p>
              );
            })}
          </div>

          {topic.example_sentences.length > 0 && (
            <div className="mt-6">
              <h2 className="text-sm font-bold text-gray-900 dark:text-slate-100 mb-2.5">{t.examplesTitle}</h2>
              <div className="flex flex-col gap-2">
                {topic.example_sentences.map((example, idx) => (
                  <div key={idx} className="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 p-3.5">
                    <p className="text-sm text-gray-800 dark:text-slate-200">{example.en}</p>
                    {example.tr && <p className="text-sm text-gray-400 dark:text-slate-500 mt-0.5">{example.tr}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {topic.common_mistakes.length > 0 && (
            <div className="mt-6">
              <h2 className="text-sm font-bold text-gray-900 dark:text-slate-100 mb-2.5">{t.mistakesTitle}</h2>
              <div className="flex flex-col gap-2">
                {topic.common_mistakes.map((mistake, idx) => (
                  <div key={idx} className="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 p-3.5">
                    <div className="flex items-start gap-2">
                      <XCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
                      <p className="text-sm text-red-600 dark:text-red-400">{mistake.wrong}</p>
                    </div>
                    <div className="flex items-start gap-2 mt-1.5">
                      <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" style={{ color: '#3B6D11' }} />
                      <p className="text-sm" style={{ color: '#3B6D11' }}>{mistake.correct}</p>
                    </div>
                    <p className="text-xs text-gray-400 dark:text-slate-500 mt-1.5">{mistake.note}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-8 mb-4">
            {topic.has_practice_questions ? (
              <button
                onClick={() => router.push(`/exam-topic-practice?topic_tag=${encodeURIComponent(slug)}`)}
                className="w-full bg-[#378ADD] hover:bg-[#2d73c4] text-white rounded-xl py-3 text-sm font-medium transition-colors"
              >
                {t.practiceCta}
              </button>
            ) : (
              <p className="text-sm text-gray-400 dark:text-slate-500 text-center">{t.noQuestionsYet}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
