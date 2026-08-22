'use client';

import { useEffect, useState, useCallback } from 'react';
import { CheckCircle2, XCircle, RotateCcw, Loader2, Layers, ChevronRight } from 'lucide-react';
import { wordsApi, languagesApi } from '@/lib/api';
import { useAuth } from '@/store/auth';
import { useLocale } from '@/lib/i18n';
import type { Word, Language } from '@/types';

// ── Oturum sonu ekranı ────────────────────────────────────────
function DoneScreen({ total, correct, onRestart }: { total: number; correct: number; onRestart: () => void }) {
  const { t } = useLocale();
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
  const color = pct >= 80 ? '#3B6D11' : pct >= 50 ? '#854F0B' : '#b91c1c';
  const bgColor = pct >= 80 ? '#EAF3DE' : pct >= 50 ? '#FAEEDA' : '#FEE2E2';

  return (
    <div className="p-6 flex flex-col items-center justify-center min-h-[70vh] gap-6">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-10 flex flex-col items-center gap-5 w-full max-w-sm text-center">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ backgroundColor: bgColor }}>
          <CheckCircle2 className="w-8 h-8" style={{ color }} />
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">{t('sessionComplete')}</p>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">{t('reviewedCountTpl').replace('{n}', String(total))}</p>
        </div>

        {/* Skor */}
        <div className="w-full grid grid-cols-2 gap-3">
          <div className="rounded-xl p-3 bg-[#EAF3DE]">
            <p className="text-2xl font-bold text-[#3B6D11]">{correct}</p>
            <p className="text-xs text-[#3B6D11] font-medium mt-0.5">{t('correctLabel')}</p>
          </div>
          <div className="rounded-xl p-3 bg-red-50 dark:bg-red-500/10">
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">{total - correct}</p>
            <p className="text-xs text-red-600 dark:text-red-400 font-medium mt-0.5">{t('wrongLabel')}</p>
          </div>
        </div>

        {/* Progress ring benzeri yüzde gösterge */}
        <div className="w-full">
          <div className="flex justify-between text-xs text-gray-500 dark:text-slate-400 mb-1.5">
            <span>{t('successRate')}</span>
            <span className="font-semibold" style={{ color }}>{pct}%</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden bg-gray-100 dark:bg-slate-800">
            <div
              className="h-2 rounded-full transition-all duration-700"
              style={{ width: `${pct}%`, backgroundColor: color }}
            />
          </div>
        </div>

        <button
          onClick={onRestart}
          className="w-full flex items-center justify-center gap-2 bg-[#378ADD] hover:bg-[#2d73c4] text-white rounded-xl py-3 text-sm font-medium transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          {t('restartBtn')}
        </button>
      </div>
    </div>
  );
}

