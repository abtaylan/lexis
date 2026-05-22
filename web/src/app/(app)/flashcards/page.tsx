'use client';

import { useState } from 'react';
import { RotateCcw, CheckCircle2, XCircle, Minus, Trophy } from 'lucide-react';
import { useDueWords, useReviewWord } from '@/hooks/useWords';
import { Button, Card, Badge, Spinner, ProgressBar, EmptyState } from '@/components/ui';
import { PageHeader } from '@/components/layout/PageHeader';
import { clsx } from 'clsx';
import type { Word } from '@/types';

// ─── Flashcard ────────────────────────────────────────────────────────────────
function FlashCard({ word, onRate }: { word: Word; onRate: (q: 0 | 1 | 2 | 3 | 4 | 5) => void }) {
  const [flipped, setFlipped] = useState(false);

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-lg mx-auto">
      {/* Card */}
      <div
        className={clsx(
          'w-full min-h-64 rounded-2xl cursor-pointer transition-all duration-300 select-none',
          'bg-white border border-slate-100 shadow-md hover:shadow-lg',
          'flex flex-col items-center justify-center p-8 text-center gap-3',
          flipped && 'border-sky-200 bg-sky-50/30'
        )}
        onClick={() => setFlipped((v) => !v)}
      >
        {!flipped ? (
          <div className="animate-fade-in space-y-3">
            <Badge variant="outline" size="sm">
              {word.part_of_speech || 'word'}
            </Badge>
            <h2 className="text-4xl font-bold text-slate-800 tracking-tight">
              {word.word}
            </h2>
            {word.pronunciation && (
              <p className="font-mono text-slate-400 text-sm">/{word.pronunciation}/</p>
            )}
            <p className="text-slate-300 text-sm mt-4">Cevabı görmek için tıkla →</p>
          </div>
        ) : (
          <div className="animate-fade-in space-y-3 w-full">
            <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Tanım</p>
            <p className="text-lg text-slate-700 leading-relaxed">{word.definition}</p>
            {word.translation && (
              <>
                <div className="w-12 h-px bg-slate-200 mx-auto" />
                <p className="text-sky-600 font-semibold text-xl">{word.translation}</p>
              </>
            )}
            {word.example_sentence && (
              <p className="text-slate-400 text-sm italic mt-2">"{word.example_sentence}"</p>
            )}
          </div>
        )}
      </div>

      {/* Flip hint */}
      {!flipped && (
        <p className="text-xs text-slate-300">veya kartı çevir</p>
      )}

      {/* Rating buttons — only show when flipped */}
      {flipped && (
        <div className="w-full animate-fade-in">
          <p className="text-xs text-center text-slate-400 mb-3 font-medium">Bu kelimeyi ne kadar bildin?</p>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => onRate(1)}
              className="flex flex-col items-center gap-1 p-3 rounded-xl border border-red-100 hover:bg-red-50 transition-colors group"
            >
              <XCircle size={22} className="text-red-400 group-hover:text-red-500" />
              <span className="text-xs font-medium text-red-400">Hiç bilmedim</span>
            </button>
            <button
              onClick={() => onRate(3)}
              className="flex flex-col items-center gap-1 p-3 rounded-xl border border-amber-100 hover:bg-amber-50 transition-colors group"
            >
              <Minus size={22} className="text-amber-400 group-hover:text-amber-500" />
              <span className="text-xs font-medium text-amber-400">Kısmen</span>
            </button>
            <button
              onClick={() => onRate(5)}
              className="flex flex-col items-center gap-1 p-3 rounded-xl border border-emerald-100 hover:bg-emerald-50 transition-colors group"
            >
              <CheckCircle2 size={22} className="text-emerald-400 group-hover:text-emerald-500" />
              <span className="text-xs font-medium text-emerald-400">Kolayca!</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Session Complete ─────────────────────────────────────────────────────────
function SessionComplete({ total, correct, onRestart }: {
  total: number; correct: number; onRestart: () => void;
}) {
  const pct = Math.round((correct / total) * 100);
  const emoji = pct >= 90 ? '🏆' : pct >= 70 ? '🎉' : pct >= 50 ? '👍' : '💪';

  return (
    <div className="flex flex-col items-center gap-6 max-w-sm mx-auto py-8 text-center">
      <div className="text-6xl">{emoji}</div>
      <div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Seans Tamamlandı!</h2>
        <p className="text-slate-400">
          {total} kartı gözden geçirdin
        </p>
      </div>

      <div className="w-full bg-white rounded-2xl border border-slate-100 p-6 space-y-4">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-2xl font-bold text-emerald-500">{correct}</p>
            <p className="text-xs text-slate-400">Bilinen</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-700">{pct}%</p>
            <p className="text-xs text-slate-400">Başarı</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-red-400">{total - correct}</p>
            <p className="text-xs text-slate-400">Tekrar</p>
          </div>
        </div>
        <ProgressBar value={pct} color={pct >= 70 ? 'green' : 'amber'} size="md" showLabel />
      </div>

      <Button onClick={onRestart} icon={<RotateCcw size={16} />} variant="secondary">
        Yeniden Başla
      </Button>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function FlashcardsPage() {
  const { data: dueWords, isLoading, refetch } = useDueWords();
  const reviewWord = useReviewWord();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [completed, setCompleted] = useState(false);

  const words = dueWords ?? [];
  const total = words.length;
  const current = words[currentIndex];

  const handleRate = async (quality: 0 | 1 | 2 | 3 | 4 | 5) => {
    if (!current) return;
    if (quality >= 4) setCorrect((v) => v + 1);
    await reviewWord.mutateAsync({ id: current.id, data: { quality } });

    if (currentIndex + 1 >= total) {
      setCompleted(true);
    } else {
      setCurrentIndex((v) => v + 1);
    }
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setCorrect(0);
    setCompleted(false);
    refetch();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Flashcards"
        subtitle="Tekrar zamanı gelen kelimeler"
      />

      {completed ? (
        <SessionComplete total={total} correct={correct} onRestart={handleRestart} />
      ) : total === 0 ? (
        <EmptyState
          icon={<Trophy size={28} />}
          title="Harika! Tüm kartları tamamladın 🎉"
          description="Tekrar zamanı gelen kelime yok. Yeni kelimeler ekleyebilirsin."
          action={<Button variant="secondary" onClick={() => refetch()}>Yenile</Button>}
        />
      ) : (
        <div className="space-y-5">
          {/* Progress */}
          <Card padding="sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-500 font-medium">
                {currentIndex + 1} / {total}
              </span>
              <span className="text-xs text-slate-400">
                {total - currentIndex - 1} kart kaldı
              </span>
            </div>
            <ProgressBar
              value={currentIndex}
              max={total}
              color="blue"
              size="sm"
            />
          </Card>

          {/* Card */}
          {current && <FlashCard key={current.id} word={current} onRate={handleRate} />}
        </div>
      )}
    </div>
  );
}
