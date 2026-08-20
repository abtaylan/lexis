'use client';

import { useEffect, useState, useCallback } from 'react';
import { CheckCircle2, XCircle, Loader2, Trophy, RotateCcw, Brain } from 'lucide-react';
import { wordsApi } from '@/lib/api';
import { useLocale } from '@/lib/i18n';
import type { Word } from '@/types';

interface QuizCard {
  word: Word;
  options: string[];
  correctIndex: number;
}

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

function buildQuiz(words: Word[]): QuizCard[] {
  return words.map((word) => {
    const correct = word.meaning_native || word.meaning;
    const others = words
      .filter((w) => w.id !== word.id)
      .map((w) => w.meaning_native || w.meaning)
      .filter(Boolean);
    const distractors = shuffle(others).slice(0, 3);
    const allOptions = shuffle([correct, ...distractors]);
    return { word, options: allOptions, correctIndex: allOptions.indexOf(correct) };
  });
}

// ── Oturum sonu ───────────────────────────────────────────────
function DoneScreen({ score, total, onRestart }: { score: number; total: number; onRestart: () => void }) {
  const { t } = useLocale();
  const pct = total > 0 ? Math.round((score / total) * 100) : 0;
  const tier =
    pct >= 80 ? { label: t('tierExcellent'), bg: '#EAF3DE', text: '#3B6D11', bar: '#3B6D11' } :
    pct >= 50 ? { label: t('tierGood'), bg: '#FAEEDA', text: '#854F0B', bar: '#854F0B' } :
    { label: t('tierKeepGoing'), bg: '#FEE2E2', text: '#b91c1c', bar: '#ef4444' };

  return (
    <div className="p-6 flex flex-col items-center justify-center min-h-[70vh]">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 flex flex-col items-center gap-5 w-full max-w-sm text-center">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ backgroundColor: tier.bg }}>
          <Trophy className="w-8 h-8" style={{ color: tier.text }} />
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900">{tier.label}</p>
          <p className="text-sm text-gray-500 mt-1">{t('questionsCompletedTpl').replace('{n}', String(total))}</p>
        </div>

        <div className="w-full grid grid-cols-2 gap-3">
          <div className="rounded-xl p-3 bg-[#EAF3DE]">
            <p className="text-2xl font-bold text-[#3B6D11]">{score}</p>
            <p className="text-xs text-[#3B6D11] font-medium mt-0.5">{t('correctLabel')}</p>
          </div>
          <div className="rounded-xl p-3 bg-red-50">
            <p className="text-2xl font-bold text-red-600">{total - score}</p>
            <p className="text-xs text-red-600 font-medium mt-0.5">{t('wrongLabel')}</p>
          </div>
        </div>

        <div className="w-full">
          <div className="flex justify-between text-xs text-gray-500 mb-1.5">
            <span>{t('successRate')}</span>
            <span className="font-semibold" style={{ color: tier.text }}>{pct}%</span>
          </div>
          <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-2 rounded-full transition-all duration-700"
              style={{ width: `${pct}%`, backgroundColor: tier.bar }}
            />
          </div>
        </div>

        <button
          onClick={onRestart}
          className="w-full flex items-center justify-center gap-2 bg-[#378ADD] hover:bg-[#2d73c4] text-white rounded-xl py-3 text-sm font-medium transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          {t('retryQuizBtn')}
        </button>
      </div>
    </div>
  );
}

