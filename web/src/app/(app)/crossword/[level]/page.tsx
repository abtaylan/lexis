'use client';

// app/(app)/crossword/[level]/page.tsx — Çengel Bulmaca oynanış sayfası
// (18 Kasım 2026 kullanıcı isteği). mobile/src/app/(app)/crossword-puzzle.tsx
// ile AYNI mantık — hücre bazlı grid, kesişen kelimeler aynı hücreyi (aynı
// harfi) paylaşır, bir kelimenin tüm hücreleri dolunca otomatik kontrol
// edilir. Güvenlik: cevaplar istemciye asla gönderilmez — TEK istisna,
// zaten çözülmüş kelimeler (bkz. backend crossword.py _public_words).

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AxiosError } from 'axios';
import { ArrowDown, ArrowLeft, ArrowRight, CheckCircle2, Loader2, Sparkles, Trophy } from 'lucide-react';
import { crosswordApi } from '@/lib/api';
import type { CrosswordLevelResponse, CrosswordMode, CrosswordWord } from '@/types';
import { useLocale, type Locale } from '@/lib/i18n';

function errorDetail(err: unknown): string | undefined {
  if (err instanceof AxiosError) {
    return (err.response?.data as { detail?: string } | undefined)?.detail;
  }
  return undefined;
}

const L: Partial<Record<Locale, Record<string, string>>> = {
  tr: {
    error: 'Bir şeyler ters gitti.',
    levelLabel: 'Seviye',
    progressTpl: '{solved}/{total} kelime',
    completeTitle: 'Bulmacayı bitirdin! 🎉',
    completeBonusTpl: '+{xp} XP bonus',
    nextLevelBtn: 'Sonraki Seviyeye Geç',
    backToListBtn: 'Seviye Listesine Dön',
    allDoneTitle: 'Tüm seviyeleri bitirdin! 🏆',
  },
  en: {
    error: 'Something went wrong.',
    levelLabel: 'Level',
    progressTpl: '{solved}/{total} words',
    completeTitle: 'Puzzle complete! 🎉',
    completeBonusTpl: '+{xp} XP bonus',
    nextLevelBtn: 'Go to Next Level',
    backToListBtn: 'Back to Level List',
    allDoneTitle: "You've finished every level! 🏆",
  },
};

const CELL = 34;

function cellsForWord(w: CrosswordWord): string[] {
  const keys: string[] = [];
  for (let i = 0; i < w.answer_length; i++) {
    const r = w.row_start + (w.direction === 'down' ? i : 0);
    const col = w.col_start + (w.direction === 'across' ? i : 0);
    keys.push(`${r},${col}`);
  }
  return keys;
}

