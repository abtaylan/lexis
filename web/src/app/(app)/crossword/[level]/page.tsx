'use client';

// app/(app)/crossword/[level]/page.tsx — Çengel Bulmaca oynanış sayfası
// (18 Kasım 2026 kullanıcı isteği; 27 Kasım 2026 kullanıcı isteği: harf
// çarkı tasarımına geçiş). mobile/src/app/(app)/crossword-puzzle.tsx ile
// AYNI mantık — hücre bazlı grid, kesişen kelimeler aynı hücreyi (aynı
// harfi) paylaşır, bir kelimenin tüm hücreleri dolunca otomatik kontrol
// edilir. Artık harfler klavyeyle değil, grid'in altındaki dairesel harf
// çarkına SIRAYLA dokunarak giriliyor (anagram/kelime-oyunu janrı) --
// aktif kelimenin grid hücreleri tam eşleşene kadar BOŞ kalır (çark
// yanındaki ayrı ilerleme kutucukları canlı ilerlemeyi gösterir).
//
// Güvenlik: doğru SIRAYLA cevap istemciye asla gönderilmez — TEK istisna,
// zaten çözülmüş kelimeler (bkz. backend crossword.py _public_words).
// Çarkın kurulabilmesi için her kelimenin harf KÜMESİ (sırası karıştırılmış,
// `letters` alanı) çözülmeden önce de gönderilir -- bu, janrın kendisinin
// gereği (anagram oyunlarında harf havuzu baştan açıktır), cevabın SIRASINI
// vermez.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AxiosError } from 'axios';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Delete,
  Lightbulb,
  Loader2,
  Shuffle,
  Sparkles,
  Trophy,
  Volume2,
} from 'lucide-react';
import { crosswordApi } from '@/lib/api';
import type { CrosswordLevelResponse, CrosswordMode, CrosswordWord } from '@/types';
import { useLocale, type Locale } from '@/lib/i18n';
import { useAuth } from '@/store/auth';

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
    acrossLabel: 'Yatay',
    downLabel: 'Dikey',
    lettersLabel: 'harf',
    shuffleLabel: 'Karıştır',
    backspaceLabel: 'Sil',
    hintBtn: 'İpucu (-10 XP)',
    resultCorrect: 'Doğru',
    resultDefinitionLabel: 'Tanım',
    resultContinue: 'Devam',
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
    acrossLabel: 'Across',
    downLabel: 'Down',
    lettersLabel: 'letters',
    shuffleLabel: 'Shuffle',
    backspaceLabel: 'Delete',
    hintBtn: 'Hint (-10 XP)',
    resultCorrect: 'Correct',
    resultDefinitionLabel: 'Definition',
    resultContinue: 'Continue',
  },
};

// mobile/src/app/(app)/game.tsx ile AYNI harita -- speakWord'ün hangi BCP-47
// kodunu kullanacağını belirler.
const SPEECH_LANG_MAP: Record<string, string> = {
  en: 'en-US',
  tr: 'tr-TR',
  de: 'de-DE',
  fr: 'fr-FR',
  es: 'es-ES',
  it: 'it-IT',
  ja: 'ja-JP',
  ar: 'ar-SA',
  ru: 'ru-RU',
};

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

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

function wheelPositions(count: number, radius: number): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (2 * Math.PI * i) / count - Math.PI / 2;
    out.push({ x: radius * Math.cos(angle), y: radius * Math.sin(angle) });
  }
  return out;
}

// Harf dairelerinin birbirine değip dokunma hedeflerinin çakışmamasi icin
// gereken minimum yaricapi hesaplar (esit araklikli N daire halka
// paketleme formulu). Onceki sabit yaricap (7+ harf icin duz 76) 9-10+
// daireli carklarda (ozellikle celdirici harfler eklendikten sonra, orn.
// DIFFICULT: 9 harf + 2 celdirici = 11 daire) daireleri ust uste bindirip
// bir harfe (orn. "I") dokunulunca yanlis/komsu dairenin tetiklenmesine
// yol aciyordu -- bkz. kullanici raporu, 27 Kasim 2026.
function computeWheelRadius(count: number, circleSize: number): number {
  const baseRadius = count <= 4 ? 52 : count <= 6 ? 64 : 76;
  if (count <= 1) return baseRadius;
  const minGap = 6; // dairelerin birbirine degmemesi icin ek guvenlik payi
  const packingRadius = (circleSize + minGap) / (2 * Math.sin(Math.PI / count));
  return Math.max(baseRadius, packingRadius);
}