// ── Ana Sayfa ─────────────────────────────────────────────────
export default function QuizPage() {
  const { t } = useLocale();
  const [cards, setCards] = useState<QuizCard[]>([]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setDone(false);
    setIndex(0);
    setScore(0);
    setSelected(null);
    setError('');
    try {
      const res = await wordsApi.getAll({ page: 1, per_page: 100 });
      const pool = (res.items || []).filter((w) => (w.meaning_native || w.meaning));
      if (pool.length < 4) {
        setError(t('quizMinWordsError'));
        return;
      }
      // Karıştır ve en fazla 20 soru al
      const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, 20);
      setCards(buildQuiz(shuffled));
    } catch {
      setError(t('wordsLoadError'));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { load(); }, [load]);

  const current = cards[index];

  const handleAnswer = async (optionIndex: number) => {
    if (selected !== null || submitting || !current) return;
    setSelected(optionIndex);
    const isCorrect = optionIndex === current.correctIndex;
    if (isCorrect) setScore((s) => s + 1);
    setSubmitting(true);
    try {
      await wordsApi.review(current.word.id, { success: isCorrect });
    } catch { /* sessiz */ }
    finally { setSubmitting(false); }

    setTimeout(() => {
      if (index + 1 >= cards.length) {
        setDone(true);
      } else {
        setIndex((i) => i + 1);
        setSelected(null);
      }
    }, 1000);
  };

  // ── Loading ──
  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3 text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="text-sm">{t('loading')}</span>
        </div>
      </div>
    );
  }

  // ── Hata ──
  if (error) {
    return (
      <div className="p-6">
        <div className="bg-[#FAEEDA] text-[#854F0B] rounded-2xl px-4 py-3 text-sm">{error}</div>
      </div>
    );
  }

  // ── Oturum sonu ──
  if (done) {
    return <DoneScreen score={score} total={cards.length} onRestart={load} />;
  }

  const progress = cards.length > 0 ? (index / cards.length) * 100 : 0;

  // ── Quiz ──
  return (
    <div className="p-6 flex flex-col items-center gap-6 max-w-xl mx-auto">

      {/* Üst bar */}
      <div className="w-full flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#EEEDFE] flex items-center justify-center">
            <Brain className="w-4 h-4 text-[#534AB7]" />
          </div>
          <span className="text-sm font-semibold text-gray-700">{t('quiz')}</span>
        </div>
        <div className="flex items-center gap-3 text-xs font-medium">
          <span className="flex items-center gap-1 text-[#3B6D11]">
            <span className="w-2 h-2 rounded-full bg-[#3B6D11] inline-block" />
            {t('correctCountTpl').replace('{n}', String(score))}
          </span>
          <span className="text-gray-400">{t('questionCounterTpl').replace('{i}', String(index + 1)).replace('{n}', String(cards.length))}</span>
        </div>
      </div>

      {/* Progress */}
      <div className="w-full h-1.5 rounded-full bg-gray-100 overflow-hidden">
        <div
          className="h-1.5 rounded-full bg-[#534AB7] transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Soru kartı */}
      <div className="w-full bg-white border border-gray-100 rounded-2xl shadow-sm p-8 text-center">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
          {t('quizQuestionPrompt')}
        </p>
        <p className="text-4xl font-bold text-gray-900 tracking-tight">{current.word.word}</p>
        {current.word.word_type && (
          <span className="inline-block mt-3 text-xs font-medium bg-[#EEEDFE] text-[#534AB7] px-2.5 py-1 rounded-full">
            {current.word.word_type}
          </span>
        )}
      </div>

      {/* Seçenekler */}
      <div className="w-full grid grid-cols-1 gap-3">
        {current.options.map((opt, i) => {
          const isCorrect = i === current.correctIndex;
          const isSelected = i === selected;
          const answered = selected !== null;

          let cls = 'border-gray-200 text-gray-700 hover:border-[#378ADD] hover:bg-[#E6F1FB]';
          let icon: React.ReactNode = null;

          if (answered) {
            if (isCorrect) {
              cls = 'border-[#3B6D11] bg-[#EAF3DE] text-[#3B6D11]';
              icon = <CheckCircle2 className="w-4 h-4 shrink-0 text-[#3B6D11]" />;
            } else if (isSelected) {
              cls = 'border-red-400 bg-red-50 text-red-600';
              icon = <XCircle className="w-4 h-4 shrink-0 text-red-400" />;
            } else {
              cls = 'border-gray-100 text-gray-300';
            }
          }

          return (
            <button
              key={i}
              onClick={() => handleAnswer(i)}
              disabled={answered}
              className={`w-full flex items-center gap-3 border-2 rounded-xl px-4 py-3.5 text-sm font-medium text-left transition-all ${cls}`}
            >
              {/* Harf etiketi */}
              <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                answered
                  ? isCorrect ? 'bg-[#3B6D11] text-white' : isSelected ? 'bg-red-400 text-white' : 'bg-gray-100 text-gray-300'
                  : 'bg-gray-100 text-gray-500'
              }`}>
                {['A', 'B', 'C', 'D'][i]}
              </span>
              <span className="flex-1">{opt}</span>
              {icon}
            </button>
          );
        })}
      </div>
    </div>
  );
}