// ── Ana Sayfa ─────────────────────────────────────────────────
export default function FlashcardsPage() {
  const { user } = useAuth();
  const { t } = useLocale();
  const [langNames, setLangNames] = useState<Record<string, string>>({});
  useEffect(() => {
    languagesApi.getAll()
      .then((langs: Language[]) => setLangNames(Object.fromEntries(langs.map((l) => [l.code, l.name_native]))))
      .catch(() => {});
  }, []);
  const nativeLabel = langNames[user?.native_lang || 'tr'] || (user?.native_lang || 'tr').toUpperCase();
  const learningLabel = langNames[user?.learning_lang || 'en'] || (user?.learning_lang || 'en').toUpperCase();

  const [queue, setQueue] = useState<Word[]>([]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState(false);
  const [done, setDone] = useState(false);
  const [correct, setCorrect] = useState(0);
  const [error, setError] = useState('');

  const shuffle = (arr: Word[]) => [...arr].sort(() => Math.random() - 0.5);

  const loadCards = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // Önce bugün tekrar bekleyenler; yoksa tüm kelimelerden çalış
      const due = await wordsApi.getDue();
      let pool = due;
      if (!pool || pool.length === 0) {
        const all = await wordsApi.getAll({ page: 1, per_page: 100 });
        pool = all.items || [];
      }
      setQueue(shuffle(pool));
      setIndex(0);
      setFlipped(false);
      setDone(false);
      setCorrect(0);
    } catch {
      setError(t('wordsLoadError'));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- mount/parametre değişiminde veri çekme (fetch-on-effect) deseni; senkron setState çağrısı kasıtlı, davranış değiştirilmedi
  useEffect(() => { loadCards(); }, [loadCards]);

  const current = queue[index];
  const progress = queue.length > 0 ? (index / queue.length) * 100 : 0;

  const handleRate = async (success: boolean) => {
    if (!current || reviewing) return;
    setReviewing(true);
    try {
      await wordsApi.review(current.id, { success });
    } catch {
      // sessizce devam
    } finally {
      setReviewing(false);
    }
    if (success) setCorrect((c) => c + 1);
    if (index + 1 >= queue.length) {
      setDone(true);
    } else {
      setIndex((i) => i + 1);
      setFlipped(false);
    }
  };

  const restart = () => { loadCards(); };

  // ── Loading ──
  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3 text-gray-400 dark:text-slate-500">
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
        <div className="bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 rounded-2xl px-4 py-3 text-sm">{error}</div>
      </div>
    );
  }

  // ── Boş kuyruk ──
  if (queue.length === 0) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-10 flex flex-col items-center gap-4 text-center max-w-sm w-full">
          <div className="w-14 h-14 rounded-2xl bg-[#EAF3DE] flex items-center justify-center">
            <CheckCircle2 className="w-7 h-7 text-[#3B6D11]" />
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900 dark:text-slate-100">{t('greatJob')}</p>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">{t('noWordsDue')}</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Oturum sonu ──
  if (done) {
    return <DoneScreen total={queue.length} correct={correct} onRestart={restart} />;
  }

  // ── Flashcard ──
  return (
    <div className="p-6 flex flex-col items-center gap-6 max-w-xl mx-auto">

      {/* Üst bar */}
      <div className="w-full flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#E6F1FB] flex items-center justify-center">
            <Layers className="w-4 h-4 text-[#185FA5]" />
          </div>
          <span className="text-sm font-semibold text-gray-700 dark:text-slate-300">{t('flashcards')}</span>
        </div>
        <span className="text-sm text-gray-400 dark:text-slate-500 font-medium">
          {index + 1} <span className="text-gray-300 dark:text-slate-600">/</span> {queue.length}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 rounded-full bg-gray-100 dark:bg-slate-800 overflow-hidden">
        <div
          className="h-1.5 rounded-full bg-[#378ADD] transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Kart */}
      <div
        className={`
          w-full bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl shadow-sm
          cursor-pointer select-none transition-all duration-200
          hover:shadow-md hover:border-gray-200 hover:dark:border-slate-700
          ${flipped ? 'min-h-[280px]' : 'min-h-[220px]'}
        `}
        onClick={() => !reviewing && setFlipped((f) => !f)}
      >
        {!flipped ? (
          /* Ön yüz */
          <div className="flex flex-col items-center justify-center gap-3 p-10 h-full min-h-[220px]">
            <p className="text-4xl font-bold text-gray-900 dark:text-slate-100 tracking-tight">{current.word}</p>
            {current.word_type && (
              <span className="text-xs font-medium bg-[#EEEDFE] text-[#534AB7] px-2.5 py-1 rounded-full">
                {current.word_type}
              </span>
            )}
            <div className="flex items-center gap-1 text-xs text-gray-400 dark:text-slate-500 mt-3">
              <span>{t('tapToFlip')}</span>
              <ChevronRight className="w-3 h-3" />
            </div>
          </div>
        ) : (
          /* Arka yüz */
          <div className="flex flex-col items-start gap-4 p-8 min-h-[280px]">
            {/* Ana anlam */}
            <div className="w-full">
              <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-1.5">{t('colMeaning')}</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-slate-100 leading-snug">{current.meaning}</p>
            </div>

            {/* Ana dildeki karşılığı — meaning'den farklıysa göster */}
            {current.meaning_native && current.meaning_native !== current.meaning && (
              <div className="w-full">
                <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-1.5">{nativeLabel}</p>
                <p className="text-base font-medium text-[#185FA5]">{current.meaning_native}</p>
              </div>
            )}

            {/* Öğrenilen dildeki açıklama — meaning'den farklıysa göster */}
            {current.meaning_target && current.meaning_target !== current.meaning && (
              <div className="w-full">
                <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-1.5">{t('meaningTargetTpl').replace('{lang}', learningLabel)}</p>
                <p className="text-sm text-gray-600 dark:text-slate-400 leading-snug">{current.meaning_target}</p>
              </div>
            )}

            {/* Örnek */}
            {current.example && (
              <div className="w-full border-t border-gray-100 dark:border-slate-800 pt-4">
                <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-1.5">{t('exampleHeader')}</p>
                <p className="text-sm text-gray-500 dark:text-slate-400 italic leading-relaxed">{current.example}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Değerlendirme butonları */}
      {flipped ? (
        <div className="flex gap-4 w-full">
          <button
            onClick={() => handleRate(false)}
            disabled={reviewing}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 hover:dark:bg-red-500/15 text-red-600 dark:text-red-400 rounded-2xl font-semibold text-sm disabled:opacity-50 transition-colors"
          >
            <XCircle className="w-5 h-5" />
            {t('dontKnowBtn')}
          </button>
          <button
            onClick={() => handleRate(true)}
            disabled={reviewing}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-[#EAF3DE] hover:bg-green-100 text-[#3B6D11] rounded-2xl font-semibold text-sm disabled:opacity-50 transition-colors"
          >
            <CheckCircle2 className="w-5 h-5" />
            {t('knewItBtn')}
          </button>
        </div>
      ) : (
        /* Placeholder — butonların yüksekliğini tutar, layout kaymasını önler */
        <div className="h-[52px] w-full" />
      )}

      {/* Alt mini skor */}
      <div className="flex items-center gap-4 text-xs text-gray-400 dark:text-slate-500">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-[#3B6D11] inline-block" />
          {t('correctCountTpl').replace('{n}', String(correct))}
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
          {t('wrongCountTpl').replace('{n}', String(index - correct))}
        </span>
      </div>
    </div>
  );
}