// Grid'in altındaki dairesel harf çarkı -- harfler SIRAYLA dokunularak
// seçilir (sürükleme değil, güvenilirlik için dokunma-sırası), seçilen
// harfler arasına bağlantı çizgisi çizilir (bkz. referans ekran görüntüsü).
function LetterWheel({
  letters,
  tapOrder,
  onTap,
  onShuffle,
  disabled,
}: {
  letters: string[];
  tapOrder: number[];
  onTap: (idx: number) => void;
  onShuffle: () => void;
  disabled?: boolean;
}) {
  const circleSize = 44;
  const radius = computeWheelRadius(letters.length, circleSize);
  const size = radius * 2 + circleSize + 16;
  const center = size / 2;
  const positions = useMemo(() => wheelPositions(letters.length, radius), [letters.length, radius]);

  return (
    <div className="relative mx-auto select-none" style={{ width: size, height: size }}>
      <svg className="absolute inset-0 pointer-events-none" width={size} height={size}>
        {tapOrder.map((idx, i) => {
          if (i === 0) return null;
          const prev = positions[tapOrder[i - 1]];
          const cur = positions[idx];
          if (!prev || !cur) return null;
          return (
            <line
              key={idx}
              x1={center + prev.x}
              y1={center + prev.y}
              x2={center + cur.x}
              y2={center + cur.y}
              stroke="#378ADD"
              strokeWidth={3}
              strokeLinecap="round"
            />
          );
        })}
      </svg>
      <button
        type="button"
        disabled={disabled}
        onClick={onShuffle}
        className="absolute flex items-center justify-center rounded-full border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-500 dark:text-slate-400 hover:border-[#378ADD] hover:text-[#378ADD] transition-colors"
        style={{
          width: circleSize,
          height: circleSize,
          left: center - circleSize / 2,
          top: center - circleSize / 2,
          zIndex: 2,
        }}
      >
        <Shuffle className="w-4 h-4" />
      </button>
      {letters.map((ch, i) => {
        const pos = positions[i];
        const order = tapOrder.indexOf(i);
        const isUsed = order !== -1;
        return (
          <button
            key={i}
            type="button"
            disabled={disabled || isUsed}
            onClick={() => onTap(i)}
            className={`absolute flex items-center justify-center rounded-full text-base font-bold border-2 transition-colors ${
              isUsed
                ? 'bg-[#378ADD] border-[#378ADD] text-white'
                : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-800 dark:text-slate-100 hover:border-[#378ADD] active:scale-95'
            }`}
            style={{
              width: circleSize,
              height: circleSize,
              left: center + pos.x - circleSize / 2,
              top: center + pos.y - circleSize / 2,
            }}
          >
            {ch}
            {isUsed && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#534AB7] text-white text-[9px] flex items-center justify-center font-bold">
                {order + 1}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

type ResultPanelState = {
  word: string;
  meaning: string;
  example?: string;
  definition?: string;
  speakText: string;
};

export default function CrosswordPuzzlePage() {
  const { locale } = useLocale();
  const t = L[locale] ?? L.tr!;
  const { user } = useAuth();
  const params = useParams<{ level: string }>();
  const levelNum = Number(params.level) || 1;
  const searchParams = useSearchParams();
  const modeParam = searchParams.get('mode');
  const mode: CrosswordMode = modeParam === 'reverse' || modeParam === 'own_pool' ? modeParam : 'standard';

  const [puzzle, setPuzzle] = useState<CrosswordLevelResponse | null>(null);
  const [error, setError] = useState('');
  const [gridLetters, setGridLetters] = useState<Record<string, string>>({});
  const [solvedWordIds, setSolvedWordIds] = useState<string[]>([]);
  const [activeWordId, setActiveWordId] = useState<string | null>(null);
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [xpToast, setXpToast] = useState<number | null>(null);
  const [completion, setCompletion] = useState<{ xp: number; nextLevel: number | null } | null>(null);

  const [wheelLetters, setWheelLetters] = useState<string[]>([]);
  const [tapOrder, setTapOrder] = useState<number[]>([]);
  const [shakeActive, setShakeActive] = useState(false);
  const [resultPanel, setResultPanel] = useState<ResultPanelState | null>(null);
  const [hintedWordIds, setHintedWordIds] = useState<Set<string>>(new Set());
  const [hintBusy, setHintBusy] = useState(false);
  const [hintXpToast, setHintXpToast] = useState<number | null>(null);

  const speakWord = useCallback(
    (text: string) => {
      if (typeof window === 'undefined' || !window.speechSynthesis || !text) return;
      const langCode = SPEECH_LANG_MAP[user?.learning_lang ?? ''];
      try {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(text);
        if (langCode) utter.lang = langCode;
        utter.onerror = () => {
          if (langCode) {
            try {
              window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
            } catch {
              /* sessiz */
            }
          }
        };
        window.speechSynthesis.speak(utter);
      } catch {
        /* sessiz — tarayıcı TTS desteklemiyor olabilir */
      }
    },
    [user?.learning_lang]
  );

  useEffect(() => {
    setPuzzle(null);
    setGridLetters({});
    setSolvedWordIds([]);
    setActiveWordId(null);
    setCompletion(null);
    setResultPanel(null);
    setHintedWordIds(new Set());
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

  const activeWord = activeWordId ? wordsById.get(activeWordId) : undefined;

  // Aktif kelime (ya da bulmacanın kendisi) değişince çarkı sıfırla --
  // yeni kelimenin harf kümesini (letters, sırası karıştırılmış) karıştırıp
  // dokunma sırasını temizle.
  useEffect(() => {
    if (!activeWord) {
      setWheelLetters([]);
      setTapOrder([]);
      return;
    }
    setWheelLetters(shuffleArray(activeWord.letters));
    setTapOrder([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWordId, puzzle]);

  const handleCheck = useCallback(
    async (wordId: string, answer: string) => {
      setPending((p) => new Set(p).add(wordId));
      try {
        const result = await crosswordApi.attemptWord(levelNum, wordId, answer, mode);
        if (result.correct) {
          setSolvedWordIds((prev) => (prev.includes(wordId) ? prev : [...prev, wordId]));
          const w = wordsById.get(wordId);
          if (w && result.answer) {
            const keys = cellsForWord(w);
            const upper = result.answer.toUpperCase();
            setGridLetters((prev) => {
              const next = { ...prev };
              keys.forEach((key, i) => {
                next[key] = upper[i] ?? '';
              });
              return next;
            });
            setResultPanel({
              word: result.answer,
              meaning: w.clue_text,
              example: result.example,
              definition: result.definition,
              speakText: mode === 'reverse' ? w.clue_text : result.answer,
            });
          }
          if (result.word_xp_awarded > 0) {
            setXpToast(result.word_xp_awarded);
            setTimeout(() => setXpToast(null), 1500);
          }
          if (result.puzzle_complete) {
            setCompletion({ xp: result.completion_xp_awarded, nextLevel: result.next_level });
          }
        } else {
          setShakeActive(true);
          setTimeout(() => setShakeActive(false), 450);
          setTapOrder([]);
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
    [levelNum, mode, wordsById, t.error]
  );

  const handleTapLetter = (idx: number) => {
    if (!activeWord) return;
    setTapOrder((prev) => {
      if (prev.includes(idx)) return prev;
      const next = [...prev, idx];
      if (next.length === activeWord.answer_length) {
        const built = next.map((i) => wheelLetters[i]).join('');
        setTimeout(() => void handleCheck(activeWord.word_id, built), 150);
      }
      return next;
    });
  };

  // İpucu sisteminden dönen harfi, çarkta henüz kullanılmamış eşleşen bir
  // harfe otomatik dokunulmuş gibi ekler -- mevcut dokunma sırası / tam
  // doluncа otomatik kontrol mantığını aynen kullanır.
  const appendHintLetter = (letter: string) => {
    if (!activeWord) return;
    setTapOrder((prev) => {
      const idx = wheelLetters.findIndex((ch, i) => ch === letter && !prev.includes(i));
      if (idx === -1) return prev;
      const next = [...prev, idx];
      if (next.length === activeWord.answer_length) {
        const built = next.map((i) => wheelLetters[i]).join('');
        setTimeout(() => void handleCheck(activeWord.word_id, built), 150);
      }
      return next;
    });
  };

  // 27 Kasım 2026 kullanıcı isteği -- ipucu satın alma sistemi: bir kelime
  // için ilk ipucu XP harcar (backend HINT_XP_COST), aynı kelime için
  // sonraki ipuçları reklam gerektirir (web'de reklam altyapısı yok, bu
  // yüzden ilk ipucu kullanılınca buton gizlenir -- bkz. mobile'daki reklam
  // akışı). hintedWordIds yalnızca iyimser (optimistic) istemci durumu;
  // asıl doğrulama backend'de (user_crossword_sessions.hinted_word_ids).
  const handleHint = async () => {
    if (!activeWord || hintBusy) return;
    setHintBusy(true);
    try {
      const res = await crosswordApi.hint(levelNum, activeWord.word_id, tapOrder.length, false, mode);
      setHintedWordIds((prev) => new Set(prev).add(activeWord.word_id));
      if (res.xp_spent > 0) {
        setHintXpToast(res.xp_spent);
        setTimeout(() => setHintXpToast(null), 1500);
      }
      appendHintLetter(res.letter);
    } catch (err) {
      const detail = errorDetail(err);
      if (detail && detail.includes('reklam')) {
        setHintedWordIds((prev) => new Set(prev).add(activeWord.word_id));
      }
      setError(detail || t.error);
    } finally {
      setHintBusy(false);
    }
  };

  const selectWord = (wordId: string) => {
    setActiveWordId(wordId);
  };

  const handleCellClick = (key: string) => {
    const owners = cellMap.get(key) ?? [];
    if (owners.length === 0) return;
    const unsolved = owners.find((id) => !solvedWordIds.includes(id));
    setActiveWordId(unsolved ?? owners[0]);
  };

  const handleContinue = () => {
    setResultPanel(null);
    if (completion) return;
    const currentIdx = wordsSorted.findIndex((w) => w.word_id === activeWordId);
    const next =
      wordsSorted.slice(currentIdx + 1).find((w) => !solvedWordIds.includes(w.word_id)) ??
      wordsSorted.find((w) => !solvedWordIds.includes(w.word_id));
    if (next) setActiveWordId(next.word_id);
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

      {completion && !resultPanel && (
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

      {(!completion || resultPanel) && (
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
                  const number = numberAt.get(key);

                  const borderCls = isActive
                    ? 'border-[#378ADD]'
                    : isSolved
                      ? 'border-[#3B6D11]/40'
                      : 'border-gray-200 dark:border-slate-700';
                  const bgCls = isSolved
                    ? 'bg-[#EAF3DE] dark:bg-[#182B10]'
                    : isActive
                      ? 'bg-[#E6F1FB] dark:bg-blue-500/10'
                      : 'bg-white dark:bg-slate-900';

                  return (
                    <div
                      key={key}
                      style={{ width: CELL, height: CELL }}
                      onClick={() => handleCellClick(key)}
                      className={`relative border-2 cursor-pointer ${borderCls} ${bgCls} flex items-center justify-center`}
                    >
                      {!!number && (
                        <span className="absolute top-0 left-0.5 text-[8px] font-semibold text-gray-400 dark:text-slate-500">
                          {number}
                        </span>
                      )}
                      <span
                        className={`font-bold text-sm ${
                          isSolved ? 'text-[#3B6D11]' : 'text-gray-900 dark:text-slate-100'
                        }`}
                      >
                        {gridLetters[key] ?? ''}
                      </span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {resultPanel && (
        <div className="rounded-2xl bg-[#EAF3DE] dark:bg-[#132111] border border-[#3B6D11]/30 px-5 py-6 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-[#3B6D11] dark:text-[#8FCB5C] font-bold text-sm">
            <CheckCircle2 className="w-4 h-4" />
            {t.resultCorrect}
          </div>
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-extrabold text-gray-900 dark:text-slate-100">{resultPanel.word}</h3>
            <button
              type="button"
              onClick={() => speakWord(resultPanel.speakText)}
              className="w-7 h-7 rounded-full flex items-center justify-center bg-white/70 dark:bg-slate-800 text-[#378ADD]"
            >
              <Volume2 className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-sm font-semibold text-[#378ADD] dark:text-[#8B82E8]">{resultPanel.meaning}</p>
          {resultPanel.example && (
            <p className="text-sm text-gray-600 dark:text-slate-400 italic">&ldquo;{resultPanel.example}&rdquo;</p>
          )}
          {resultPanel.definition && (
            <div className="text-xs text-gray-500 dark:text-slate-500 border-t border-[#3B6D11]/20 pt-2">
              <span className="font-semibold">{t.resultDefinitionLabel}: </span>
              {resultPanel.definition}
            </div>
          )}
          <button
            type="button"
            onClick={handleContinue}
            className="mt-2 w-full rounded-xl bg-[#378ADD] text-white text-sm font-semibold py-3 hover:bg-[#2F73B8] transition-colors"
          >
            {t.resultContinue} →
          </button>
        </div>
      )}

      {!completion && !resultPanel && activeWord && (
        <div className="flex flex-col items-center gap-4 py-2">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-slate-400">
            {activeWord.direction === 'across' ? <ArrowRight className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
            <span>
              {activeWord.direction === 'across' ? t.acrossLabel : t.downLabel} · {activeWord.answer_length} {t.lettersLabel}
            </span>
          </div>
          <p className="text-sm text-gray-700 dark:text-slate-300 text-center max-w-xs">{activeWord.clue_text}</p>

          <div className="flex gap-1.5">
            {Array.from({ length: activeWord.answer_length }, (_, i) => (
              <div
                key={i}
                className={`w-8 h-8 rounded-md border-2 flex items-center justify-center text-sm font-bold ${
                  shakeActive
                    ? 'border-red-400 bg-red-50 dark:bg-red-500/10'
                    : 'border-[#378ADD] bg-[#E6F1FB] dark:bg-blue-500/10'
                }`}
              >
                {tapOrder[i] !== undefined ? wheelLetters[tapOrder[i]] : ''}
              </div>
            ))}
          </div>

          <LetterWheel
            letters={wheelLetters}
            tapOrder={tapOrder}
            disabled={pending.has(activeWord.word_id)}
            onTap={handleTapLetter}
            onShuffle={() => {
              setWheelLetters((prev) => shuffleArray(prev));
              setTapOrder([]);
            }}
          />

          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={tapOrder.length === 0}
              onClick={() => setTapOrder((prev) => prev.slice(0, -1))}
              className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-slate-400 hover:text-[#378ADD] disabled:opacity-40 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800"
            >
              <Delete className="w-3.5 h-3.5" />
              {t.backspaceLabel}
            </button>
            {!hintedWordIds.has(activeWord.word_id) && (
              <button
                type="button"
                disabled={hintBusy}
                onClick={() => void handleHint()}
                className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-slate-400 hover:text-[#378ADD] disabled:opacity-40 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800"
              >
                <Lightbulb className="w-3.5 h-3.5" />
                {t.hintBtn}
              </button>
            )}
          </div>
        </div>
      )}

      {!completion && !resultPanel && (
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

      {hintXpToast !== null && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-gray-700 text-white text-sm font-bold px-4 py-2 rounded-full shadow-lg">
          <Lightbulb className="w-3.5 h-3.5" />-{hintXpToast} XP
        </div>
      )}
    </div>
  );
}
