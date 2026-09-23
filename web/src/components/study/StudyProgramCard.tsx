'use client';

// web/src/components/study/StudyProgramCard.tsx
//
// Adaptif Öğrenme Motoru Madde 2 (24 Eylül 2026) — "Bu Haftanın Programı"
// dashboard kartı. Veri: GET /study-program/current (bkz.
// backend/app/services/study_program_service.py). Program haftada bir kez
// (Pazartesi) güncel performansa göre yeniden üretilir; buradaki ilerleme
// her yüklemede canlı hesaplanır. Backend available=false dönerse (öğrenilen
// dilde soru içeriği yok) kart hiç gösterilmez.

import { useRouter } from 'next/navigation';
import type { Locale } from '@/lib/i18n';
import type { StudyProgram } from '@/types';

type Strings = {
  title: string;
  subtitle: string;
  levelTpl: string;
  wordsTitle: string;
  wordsTpl: string;
  reviewsTpl: string;
  wordsCta: string;
  topicsTitle: string;
  weak: string;
  next: string;
  progressTpl: string;
  done: string;
  review: string;
  practice: string;
  quizTitle: string;
  quizLocked: string;
  quizTpl: string;
  quizDone: string;
  quizCta: string;
};

const STRINGS: Partial<Record<Locale, Strings>> = {
  tr: {
    title: 'Bu Haftanın Programı',
    subtitle: 'Performansına göre her Pazartesi yenilenir',
    levelTpl: 'Seviye {level}',
    wordsTitle: 'Bugünün kelime hedefi',
    wordsTpl: '{done}/{goal} yeni kelime',
    reviewsTpl: '{n} tekrar bekliyor',
    wordsCta: 'Çalış',
    topicsTitle: 'Odak konular',
    weak: 'Zayıf konu',
    next: 'Sıradaki konu',
    progressTpl: '{done}/{target} soru',
    done: 'Tamamlandı',
    review: 'İncele',
    practice: 'Pratik Yap',
    quizTitle: 'Hafta sonu quizi',
    quizLocked: 'Cumartesi açılır — odak konulardan karışık 10 soru',
    quizTpl: '{done}/{target} soru cevaplandı',
    quizDone: 'Bu haftanın quizi tamamlandı',
    quizCta: 'Başla',
  },
  en: {
    title: "This Week's Plan",
    subtitle: 'Refreshed every Monday based on your performance',
    levelTpl: 'Level {level}',
    wordsTitle: "Today's word goal",
    wordsTpl: '{done}/{goal} new words',
    reviewsTpl: '{n} reviews due',
    wordsCta: 'Study',
    topicsTitle: 'Focus topics',
    weak: 'Weak topic',
    next: 'Next topic',
    progressTpl: '{done}/{target} questions',
    done: 'Done',
    review: 'Review',
    practice: 'Practice',
    quizTitle: 'Weekend quiz',
    quizLocked: 'Unlocks on Saturday — 10 mixed questions from your focus topics',
    quizTpl: '{done}/{target} questions answered',
    quizDone: "This week's quiz is done",
    quizCta: 'Start',
  },
};

function fill(tpl: string, vars: Record<string, string | number>): string {
  return Object.entries(vars).reduce((acc, [k, v]) => acc.replace(`{${k}}`, String(v)), tpl);
}

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="h-1.5 w-full rounded-full bg-gray-100 dark:bg-slate-800 overflow-hidden">
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  );
}

export function StudyProgramCard({ program, locale }: { program: StudyProgram; locale: Locale }) {
  const router = useRouter();
  const s = (STRINGS[locale] ?? STRINGS.tr)!;
  if (!program.available || program.focus_topics.length === 0) return null;
  const today = program.today;
  const quiz = program.weekend_quiz;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-bold text-gray-900 dark:text-slate-100">{s.title}</p>
          <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{s.subtitle}</p>
        </div>
        {program.level && (
          <span
            className="text-[11px] font-bold rounded-full px-2 py-0.5 shrink-0"
            style={{ backgroundColor: '#E6F1FB', color: '#185FA5' }}
          >
            {fill(s.levelTpl, { level: program.level.toUpperCase() })}
          </span>
        )}
      </div>

      {today && (
        <div className="mt-3 rounded-xl border border-gray-100 dark:border-slate-800 p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-gray-500 dark:text-slate-400">{s.wordsTitle}</p>
              <p className="text-sm font-semibold text-gray-800 dark:text-slate-200 mt-0.5">
                {fill(s.wordsTpl, { done: today.new_words_today, goal: today.new_word_goal })}
                {today.reviews_due > 0 && (
                  <span className="text-xs font-normal text-gray-400 dark:text-slate-500">
                    {' · '}
                    {fill(s.reviewsTpl, { n: today.reviews_due })}
                  </span>
                )}
              </p>
            </div>
            <button
              onClick={() => router.push('/game')}
              className="text-xs font-bold rounded-lg border px-2.5 py-1.5 shrink-0"
              style={{ borderColor: '#378ADD', color: '#378ADD' }}
            >
              {s.wordsCta}
            </button>
          </div>
          <div className="mt-2">
            <Bar value={today.new_words_today} max={today.new_word_goal} color="#378ADD" />
          </div>
        </div>
      )}

      <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 mt-3">
        {s.topicsTitle} · {program.completed_topics}/{program.focus_topics.length}
      </p>
      <div className="flex flex-col gap-2 mt-2">
        {program.focus_topics.map((t) => (
          <div key={t.topic_tag} className="rounded-xl border border-gray-100 dark:border-slate-800 p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-800 dark:text-slate-200 truncate">{t.title}</p>
                <p className="text-xs mt-0.5" style={{ color: t.reason === 'weak' ? '#A32D2D' : '#6B7280' }}>
                  {t.reason === 'weak' ? s.weak : s.next}
                  <span className="text-gray-400 dark:text-slate-500">
                    {' · '}
                    {t.done
                      ? s.done
                      : fill(s.progressTpl, { done: Math.min(t.practiced_count, t.target_count), target: t.target_count })}
                  </span>
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {t.grammar_slug && (
                  <button
                    onClick={() => router.push(`/exam-grammar/${t.grammar_slug}`)}
                    className="text-xs font-bold rounded-lg border px-2.5 py-1.5"
                    style={{ borderColor: '#378ADD', color: '#378ADD' }}
                  >
                    {s.review}
                  </button>
                )}
                <button
                  onClick={() => router.push(`/exam-topic-practice?topic_tag=${encodeURIComponent(t.topic_tag)}`)}
                  className="text-xs font-bold rounded-lg border px-2.5 py-1.5"
                  style={{ borderColor: '#854F0B', color: '#854F0B' }}
                >
                  {s.practice}
                </button>
              </div>
            </div>
            <div className="mt-2">
              <Bar value={t.practiced_count} max={t.target_count} color={t.done ? '#3B6D11' : '#854F0B'} />
            </div>
          </div>
        ))}
      </div>

      {quiz && (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-dashed border-gray-200 dark:border-slate-700 p-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-800 dark:text-slate-200">{s.quizTitle}</p>
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
              {!quiz.available
                ? s.quizLocked
                : quiz.done
                  ? s.quizDone
                  : fill(s.quizTpl, { done: quiz.answered_count, target: quiz.target_count })}
            </p>
          </div>
          {quiz.available && !quiz.done && (
            <button
              onClick={() => router.push('/exam-topic-practice?topic_tag=weekly-quiz')}
              className="text-xs font-bold rounded-lg px-3 py-1.5 text-white shrink-0"
              style={{ backgroundColor: '#378ADD' }}
            >
              {s.quizCta}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