export default function CrosswordPuzzlePage() {
  const { locale } = useLocale();
  const t = L[locale] ?? L.tr!;
  const params = useParams<{ level: string }>();
  const levelNum = Number(params.level) || 1;
  // 23 Kasım 2026 kullanıcı isteği -- hangi moddan (standard/reverse/
  // own_pool) geldiği ?mode= query param'ından okunur (bkz. crossword/page.tsx
  // seviye linkleri), mobile/src/app/(app)/crossword-puzzle.tsx ile aynı desen.
  const searchParams = useSearchParams();
  const modeParam = searchParams.get('mode');
  const mode: CrosswordMode = modeParam === 'reverse' || modeParam === 'own_pool' ? modeParam : 'standard';

  const [puzzle, setPuzzle] = useState<CrosswordLevelResponse | null>(null);
  const [error, setError] = useState('');
  const [gridLetters, setGridLetters] = useState<Record<string, string>>({});
  const [solvedWordIds, setSolvedWordIds] = useState<string[]>([]);
  const [activeWordId, setActiveWordId] = useState<string | null>(null);
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [shakeKeys, setShakeKeys] = useState<Set<string>>(new Set());
  const [xpToast, setXpToast] = useState<number | null>(null);
  const [completion, setCompletion] = useState<{ xp: number; nextLevel: number | null } | null>(null);

  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    setPuzzle(null);
    setGridLetters({});
    setSolvedWordIds([]);
    setActiveWordId(null);
    setCompletion(null);
    crosswordApi
      .level(levelNum, mode)
      .then((res) => {
        setPuzzle(res);
        setSolvedWordIds(res.solved_word_ids);
        const prefill: Record<string, string> = {};
        for (const w of res.words) {
          if (w.answer) {
            cellsForWord(w).forEach((key, i) => {
              prefill[key] = w.answer![i]?.toUpperCase() ?? '';
            });
          }
        }
        setGridLetters(prefill);
        const sorted = [...res.words].sort((a, b) => a.row_start - b.row_start || a.col_start - b.col_start);
        const firstUnsolved = sorted.find((w) => !res.solved_word_ids.includes(w.word_id));
        setActiveWordId((firstUnsolved ?? sorted[0])?.word_id ?? null);
      })
      .catch((err) => setError(errorDetail(err) || t.error));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [levelNum, mode]);

  const { cellMap, numberAt, wordsById, wordsSorted } = useMemo(() => {
    const cellMapLocal = new Map<string, string[]>();
    const words = puzzle?.words ?? [];
    for (const w of words) {
      for (const key of cellsForWord(w)) {
        const arr = cellMapLocal.get(key) ?? [];
        arr.push(w.word_id);
        cellMapLocal.set(key, arr);
      }
    }
    const sorted = [...words].sort((a, b) => a.row_start - b.row_start || a.col_start - b.col_start);
    const numberAtLocal = new Map<string, number>();
    let n = 1;
    for (const w of sorted) {
      const key = `${w.row_start},${w.col_start}`;
      if (!numberAtLocal.has(key)) {
        numberAtLocal.set(key, n);
        n++;
      }
    }
    return {
      cellMap: cellMapLocal,
      numberAt: numberAtLocal,
      wordsById: new Map(words.map((w) => [w.word_id, w])),
      wordsSorted: sorted,
    };
  }, [puzzle]);

  const handleCheck = useCallback(
    async (wordId: string, answer: string) => {
      setPending((p) => new Set(p).add(wordId));
      try {
        const result = await crosswordApi.attemptWord(levelNum, wordId, answer, mode);
        if (result.correct) {
          setSolvedWordIds((prev) => (prev.includes(wordId) ? prev : [...prev, wordId]));
          if (result.word_xp_awarded > 0) {
            setXpToast(result.word_xp_awarded);
            setTimeout(() => setXpToast(null), 1500);
          }
          if (result.puzzle_complete) {
            setCompletion({ xp: result.completion_xp_awarded, nextLevel: result.next_level });
          }
        } else {
          const w = wordsById.get(wordId);
          if (w) {
            const keys = cellsForWord(w);
            setShakeKeys(new Set(keys));
            setTimeout(() => setShakeKeys(new Set()), 450);
            setGridLetters((prev) => {
              const next = { ...prev };
              for (const key of keys) {
                const owners = cellMap.get(key) ?? [];
                const confirmedElsewhere = owners.some((oid) => oid !== wordId && solvedWordIds.includes(oid));
                if (!confirmedElsewhere) delete next[key];
              }
              return next;
            });
          }
        }
      } catch (err) {
        setError(errorDetail(err) || t.error);
      } finally {
        setPending((p) => {
          const next = new Set(p);
          next.delete(wordId);
          return next;
        });
      }
    },
    [levelNum, mode, wordsById, cellMap, solvedWordIds, t.error]
  );

  useEffect(() => {
    if (!puzzle || completion) return;
    for (const w of puzzle.words) {
      if (solvedWordIds.includes(w.word_id) || pending.has(w.word_id)) continue;
      const keys = cellsForWord(w);
      const filled = keys.every((key) => (gridLetters[key] ?? '').length === 1);
      if (filled) {
        void handleCheck(w.word_id, keys.map((key) => gridLetters[key]).join(''));
        break;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gridLetters]);

  const selectWord = (wordId: string) => {
    setActiveWordId(wordId);
    const w = wordsById.get(wordId);
    if (!w) return;
    const keys = cellsForWord(w);
    const firstEmpty = keys.find((key) => !gridLetters[key]) ?? keys[0];
    requestAnimationFrame(() => inputRefs.current[firstEmpty]?.focus());
  };

  const handleCellFocus = (key: string) => {
    const wordIds = cellMap.get(key) ?? [];
    if (wordIds.length === 0) return;
    if (activeWordId && wordIds.includes(activeWordId)) return;
    const unsolved = wordIds.find((id) => !solvedWordIds.includes(id));
    setActiveWordId(unsolved ?? wordIds[0]);
  };

  const handleChangeCell = (key: string, idx: number, raw: string) => {
    const word = activeWordId ? wordsById.get(activeWordId) : undefined;
    const letter = raw.slice(-1).toUpperCase();
    setGridLetters((prev) => ({ ...prev, [key]: letter }));
    if (letter && word && idx < word.answer_length - 1) {
      const nextKey = cellsForWord(word)[idx + 1];
      inputRefs.current[nextKey]?.focus();
    }
  };

  const handleKeyDown = (key: string, idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Backspace' || gridLetters[key] || idx <= 0) return;
    const word = activeWordId ? wordsById.get(activeWordId) : undefined;
    if (!word) return;
    const prevKey = cellsForWord(word)[idx - 1];
    inputRefs.current[prevKey]?.focus();
  };

  if (!puzzle && !error) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 flex items-center justify-center text-gray-400 dark:text-slate-500">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (error && !puzzle) {
    return <p className="max-w-3xl mx-auto px-4 py-6 text-sm text-red-500 text-center">{error}</p>;
  }

  if (!puzzle) return null;

  const activeWord = activeWordId ? wordsById.get(activeWordId) : undefined;
  const activeWordKeys = activeWord ? new Set(cellsForWord(activeWord)) : new Set<string>();

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 flex flex-col gap-5 relative">
      <div className="flex items-center gap-3">
        <Link
          href={`/crossword?mode=${mode}`}
          className="w-9 h-9 rounded-full flex items-center justify-center bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700"
        >
          <ArrowLeft className="w-4.5 h-4.5" />
        </Link>
        <div>
          <h1 className="text-lg font-bold text-gray-900 dark:text-slate-100">
            {t.levelLabel} {puzzle.level}
          </h1>
          <p className="text-xs text-[#534AB7] dark:text-[#8B82E8] font-semibold">{puzzle.tier_name}</p>
        </div>
        <span className="ml-auto text-xs text-gray-400 dark:text-slate-500">
          {t.progressTpl.replace('{solved}', String(solvedWordIds.length)).replace('{total}', String(puzzle.words.length))}
        </span>
      </div>

      {completion && (
        <div className="rounded-2xl bg-[#EAF3DE] border border-[#3B6D11]/30 px-4 py-6 flex flex-col items-center gap-2 text-center">
          <Trophy className="w-8 h-8 text-[#3B6D11]" />
          <p className="text-base font-bold text-[#3B6D11]">{t.completeTitle}</p>
          <p className="text-sm font-semibold text-[#3B6D11]">{t.completeBonusTpl.replace('{xp}', String(completion.xp))}</p>
          <div className="w-full flex flex-col gap-2 mt-3 max-w-xs">
            {completion.nextLevel ? (
              <Link
                href={`/crossword/${completion.nextLevel}?mode=${mode}`}
                className="w-full text-center rounded-xl bg-[#378ADD] text-white text-sm font-semibold py-3 hover:bg-[#2F73B8] transition-colors"
              >
                {t.nextLevelBtn}
              </Link>
            ) : (
              <p className="text-sm font-semibold text-[#3B6D11]">{t.allDoneTitle}</p>
            )}
            <Link
              href={`/crossword?mode=${mode}`}
              className="w-full text-center rounded-xl bg-[#E6F1FB] text-[#378ADD] text-sm font-semibold py-3 hover:bg-[#d7e9f9] transition-colors"
            >
              {t.backToListBtn}
            </Link>
          </div>
        </div>
      )}

      {!completion && (
        <div className="overflow-x-auto pb-2">
          <div className="inline-block">
            {Array.from({ length: puzzle.grid_height }, (_, row) => (
              <div key={row} className="flex">
                {Array.from({ length: puzzle.grid_width }, (_, col) => {
                  const key = `${row},${col}`;
                  const owners = cellMap.get(key);
                  if (!owners) return <div key={key} style={{ width: CELL, height: CELL }} />;

                  const isSolved = owners.some((id) => solvedWordIds.includes(id));
                  const isActive = activeWordKeys.has(key) && !isSolved;
                  const isShaking = shakeKeys.has(key);
                  const number = numberAt.get(key);
                  const wordIdxForActive = activeWord ? cellsForWord(activeWord).indexOf(key) : -1;

                  const borderCls = isShaking
                    ? 'border-red-400'
                    : isActive
                      ? 'border-[#378ADD]'
                      : isSolved
                        ? 'border-[#3B6D11]/40'
                        : 'border-gray-200 dark:border-slate-700';
                  const bgCls = isShaking
                    ? 'bg-red-50 dark:bg-red-500/10'
                    : isSolved
                      ? 'bg-[#EAF3DE] dark:bg-[#182B10]'
                      : isActive
                        ? 'bg-[#E6F1FB] dark:bg-blue-500/10'
                        : 'bg-white dark:bg-slate-900';

                  return (
                    <div
                      key={key}
                      style={{ width: CELL, height: CELL }}
                      className={`relative border-2 ${borderCls} ${bgCls} flex items-center justify-center`}
                    >
                      {!!number && (
                        <span className="absolute top-0 left-0.5 text-[8px] font-semibold text-gray-400 dark:text-slate-500">
                          {number}
                        </span>
                      )}
                      <input
                        ref={(el) => {
                          inputRefs.current[key] = el;
                        }}
                        value={gridLetters[key] ?? ''}
                        disabled={isSolved}
                        maxLength={1}
                        onFocus={() => handleCellFocus(key)}
                        onChange={(e) => handleChangeCell(key, wordIdxForActive, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(key, wordIdxForActive, e)}
                        className={`w-full h-full text-center font-bold text-sm uppercase bg-transparent outline-none ${
                          isSolved ? 'text-[#3B6D11]' : 'text-gray-900 dark:text-slate-100'
                        }`}
                      />
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {!completion && (
        <div className="flex flex-col gap-1">
          {wordsSorted.map((w) => {
            const isSolved = solvedWordIds.includes(w.word_id);
            const isActive = w.word_id === activeWordId;
            return (
              <button
                key={w.word_id}
                onClick={() => selectWord(w.word_id)}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-sm transition-colors ${
                  isActive
                    ? 'bg-[#E6F1FB] dark:bg-blue-500/10 border border-[#378ADD]'
                    : 'border border-transparent hover:bg-gray-50 dark:hover:bg-slate-800'
                }`}
              >
                <span className="text-[11px] text-gray-400 dark:text-slate-500 w-4">
                  {numberAt.get(`${w.row_start},${w.col_start}`)}
                </span>
                {w.direction === 'across' ? (
                  <ArrowRight className="w-3.5 h-3.5 text-gray-400 dark:text-slate-500 shrink-0" />
                ) : (
                  <ArrowDown className="w-3.5 h-3.5 text-gray-400 dark:text-slate-500 shrink-0" />
                )}
                <span className={`flex-1 truncate ${isSolved ? 'text-[#3B6D11]' : 'text-gray-700 dark:text-slate-300'}`}>
                  {w.clue_text}
                </span>
                {isSolved && <CheckCircle2 className="w-4 h-4 text-[#3B6D11] shrink-0" />}
              </button>
            );
          })}
        </div>
      )}

      {error && <p className="text-sm text-red-500 text-center">{error}</p>}

      {xpToast !== null && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-[#534AB7] text-white text-sm font-bold px-4 py-2 rounded-full shadow-lg">
          <Sparkles className="w-3.5 h-3.5" />+{xpToast} XP
        </div>
      )}
    </div>
  );
}
