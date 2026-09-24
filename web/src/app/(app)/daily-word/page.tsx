'use client';

// app/(app)/daily-word/page.tsx — "Günlük Kelime Avı" (24 Eylül 2026,
// Madde 2 seçimi) oyun ekranı. games.py/duels.py'deki wordle modlarındaki
// AYNI harf-tahmin görsel dili (can ikonları, boşluklu kelime kutuları,
// klavye) — bkz. app/(app)/game/page.tsx satır ~1900-1975 — burada TEK bir
// günlük bulmaca için sadeleştirilmiş, kendi kendine yeten bir sayfa
// olarak tekrar kullanıldı (mevcut dev karmaşık oyun state makinesine
// dokunulmadı — "mevcut yapı bozulmasın" ilkesiyle tutarlı).
//
// Paylaşım: yeni bir native bağımlılık/görsel üretimi YOK (kullanıcının
// "mobilde açılma/kapanma sorunlarıyla karşılaşmayalım" isteğiyle tutarlı)
// -- klasik Wordle'in emoji-özet panoya kopyalama deseni.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AxiosError } from 'axios';
import { ArrowLeft, Heart, Flame, Loader2, Share2, Check } from 'lucide-react';
import { dailyChallengeApi, type DailyChallengeState } from '@/lib/api';
import { useLocale, type Locale } from '@/lib/i18n';

const KEYBOARD_ROWS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];

function errorDetail(err: unknown): string | undefined {
  if (err instanceof AxiosError) {
    return (err.response?.data as { detail?: string } | undefined)?.detail;
  }
  return undefined;
}

const L: Partial<Record<Locale, Record<string, string>>> = {
  tr: {
    title: 'Günlük Kelime Avı',
    loading: 'Yükleniyor…',
    error: 'Bir şeyler ters gitti.',
    noneTitle: 'Bugün için kelime yok',
    noneBody: 'Bu dil için bugünün kelimesi henüz hazır değil — biraz sonra tekrar dene.',
    livesLabel: 'Hak',
    streakLabel: 'gün seri',
    wonTitle: 'Kelimeyi buldun! 🎉',
    lostTitle: 'Hakların bitti',
    correctWordTpl: 'Doğru kelime: {word}',
    guessedLabel: 'Denenen harfler',
    shareBtn: 'Paylaş',
    copiedBtn: 'Kopyalandı!',
    backBtn: 'Panele dön',
  },
  en: {
    title: 'Daily Word Hunt',
    loading: 'Loading…',
    error: 'Something went wrong.',
    noneTitle: 'No word today',
    noneBody: "Today's word for this language isn't ready yet — check back soon.",
    livesLabel: 'Lives',
    streakLabel: 'day streak',
    wonTitle: 'You got it! 🎉',
    lostTitle: 'Out of lives',
    correctWordTpl: 'The word was: {word}',
    guessedLabel: 'Guessed letters',
    shareBtn: 'Share',
    copiedBtn: 'Copied!',
    backBtn: 'Back to dashboard',
  },
};

