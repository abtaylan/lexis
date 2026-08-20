'use client';

import { useState, useCallback } from 'react';
import { CheckCircle2, XCircle, Loader2, Trophy, RotateCcw, Gamepad2, Sparkles, BookOpen, Globe2 } from 'lucide-react';
import { gamesApi } from '@/lib/api';
import { useT } from '@/lib/i18n';
import type { GameSession, GameWordItem } from '@/types';

interface GameCard {
  word: GameWordItem;
  options: string[];
  correctIndex: number;
}

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

function buildCards(words: GameWordItem[]): GameCard[] {
  return words.map((word) => {
    const correct = word.meaning;
    const others = words.filter((w) => w.id !== word.id).map((w) => w.meaning).filter(Boolean);
    const distractors = shuffle(others).slice(0, 3);
    const allOptions = shuffle([correct, ...distractors]);
    return { word, options: allOptions, correctIndex: allOptions.indexOf(correct) };
  });
}

// ── Başlangıç ekranı: kelime havuzu seçimi ──────────────────────
function StartScreen({
  onStart, loading, error,
}: { onStart: (poolSource: 'own' | 'general') => void; loading: boolean; error: string }) {
  const { t } = useT();
  return (
    <div className="p-6 flex flex-col items-center justify-center min-h-[70vh]">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 flex flex-col items-center gap-5 w-full max-w-md text-center">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-[#EEEDFE]">
          <Gamepad2 className="w-8 h-8 text-[#534AB7]" />
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900">{t('nav.game')}</p>
          <p className="text-sm text-gray-500 mt-1">Kelimelerini eğlenceli bir şekilde tekrar et ve XP kazan.</p>
        </div>

        {error && (
          <div className="w-full bg-[#FAEEDA] text-[#854F0B] rounded-xl px-4 py-3 text-sm">{error}</div>
        )}

        <div className="w-full grid grid-cols-1 gap-3">
          <button
            onClick={() => onStart('own')}
            disabled={loading}
            className="w-full flex items-center gap-3 border-2 border-gray-200 rounded-xl px-4 py-3.5 text-sm font-medium text-left hover:border-[#378ADD] hover:bg-[#E6F1FB] transition-all disabled:opacity-50"
          >
            <div className="w-9 h-9 rounded-lg bg-[#E6F1FB] flex items-center justify-center shrink-0">
              <BookOpen className="w-4 h-4 text-[#378ADD]" />
            </div>
            <div>
              <p className="text-gray-900 font-semibold">Kendi kelimelerim</p>
              <p className="text-xs text-gray-500">Kelime listene eklediklerinle oyna</p>
            </div>
          </button>

          <button
            onClick={() => onStart('general')}
            disabled={loading}
            className="w-full flex items-center gap-3 border-2 border-gray-200 rounded-xl px-4 py-3.5 text-sm font-medium text-left hover:border-[#378ADD] hover:bg-[#E6F1FB] transition-all disabled:opacity-50"
          >
            <div className="w-9 h-9 rounded-lg bg-[#EAF3DE] flex items-center justify-center shrink-0">
              <Globe2 className="w-4 h-4 text-[#3B6D11]" />
            </div>
            <div>
              <p className="text-gray-900 font-semibold">Genel kelime havuzu</p>
              <p className="text-xs text-gray-500">Öğrendiğin dile göre hazır kelimelerle oyna</p>
            </div>
          </button>
        </div>

        {loading && (
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> Hazırlanıyor…
          </div>
        )}

        <p className="text-xs text-gray-400">Şu an sadece çoktan seçmeli mod aktif — diğer modlar (Wordle, eşleştirme, yazma…) yakında eklenecek.</p>
      </div>
    </div>
  );
}

// ── Oturum sonu ───────────────────────────────────────────────
function DoneScreen({
  score, total, xpEarned, onRestart,
}: { score: number; total: number; xpEarned: number; onRestart: () => void }) {
  const pct = total > 0 ? Math.round((score / total) * 100) : 0;
  const tier =
    pct >= 80 ? { label: 'Mükemmel!', bg: '#EAF3DE', text: '#3B6D11', bar: '#3B6D11' } :
    pct >= 50 ? { label: 'İyi iş!',   bg: '#FAEEDA', text: '#854F0B', bar: '#854F0B' } :
                { label: 'Devam et',  bg: '#FEE2E2', text: '#b91c1c', bar: '#ef4444' };

  return (
    <div className="p-6 flex flex-col items-center justify-center min-h-[70vh]">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 flex flex-col items-center gap-5 w-full max-w-sm text-center">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ backgroundColor: tier.bg }}>
          <Trophy className="w-8 h-8" style={{ color: tier.text }} />
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900">{tier.label}</p>
          <p className="text-sm text-gray-500 mt-1">{total} kelime tamamlandı</p>
        </div>

        <div className="w-full grid grid-cols-2 gap-3">
          <div className="rounded-xl p-3 bg-[#EAF3DE]">
            <p className="text-2xl font-bold text-[#3B6D11]">{score}</p>
            <p className="text-xs text-[#3B6D11] font-medium mt-0.5">Doğru</p>
          </div>
          <div className="rounded-xl p-3 bg-[#EEEDFE]">
            <p className="text-2xl font-bold text-[#534AB7] flex items-center justify-center gap-1">
              <Sparkles className="w-4 h-4" />{xpEarned}
            </p>
            <p className="text-xs text-[#534AB7] font-medium mt-0.5">XP kazanıldı</p>
          </div>
        </div>

        <div className="w-full">
          <div className="flex justify-between text-xs text-gray-500 mb-1.5">
            <span>Başarı oranı</span>
            <span className="font-semibold" style={{ color: tier.text }}>{pct}%</span>
          </div>
          <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
            <div className="h-2 rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: tier.bar }} />
          </div>
        </div>

        <button
          onClick={onRestart}
          className="w-full flex items-center justify-center gap-2 bg-[#378ADD] hover:bg-[#2d73c4] text-white rounded-xl py-3 text-sm font-medium transition-colors"
        >
          <RotateCcw className="w-4 h-4" /> Tekrar oyna
        </button>
      </div>
    </div>
  );
}

