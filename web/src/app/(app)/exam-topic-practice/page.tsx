'use client';

// app/(app)/exam-topic-practice/page.tsx — Sınav Hazırlık İstatistik & İçerik
// Motoru madde #3b: "aynı konudan ekstra pratik soru önerisi", web.
// mobile/src/app/(app)/exam-topic-practice.tsx ile aynı desen: oturum açmaz,
// XP vermez, exam_attempts'e yazmaz — sadece az önce yanlış yapılan konuyu
// hızlıca pekiştirmek için. topic_tag ?topic_tag= query param'ından gelir
// (bkz. exam-prep/page.tsx'teki "Bu Konudan Pratik Yap" butonu ve
// exam-grammar/[slug]/page.tsx'teki "Bu Konuyu Pratik Et" CTA'sı).
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { examsApi } from '@/lib/api';
import { useLocale, type Locale } from '@/lib/i18n';
import type { ExamPracticeQuestionItem } from '@/types';

const L: Partial<Record<Locale, Record<string, string>>> = {
  tr: {
    back: 'Geri',
    error: 'Bir şeyler ters gitti, tekrar dene.',
    subtitle: 'Bu konudan birkaç soru daha — XP verilmez, sadece pekiştirme içindir.',
    noQuestionsYet: 'Bu konu için henüz pratik sorusu eklenmedi.',
    explanationLabel: 'Açıklama',
    questionCounterTpl: 'Soru {current} / {total}',
    nextBtn: 'Sonraki Soru',
    finishBtn: 'Bitir',
    doneTitle: 'Bu tur tamamlandı!',
    backToDashboardBtn: 'Panele Dön',
    defaultTitle: 'Konu Pratiği',
  },
  en: {
    back: 'Back',
    error: 'Something went wrong, please try again.',
    subtitle: 'A few more questions on this topic — no XP, just reinforcement.',
    noQuestionsYet: 'No practice questions for this topic yet.',
    explanationLabel: 'Explanation',
    questionCounterTpl: 'Question {current} / {total}',
    nextBtn: 'Next Question',
    finishBtn: 'Finish',
    doneTitle: 'Round complete!',
    backToDashboardBtn: 'Back to Dashboard',
    defaultTitle: 'Topic Practice',
  },
};

export default function ExamTopicPracticePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const topicTag = searchParams.get('topic_tag') ?? '';
  const excludeQuestionId = searchParams.get('exclude_question_id') ?? undefined;
  const { locale } = useLocale();
  const t = L[locale] ?? L.tr!;

  const { data, isLoading, isError } = useQuery({
    queryKey: ['exam-topic-practice', topicTag, excludeQuestionId],
    queryFn: () => examsApi.practiceQuestionsByTopic(topicTag, { excludeQuestionId, limit: 5 }),
    enabled: !!topicTag,
  });

  const [index, setIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- yeni soru seti geldiğinde ilerlemeyi sıfırlama (fetch-on-effect) deseni; dashboard/page.tsx'teki aynı yaklaşım
    setIndex(0);
    setSelectedOption(null);
    setRevealed(false);
  }, [data]);

  const questions: ExamPracticeQuestionItem[] = data?.questions ?? [];
  const current = questions[index];
  const done = questions.length > 0 && index >= questions.length;

  function handleSelect(optionId: string) {
    if (revealed) return;
    setSelectedOption(optionId);
    setRevealed(true);
  }

  function handleNext() {
    setSelectedOption(null);
    setRevealed(false);
    setIndex((i) => i + 1);
  }

  return (
    <div className="p-6 max-w-xl mx-auto">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-sm font-semibold text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        {t.back}
      </button>

      <h1 className="text-xl font-bold text-gray-900 dark:text-slate-100">
        {data?.related_grammar_topic?.title_tr ?? t.defaultTitle}
      </h1>
      <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">{t.subtitle}</p>

      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-gray-400 dark:text-slate-500">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : isError ? (
        <p className="text-sm text-red-600 dark:text-red-400 mt-6">{t.error}</p>
      ) : questions.length === 0 ? (
        <p className="text-sm text-gray-400 dark:text-slate-500 mt-6">{t.noQuestionsYet}</p>
      ) : done ? (
        <div className="mt-8 flex flex-col items-center bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm py-10">
          <CheckCircle2 className="w-9 h-9" style={{ color: '#3B6D11' }} />
          <p className="text-lg font-bold text-gray-900 dark:text-slate-100 mt-3">{t.doneTitle}</p>
          <button
            onClick={() => router.back()}
            className="mt-6 bg-[#378ADD] hover:bg-[#2d73c4] text-white rounded-xl py-2.5 px-6 text-sm font-medium transition-colors"
          >
            {t.backToDashboardBtn}
          </button>
        </div>
      ) : (
        <>
          <p className="text-sm font-semibold text-gray-500 dark:text-slate-400 mt-6">
            {t.questionCounterTpl.replace('{current}', String(index + 1)).replace('{total}', String(questions.length))}
          </p>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-5 mt-2">
            <p className="text-sm text-gray-800 dark:text-slate-200 leading-relaxed">{current.question_text}</p>
          </div>

          <div className="mt-4 flex flex-col gap-2.5">
            {current.options.map((opt) => {
              const isSelected = selectedOption === opt.id;
              const isCorrectOpt = revealed && opt.id === current.correct_option;
              const isWrongSelected = revealed && isSelected && opt.id !== current.correct_option;
              let borderColor = '#e5e7eb';
              if (isCorrectOpt) borderColor = '#3B6D11';
              else if (isWrongSelected) borderColor = '#dc2626';
              else if (isSelected) borderColor = '#378ADD';
              return (
                <button
                  key={opt.id}
                  disabled={revealed}
                  onClick={() => handleSelect(opt.id)}
                  className="w-full flex items-center justify-between gap-3 rounded-xl py-3 px-4 text-left text-sm bg-white dark:bg-slate-900 transition-colors"
                  style={{ borderWidth: 1.5, borderStyle: 'solid', borderColor }}
                >
                  <span className="text-gray-800 dark:text-slate-200">{opt.text}</span>
                  {isCorrectOpt && <CheckCircle2 className="w-5 h-5 shrink-0" style={{ color: '#3B6D11' }} />}
                  {isWrongSelected && <XCircle className="w-5 h-5 shrink-0 text-red-500" />}
                </button>
              );
            })}
          </div>

          {revealed && (
            <div className="mt-5 flex flex-col gap-4">
              <div
                className="rounded-2xl p-4"
                style={{ backgroundColor: selectedOption === current.correct_option ? '#EAF3DE' : '#FEE2E2' }}
              >
                <p className="text-xs font-semibold text-gray-500 dark:text-slate-400">{t.explanationLabel}</p>
                <p className="text-sm text-gray-700 dark:text-slate-300 mt-1 leading-relaxed">{current.explanation}</p>
              </div>
              <button
                onClick={handleNext}
                className="w-full bg-[#378ADD] hover:bg-[#2d73c4] text-white rounded-xl py-3 text-sm font-medium transition-colors"
              >
                {index + 1 >= questions.length ? t.finishBtn : t.nextBtn}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
