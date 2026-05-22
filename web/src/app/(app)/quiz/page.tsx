'use client';

import { useState, useMemo } from 'react';
import { CheckCircle2, XCircle, RotateCcw, BrainCircuit } from 'lucide-react';
import { useWords, useReviewWord } from '@/hooks/useWords';
import { Button, Card, Badge, Spinner, ProgressBar, EmptyState } from '@/components/ui';
import { PageHeader } from '@/components/layout/PageHeader';
import { clsx } from 'clsx';
import type { Word } from '@/types';

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

function buildQuestions(words: Word[]) {
  if (words.length < 4) return [];
  return shuffle(words).map((word) => {
    const distractors = shuffle(words.filter((w) => w.id !== word.id))
      .slice(0, 3)
      .map((w) => w.translation || w.definition || w.word);
    const correct = word.translation || word.definition || '—';
    const options = shuffle([correct, ...distractors]);
    return { word, correct, options };
  });
}

export default function QuizPage() {
  const { data, isLoading } = useWords({ per_page: 50 });
  const reviewWord = useReviewWord();

  const questions = useMemo(() => {
    if (!data?.items.length) return [];
    return buildQuestions(data.items);
  }, [data?.items]);

  const [started, setStarted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [wrongAnswers, setWrongAnswers] = useState<typeof questions>([]);

  const question = questions[currentIndex];

  const handleSelect = async (option: string) => {
    if (revealed) return;
    setSelected(option);
    setRevealed(true);

    const isCorrect = option === question.correct;
    if (isCorrect) {
      setScore((s) => s + 1);
    } else {
      setWrongAnswers((prev) => [...prev, question]);
    }

    // SM-2 review
    await reviewWord.mutateAsync({
      id: question.word.id,
      data: { quality: isCorrect ? 5 : 1 },
    });
  };

  const handleNext = () => {
    if (currentIndex + 1 >= questions.length) {
      setFinished(true);
    } else {
      setCurrentIndex((v) => v + 1);
      setSelected(null);
      setRevealed(false);
    }
  };

  const handleRestart = () => {
    setStarted(false);
    setCurrentIndex(0);
    setSelected(null);
    setRevealed(false);
    setScore(0);
    setFinished(false);
    setWrongAnswers([]);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>;
  }

  if (!data?.items.length || questions.length < 4) {
    return (
      <div>
        <PageHeader title="Quiz" />
        <EmptyState
          icon={<BrainCircuit size={28} />}
          title="Yeterli kelime yok"
          description="Quiz için en az 4 kelime gerekiyor. Önce kelime ekle."
        />
      </div>
    );
  }

  // Start screen
  if (!started) {
    return (
      <div>
        <PageHeader title="Quiz" subtitle="Bilgini test et" />
        <Card padding="lg" className="max-w-md mx-auto text-center">
          <div className="w-16 h-16 bg-violet-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <BrainCircuit size={30} className="text-violet-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Quiz'e Hazır mısın?</h2>
          <p className="text-slate-400 text-sm mb-6">
            {questions.length} soruluk çoktan seçmeli quiz. Her doğru cevap SM-2 algoritmana yansıyacak.
          </p>
          <div className="grid grid-cols-2 gap-3 mb-6 text-left">
            {[
              { label: 'Soru sayısı', value: `${questions.length}` },
              { label: 'Format', value: 'Çoktan seçmeli' },
              { label: 'Güçlük', value: 'Karışık' },
              { label: 'Etki', value: 'SM-2 günceller' },
            ].map((item) => (
              <div key={item.label} className="bg-slate-50 rounded-xl p-3">
                <p className="text-xs text-slate-400">{item.label}</p>
                <p className="font-semibold text-slate-700 text-sm">{item.value}</p>
              </div>
            ))}
          </div>
          <Button onClick={() => setStarted(true)} className="w-full" size="lg">
            Quiz'i Başlat
          </Button>
        </Card>
      </div>
    );
  }

  // Results screen
  if (finished) {
    const pct = Math.round((score / questions.length) * 100);
    const emoji = pct >= 90 ? '🏆' : pct >= 70 ? '🎉' : pct >= 50 ? '👍' : '💪';

    return (
      <div>
        <PageHeader title="Quiz Sonuçları" />
        <div className="max-w-md mx-auto space-y-4">
          <Card padding="lg" className="text-center">
            <div className="text-5xl mb-3">{emoji}</div>
            <h2 className="text-2xl font-bold text-slate-800">{pct}% Başarı</h2>
            <p className="text-slate-400 text-sm mt-1">{score} / {questions.length} doğru cevap</p>
            <ProgressBar value={pct} color={pct >= 70 ? 'green' : 'amber'} size="md" showLabel className="mt-4" />
          </Card>

          {wrongAnswers.length > 0 && (
            <Card>
              <p className="text-sm font-semibold text-slate-700 mb-3">
                Yanlış Cevaplanan ({wrongAnswers.length})
              </p>
              <div className="space-y-2">
                {wrongAnswers.map(({ word, correct }) => (
                  <div key={word.id} className="flex items-center gap-3 p-2.5 bg-red-50 rounded-xl text-sm">
                    <XCircle size={16} className="text-red-400 flex-shrink-0" />
                    <span className="font-semibold text-slate-700">{word.word}</span>
                    <span className="text-slate-400">→</span>
                    <span className="text-slate-600">{correct}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Button onClick={handleRestart} icon={<RotateCcw size={16} />} variant="secondary" className="w-full">
            Tekrar Başlat
          </Button>
        </div>
      </div>
    );
  }

  // Quiz question
  return (
    <div>
      <PageHeader title="Quiz" />
      <div className="max-w-lg mx-auto space-y-5">
        {/* Progress */}
        <Card padding="sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-500">{currentIndex + 1} / {questions.length}</span>
            <span className="text-sm font-semibold text-emerald-500">✓ {score}</span>
          </div>
          <ProgressBar value={currentIndex} max={questions.length} size="sm" />
        </Card>

        {/* Question */}
        <Card padding="lg">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">
            Bu kelimenin anlamı nedir?
          </p>
          <div className="flex items-start gap-3 mb-6">
            <div>
              <h2 className="text-3xl font-bold text-slate-800">{question.word.word}</h2>
              {question.word.pronunciation && (
                <p className="font-mono text-slate-400 text-sm mt-1">/{question.word.pronunciation}/</p>
              )}
            </div>
            {question.word.part_of_speech && (
              <Badge variant="outline" size="sm" className="mt-1 flex-shrink-0">
                {question.word.part_of_speech}
              </Badge>
            )}
          </div>

          <div className="space-y-2">
            {question.options.map((option, i) => {
              const isCorrect = option === question.correct;
              const isSelected = option === selected;
              let style = 'border-slate-100 hover:border-slate-200 hover:bg-slate-50';
              if (revealed) {
                if (isCorrect) style = 'border-emerald-200 bg-emerald-50';
                else if (isSelected) style = 'border-red-200 bg-red-50';
                else style = 'border-slate-100 opacity-50';
              }

              return (
                <button
                  key={i}
                  onClick={() => handleSelect(option)}
                  disabled={revealed}
                  className={clsx(
                    'w-full text-left px-4 py-3 rounded-xl border transition-all duration-150 text-sm font-medium flex items-center gap-3',
                    style
                  )}
                >
                  <span className={clsx(
                    'w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0',
                    revealed && isCorrect ? 'bg-emerald-100 text-emerald-600' :
                    revealed && isSelected ? 'bg-red-100 text-red-500' :
                    'bg-slate-100 text-slate-500'
                  )}>
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span className={clsx(
                    revealed && isCorrect ? 'text-emerald-700' :
                    revealed && isSelected ? 'text-red-600' :
                    'text-slate-700'
                  )}>
                    {option}
                  </span>
                  {revealed && isCorrect && <CheckCircle2 size={16} className="text-emerald-500 ml-auto" />}
                  {revealed && isSelected && !isCorrect && <XCircle size={16} className="text-red-400 ml-auto" />}
                </button>
              );
            })}
          </div>

          {revealed && (
            <Button onClick={handleNext} className="w-full mt-4 animate-fade-in">
              {currentIndex + 1 >= questions.length ? 'Sonuçları Gör' : 'Sonraki Soru →'}
            </Button>
          )}
        </Card>
      </div>
    </div>
  );
}