export default function DailyWordPage() {
  const { locale } = useLocale();
  const t = L[locale] ?? L.tr!;

  const [state, setState] = useState<DailyChallengeState | null | undefined>(undefined);
  const [error, setError] = useState('');
  const [letterBusy, setLetterBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    dailyChallengeApi
      .today()
      .then(setState)
      .catch(() => setError(t.error));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGuessLetter = async (letter: string) => {
    if (!state || letterBusy || state.is_complete || state.is_failed) return;
    if (state.guessed_letters.includes(letter)) return;
    setLetterBusy(true);
    setError('');
    try {
      const res = await dailyChallengeApi.guessLetter(letter);
      setState((prev) => (prev ? { ...prev, ...res } : prev));
    } catch (err) {
      setError(errorDetail(err) || t.error);
    } finally {
      setLetterBusy(false);
    }
  };

  const handleShare = async () => {
    if (!state) return;
    const roundOver = state.is_complete || state.is_failed;
    if (!roundOver) return;
    const lettersLen = state.revealed.replace(/\s+/g, '').length;
    // Kaybedilen her hak icin kirmizi kare, kalan haklar icin -- cozulduyse
    // yesil, cozulmediyse (basarisiz) gri -- klasik Wordle'in yesil/gri
    // kare paylasim mekanigine benzer, basit bir ozet.
    const squares = Array.from({ length: state.max_wrong_guesses })
      .map((_, i) => (i < state.wrong_guesses ? '🟥' : state.is_complete ? '🟩' : '⬜'))
      .join('');
    const resultLine = state.is_complete ? `✅ ${lettersLen} harf` : '❌';
    const streakLine = state.streak > 0 ? `🔥 ${state.streak} ${t.streakLabel}` : '';
    const text = [
      `Lexis — Günlük Kelime Avı (${state.puzzle_date})`,
      `${resultLine} ${squares}`,
      streakLine,
      'lexiswords.com',
    ]
      .filter(Boolean)
      .join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Panoya erişim engellenmişse sessizce yok say.
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-6 flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard"
          className="w-9 h-9 rounded-full flex items-center justify-center bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700"
        >
          <ArrowLeft className="w-4.5 h-4.5" />
        </Link>
        <h1 className="text-lg font-bold text-gray-900 dark:text-slate-100">{t.title}</h1>
      </div>

      {state === undefined && !error && (
        <div className="flex items-center justify-center py-16 text-gray-400 dark:text-slate-500">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      )}

      {error && (
        <p className="text-sm text-red-500 text-center">{error}</p>
      )}

      {state === null && (
        <div className="rounded-2xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-8 text-center">
          <p className="text-sm font-semibold text-gray-700 dark:text-slate-200">{t.noneTitle}</p>
          <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">{t.noneBody}</p>
        </div>
      )}

      {state && (
        <>
          {state.streak > 0 && (
            <div className="flex items-center justify-center gap-1.5 text-sm font-semibold text-orange-500">
              <Flame className="w-4 h-4 fill-orange-400 text-orange-400" />
              {state.streak} {t.streakLabel}
            </div>
          )}

          {state.meaning && (
            <div className="rounded-2xl bg-[#E6F1FB] dark:bg-blue-500/10 px-4 py-3 text-center">
              <p className="text-sm font-medium text-[#1D5A96] dark:text-blue-300">{state.meaning}</p>
              {state.example && (
                <p className="text-xs text-[#378ADD] dark:text-blue-400 mt-1 italic">{state.example}</p>
              )}
            </div>
          )}

          <div className="w-full flex items-center justify-center gap-2">
            <span className="text-xs font-medium text-gray-400 dark:text-slate-500 mr-1">{t.livesLabel}</span>
            {Array.from({ length: state.max_wrong_guesses }).map((_, i) => (
              <Heart
                key={i}
                className={`w-5 h-5 ${
                  i < state.max_wrong_guesses - state.wrong_guesses
                    ? 'text-red-400 dark:text-red-300 fill-red-400'
                    : 'text-gray-200 dark:text-slate-700 fill-gray-200'
                }`}
              />
            ))}
          </div>

          <div className="w-full flex items-center justify-center flex-wrap gap-2 py-2">
            {state.revealed.replace(/\s+/g, '').split('').map((ch, i) => (
              <span
                key={i}
                className={`w-9 h-11 flex items-center justify-center rounded-lg text-xl font-bold uppercase ${
                  ch === '_'
                    ? 'bg-gray-50 dark:bg-slate-800 border-2 border-gray-200 dark:border-slate-700 text-transparent'
                    : 'bg-[#EAF3DE] border-2 border-[#3B6D11]/30 text-[#3B6D11]'
                }`}
              >
                {ch === '_' ? '·' : ch}
              </span>
            ))}
          </div>

          {(state.is_complete || state.is_failed) && (
            <div
              className={`w-full rounded-xl px-4 py-3 text-sm font-semibold text-center ${
                state.is_complete
                  ? 'bg-[#EAF3DE] text-[#3B6D11]'
                  : 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400'
              }`}
            >
              <p>{state.is_complete ? t.wonTitle : t.lostTitle}</p>
              {state.is_failed && state.word && (
                <p className="mt-1 font-normal">{t.correctWordTpl.replace('{word}', state.word)}</p>
              )}
            </div>
          )}

          {!state.is_complete && !state.is_failed && (
            <div className="w-full flex flex-col items-center gap-2">
              {KEYBOARD_ROWS.map((row, i) => (
                <div key={i} className="flex gap-1.5">
                  {row.split('').map((letter) => {
                    const lower = letter.toLowerCase();
                    const isGuessed = state.guessed_letters.includes(lower);
                    const isCorrectGuess = isGuessed && state.revealed.toLowerCase().includes(lower);
                    return (
                      <button
                        key={letter}
                        onClick={() => handleGuessLetter(lower)}
                        disabled={isGuessed || letterBusy}
                        className={`w-8 h-10 sm:w-9 sm:h-11 rounded-lg text-sm font-semibold transition-all ${
                          isGuessed
                            ? isCorrectGuess
                              ? 'bg-[#EAF3DE] text-[#3B6D11] border-2 border-[#3B6D11]/30'
                              : 'bg-gray-100 dark:bg-slate-800 text-gray-300 dark:text-slate-600 border-2 border-gray-100 dark:border-slate-800'
                            : 'bg-white dark:bg-slate-900 border-2 border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 hover:border-[#378ADD] hover:bg-[#E6F1FB]'
                        }`}
                      >
                        {letter}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          )}

          {state.guessed_letters.length > 0 && !state.is_complete && !state.is_failed && (
            <p className="text-xs text-gray-400 dark:text-slate-500 text-center">
              {t.guessedLabel}: {state.guessed_letters.join(', ').toUpperCase()}
            </p>
          )}

          {(state.is_complete || state.is_failed) && (
            <button
              onClick={handleShare}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#378ADD] text-white text-sm font-semibold py-3 hover:bg-[#2F73B8] transition-colors"
            >
              {copied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
              {copied ? t.copiedBtn : t.shareBtn}
            </button>
          )}
        </>
      )}
    </div>
  );
}