// ── Ana sayfa ─────────────────────────────────────────────────
export default function GamePage() {
  const { t } = useT();
  const [session, setSession]       = useState<GameSession | null>(null);
  const [cards, setCards]           = useState<GameCard[]>([]);
  const [index, setIndex]           = useState(0);
  const [selected, setSelected]     = useState<number | null>(null);
  const [score, setScore]           = useState(0);
  const [xpEarned, setXpEarned]     = useState(0);
  const [done, setDone]             = useState(false);
  const [loading, setLoading]       = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState('');

  const start = useCallback(async (poolSource: 'own' | 'general') => {
    setLoading(true);
    setError('');
    try {
      const s = await gamesApi.start({ mode: 'multiple_choice', pool_source: poolSource, word_count: 10 });
      if (!s.words || s.words.length < 4) {
        setError('Oyun için yeterli kelime bulunamadı. Önce birkaç kelime ekle veya genel havuzu dene.');
        return;
      }
      setSession(s);
      setCards(buildCards(s.words));
      setIndex(0);
      setScore(0);
      setXpEarned(0);
      setSelected(null);
      setDone(false);
    } catch {
      setError('Oyun başlatılamadı. Lütfen tekrar dene.');
    } finally {
      setLoading(false);
    }
  }, []);

  const restart = useCallback(() => {
    setSession(null);
    setCards([]);
    setDone(false);
    setError('');
  }, []);

  const current = cards[index];

  const handleAnswer = async (optionIndex: number) => {
    if (selected !== null || submitting || !current || !session) return;
    setSelected(optionIndex);
    const isCorrect = optionIndex === current.correctIndex;
    if (isCorrect) setScore((s) => s + 1);
    setSubmitting(true);
    try {
      const res = await gamesApi.submitAttempt(session.id, {
        general_word_id: session.pool_source === 'general' ? current.word.id : undefined,
        word_id: session.pool_source === 'own' ? current.word.id : undefined,
        is_correct: isCorrect,
      });
      if (res.xp_awarded) setXpEarned((prev) => prev + res.xp_awarded);
    } catch { /* sessiz */ }
    finally { setSubmitting(false); }

    setTimeout(async () => {
      if (index + 1 >= cards.length) {
        try { await gamesApi.finish(session.id); } catch { /* sessiz */ }
        setDone(true);
      } else {
        setIndex((i) => i + 1);
        setSelected(null);
      }
    }, 900);
  };

  // ── Başlangıç ekranı ──
  if (!session && !loading) {
    return <StartScreen onStart={start} loading={loading} error={error} />;
  }
  if (loading && !session) {
    return <StartScreen onStart={start} loading={loading} error={error} />;
  }

  // ── Oturum sonu ──
  if (done) {
    return <DoneScreen score={score} total={cards.length} xpEarned={xpEarned} onRestart={restart} />;
  }

  if (!current) return null;

  const progress = cards.length > 0 ? (index / cards.length) * 100 : 0;

  return (
    <div className="p-6 flex flex-col items-center gap-6 max-w-xl mx-auto">
      <div className="w-full flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#EEEDFE] flex items-center justify-center">
            <Gamepad2 className="w-4 h-4 text-[#534AB7]" />
          </div>
          <span className="text-sm font-semibold text-gray-700">{t('nav.game')}</span>
        </div>
        <div className="flex items-center gap-3 text-xs font-medium">
          <span className="flex items-center gap-1 text-[#534AB7]">
            <Sparkles className="w-3 h-3" />+{xpEarned} XP
          </span>
          <span className="text-gray-400">{index + 1} / {cards.length}</span>
        </div>
      </div>

      <div className="w-full h-1.5 rounded-full bg-gray-100 overflow-hidden">
        <div className="h-1.5 rounded-full bg-[#534AB7] transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>

      <div className="w-full bg-white border border-gray-100 rounded-2xl shadow-sm p-8 text-center">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Bu kelimenin anlamı ne?</p>
        <p className="text-4xl font-bold text-gray-900 tracking-tight">{current.word.word}</p>
      </div>

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
