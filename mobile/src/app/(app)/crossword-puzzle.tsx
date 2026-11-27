// src/app/(app)/crossword-puzzle.tsx — Çengel Bulmaca oynanış ekranı
// (18 Kasım 2026 kullanıcı isteği; 27 Kasım 2026 kullanıcı isteği: harf
// çarkı tasarımına geçiş). web/src/app/(app)/crossword/[level]/page.tsx ile
// AYNI mantık — artık harfler klavyeyle değil, grid'in altındaki dairesel
// harf çarkına SIRAYLA dokunarak giriliyor (anagram/kelime-oyunu janrı).
// Aktif kelimenin grid hücreleri tam eşleşene kadar BOŞ kalır (çark
// yanındaki ayrı ilerleme kutucukları canlı ilerlemeyi gösterir).
//
// Güvenlik: doğru cevaplar istemciye asla gönderilmez (bkz. backend
// crossword.py) — TEK istisna, zaten çözülmüş kelimeler. Çarkın
// kurulabilmesi için her kelimenin harf KÜMESİ (sırası karıştırılmış,
// `letters` alanı) çözülmeden önce de gönderilir — anagram/kelime-oyunu
// janrında standart davranış, doğru SIRAYI vermez.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Line } from 'react-native-svg';
import { router, useLocalSearchParams } from 'expo-router';
import * as Speech from 'expo-speech';
import { ArrowDown, ArrowRight, CheckCircle2, Delete, Lightbulb, Shuffle, Sparkles, Trophy, Volume2 } from 'lucide-react-native';
import { useLocale } from '@/i18n';
import { useAuth } from '@/store/auth';
import { crosswordApi } from '@/api/crossword';
import { isRewardedAvailable, showRewardedAd } from '@/lib/adsManager';
import type { CrosswordLevelResponse, CrosswordMode, CrosswordWord } from '@/api/types';
import { useThemeColors } from '@/hooks/useThemeColors';
import { radius, spacing } from '@/constants/theme';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { ScreenNavBar } from '@/components/ui/ScreenNavBar';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

const L: Record<'tr' | 'en', Record<string, string>> = {
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
    hintAdBtn: 'Reklam izle, ipucu al',
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
    hintAdBtn: 'Watch ad for a hint',
    resultCorrect: 'Correct',
    resultDefinitionLabel: 'Definition',
    resultContinue: 'Continue',
  },
};

// web/src/app/(app)/crossword/[level]/page.tsx ve mobile/src/app/(app)/
// game.tsx ile AYNI harita -- speakWord'ün hangi BCP-47 kodunu kullanacağını
// belirler.
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

function errorDetail(err: unknown): string {
  const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
  return typeof detail === 'string' ? detail : '';
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const CELL = 30;

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

// Grid'in altındaki dairesel harf çarkı -- harfler SIRAYLA dokunularak
// seçilir, seçilen harfler arasına bağlantı çizgisi çizilir (bkz.
// web/src/app/(app)/crossword/[level]/page.tsx'teki AYNI bileşen).
function LetterWheel({
  letters,
  tapOrder,
  onTap,
  onShuffle,
  disabled,
  c,
}: {
  letters: string[];
  tapOrder: number[];
  onTap: (idx: number) => void;
  onShuffle: () => void;
  disabled?: boolean;
  c: ReturnType<typeof useThemeColors>;
}) {
  const circleRadius = letters.length <= 4 ? 52 : letters.length <= 6 ? 64 : 76;
  const circleSize = 44;
  const size = circleRadius * 2 + circleSize + 16;
  const center = size / 2;
  const positions = useMemo(() => wheelPositions(letters.length, circleRadius), [letters.length, circleRadius]);

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill} pointerEvents="none">
        {tapOrder.map((idx, i) => {
          if (i === 0) return null;
          const prev = positions[tapOrder[i - 1]];
          const cur = positions[idx];
          if (!prev || !cur) return null;
          return (
            <Line
              key={idx}
              x1={center + prev.x}
              y1={center + prev.y}
              x2={center + cur.x}
              y2={center + cur.y}
              stroke={c.primary}
              strokeWidth={3}
              strokeLinecap="round"
            />
          );
        })}
      </Svg>
      <Pressable
        disabled={disabled}
        onPress={onShuffle}
        style={[
          styles.wheelCenterBtn,
          {
            width: circleSize,
            height: circleSize,
            borderRadius: circleSize / 2,
            left: center - circleSize / 2,
            top: center - circleSize / 2,
            backgroundColor: c.surface,
            borderColor: c.border,
          },
        ]}
      >
        <Shuffle color={c.textMuted} size={16} />
      </Pressable>
      {letters.map((ch, i) => {
        const pos = positions[i];
        const order = tapOrder.indexOf(i);
        const isUsed = order !== -1;
        return (
          <Pressable
            key={i}
            disabled={disabled || isUsed}
            onPress={() => onTap(i)}
            style={[
              styles.wheelCircle,
              {
                width: circleSize,
                height: circleSize,
                borderRadius: circleSize / 2,
                left: center + pos.x - circleSize / 2,
                top: center + pos.y - circleSize / 2,
                backgroundColor: isUsed ? c.primary : c.surface,
                borderColor: isUsed ? c.primary : c.border,
              },
            ]}
          >
            <Text style={{ fontSize: 16, fontWeight: '700', color: isUsed ? '#FFFFFF' : c.text }}>{ch}</Text>
            {isUsed && (
              <View style={[styles.wheelBadge, { backgroundColor: c.accent }]}>
                <Text style={styles.wheelBadgeText}>{order + 1}</Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

type ResultPanelState = {
  word: string;
  meaning: string;
  example?: string;
  definition?: string;
  speakText: string;
};

export default function CrosswordPuzzleScreen() {
  const c = useThemeColors();
  const { locale } = useLocale();
  const t = L[locale === 'tr' ? 'tr' : 'en'];
  const { user } = useAuth();
  const { level: levelParam, mode: modeParam } = useLocalSearchParams<{ level: string; mode?: string }>();
  const levelNum = Number(levelParam) || 1;
  const mode: CrosswordMode =
    modeParam === 'reverse' || modeParam === 'own_pool' ? modeParam : 'standard';

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
  const [adAvailable, setAdAvailable] = useState(false);

  // mobile/src/app/(app)/game.tsx'teki speakWord ile AYNI desen.
  const speakWord = (text: string) => {
    if (!text) return;
    const langCode = SPEECH_LANG_MAP[user?.learning_lang ?? ''];
    try {
      Speech.stop();
      Speech.speak(text, {
        language: langCode,
        onError: () => {
          if (langCode) {
            try {
              Speech.speak(text);
            } catch {
              /* sessiz */
            }
          }
        },
      });
    } catch {
      /* sessiz — cihaz TTS desteklemiyor olabilir */
    }
  };

  // İpucu sisteminde, ilk ipucu kullanılmış bir kelime için ikinci (ve
  // sonraki) ipuçları ödüllü reklam gerektirir (bkz. RewardedAdButton.tsx
  // ile aynı yoklama deseni) -- reklam arka planda yükleniyor olabilir.
  useEffect(() => {
    const check = () => setAdAvailable(isRewardedAvailable());
    check();
    const id = setInterval(check, 2000);
    return () => clearInterval(id);
  }, []);

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

  // Aktif kelime (ya da bulmacanın kendisi) değişince çarkı sıfırla.
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
      } catch {
        setError(t.error);
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
  // doluncа otomatik kontrol mantığını aynen kullanır (bkz. web/src/app/
  // (app)/crossword/[level]/page.tsx'teki AYNI fonksiyon).
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
  // sonraki ipuçları ödüllü reklam gerektirir. hintedWordIds yalnızca
  // iyimser (optimistic) istemci durumu; asıl doğrulama backend'de
  // (user_crossword_sessions.hinted_word_ids) -- backend 400 dönerse ("...
  // reklam izlemeyi gerektiriyor") istemci durumunu buna göre düzeltiyoruz.
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

  const handleHintAd = async () => {
    if (!activeWord || hintBusy) return;
    setHintBusy(true);
    try {
      const watched = await showRewardedAd();
      if (!watched) return;
      const res = await crosswordApi.hint(levelNum, activeWord.word_id, tapOrder.length, true, mode);
      if (res.xp_spent > 0) {
        setHintXpToast(res.xp_spent);
        setTimeout(() => setHintXpToast(null), 1500);
      }
      appendHintLetter(res.letter);
    } catch (err) {
      setError(errorDetail(err) || t.error);
    } finally {
      setHintBusy(false);
    }
  };

  const selectWord = (wordId: string) => {
    setActiveWordId(wordId);
  };

  const handleCellPress = (key: string) => {
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
      <ScreenContainer>
        <ScreenNavBar />
        <View style={{ paddingVertical: spacing.xl * 2, alignItems: 'center' }}>
          <ActivityIndicator color={c.primary} />
        </View>
      </ScreenContainer>
    );
  }

  if (error && !puzzle) {
    return (
      <ScreenContainer>
        <ScreenNavBar />
        <Text style={{ color: c.danger, textAlign: 'center', marginTop: spacing.md }}>{error}</Text>
      </ScreenContainer>
    );
  }

  if (!puzzle) return null;

  const activeWordKeys = activeWord ? new Set(cellsForWord(activeWord)) : new Set<string>();

  return (
    <ScreenContainer>
      <ScreenNavBar />
      <View style={styles.headerRow}>
        <Text style={[styles.h1, { color: c.text }]}>
          {t.levelLabel} {puzzle.level}
        </Text>
        <Text style={{ color: c.textMuted, fontSize: 12 }}>
          {t.progressTpl.replace('{solved}', String(solvedWordIds.length)).replace('{total}', String(puzzle.words.length))}
        </Text>
      </View>
      <Text style={{ color: c.accent, fontSize: 12, fontWeight: '600', marginBottom: spacing.md }}>{puzzle.tier_name}</Text>

      {completion && !resultPanel && (
        <Card style={{ backgroundColor: c.successSoft, borderColor: c.success, alignItems: 'center', marginBottom: spacing.lg }}>
          <Trophy color={c.success} size={28} />
          <Text style={{ color: c.success, fontWeight: '700', fontSize: 16, marginTop: 6 }}>{t.completeTitle}</Text>
          <Text style={{ color: c.success, fontWeight: '600', fontSize: 13, marginTop: 2 }}>
            {t.completeBonusTpl.replace('{xp}', String(completion.xp))}
          </Text>
          <View style={{ marginTop: spacing.md, width: '100%', gap: spacing.sm }}>
            {completion.nextLevel ? (
              <Button
                title={t.nextLevelBtn}
                onPress={() =>
                  router.replace({
                    pathname: '/(app)/crossword-puzzle',
                    params: { level: String(completion.nextLevel), mode },
                  })
                }
              />
            ) : (
              <Text style={{ color: c.success, textAlign: 'center', fontWeight: '600' }}>{t.allDoneTitle}</Text>
            )}
            <Button title={t.backToListBtn} variant="secondary" onPress={() => router.back()} />
          </View>
        </Card>
      )}

      {(!completion || resultPanel) && (
        <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={{ paddingBottom: spacing.sm }}>
          <View>
            {Array.from({ length: puzzle.grid_height }, (_, row) => (
              <View key={row} style={{ flexDirection: 'row' }}>
                {Array.from({ length: puzzle.grid_width }, (_, col) => {
                  const key = `${row},${col}`;
                  const owners = cellMap.get(key);
                  if (!owners) return <View key={key} style={{ width: CELL, height: CELL }} />;

                  const isSolved = owners.some((id) => solvedWordIds.includes(id));
                  const isActive = activeWordKeys.has(key) && !isSolved;
                  const number = numberAt.get(key);

                  return (
                    <Pressable
                      key={key}
                      onPress={() => handleCellPress(key)}
                      style={[
                        styles.cell,
                        {
                          borderColor: isActive ? c.primary : isSolved ? c.success : c.border,
                          backgroundColor: isSolved ? c.successSoft : isActive ? c.primarySoft : c.surface,
                        },
                      ]}
                    >
                      {!!number && <Text style={[styles.cellNumber, { color: c.textMuted }]}>{number}</Text>}
                      <Text style={[styles.cellLetter, { color: isSolved ? c.success : c.text }]}>
                        {gridLetters[key] ?? ''}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      {resultPanel && (
        <Card style={{ backgroundColor: c.successSoft, borderColor: c.success, marginTop: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <CheckCircle2 color={c.success} size={16} />
            <Text style={{ color: c.success, fontWeight: '700', fontSize: 13 }}>{t.resultCorrect}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: spacing.sm }}>
            <Text style={{ color: c.text, fontSize: 20, fontWeight: '800' }}>
              {resultPanel.word}
            </Text>
            <Pressable onPress={() => speakWord(resultPanel.speakText)} style={[styles.speakBtn, { backgroundColor: c.surface }]}>
              <Volume2 color={c.primary} size={14} />
            </Pressable>
          </View>
          <Text style={{ color: c.primary, fontWeight: '600', fontSize: 13, marginTop: 4 }}>{resultPanel.meaning}</Text>
          {!!resultPanel.example && (
            <Text style={{ color: c.textSecondary, fontSize: 13, fontStyle: 'italic', marginTop: spacing.sm }}>
              “{resultPanel.example}”
            </Text>
          )}
          {!!resultPanel.definition && (
            <View style={{ borderTopWidth: 1, borderTopColor: c.border, marginTop: spacing.sm, paddingTop: spacing.sm }}>
              <Text style={{ color: c.textMuted, fontSize: 12 }}>
                <Text style={{ fontWeight: '700' }}>{t.resultDefinitionLabel}: </Text>
                {resultPanel.definition}
              </Text>
            </View>
          )}
          <View style={{ marginTop: spacing.md }}>
            <Button title={`${t.resultContinue} →`} onPress={handleContinue} />
          </View>
        </Card>
      )}

      {!completion && !resultPanel && activeWord && (
        <View style={{ alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {activeWord.direction === 'across' ? (
              <ArrowRight color={c.textMuted} size={14} />
            ) : (
              <ArrowDown color={c.textMuted} size={14} />
            )}
            <Text style={{ color: c.textMuted, fontSize: 13 }}>
              {activeWord.direction === 'across' ? t.acrossLabel : t.downLabel} · {activeWord.answer_length} {t.lettersLabel}
            </Text>
          </View>
          <Text style={{ color: c.text, fontSize: 13, textAlign: 'center', maxWidth: 280 }}>{activeWord.clue_text}</Text>

          <View style={{ flexDirection: 'row', gap: 6 }}>
            {Array.from({ length: activeWord.answer_length }, (_, i) => (
              <View
                key={i}
                style={[
                  styles.progressBox,
                  {
                    borderColor: shakeActive ? c.danger : c.primary,
                    backgroundColor: shakeActive ? c.dangerSoft : c.primarySoft,
                  },
                ]}
              >
                <Text style={{ fontSize: 14, fontWeight: '700', color: c.text }}>
                  {tapOrder[i] !== undefined ? wheelLetters[tapOrder[i]] : ''}
                </Text>
              </View>
            ))}
          </View>

          <LetterWheel
            letters={wheelLetters}
            tapOrder={tapOrder}
            disabled={pending.has(activeWord.word_id)}
            onTap={handleTapLetter}
            onShuffle={() => {
              setWheelLetters((prev) => shuffleArray(prev));
              setTapOrder([]);
            }}
            c={c}
          />

          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <Pressable
              disabled={tapOrder.length === 0}
              onPress={() => setTapOrder((prev) => prev.slice(0, -1))}
              style={[styles.wheelActionBtn, { opacity: tapOrder.length === 0 ? 0.4 : 1 }]}
            >
              <Delete color={c.textMuted} size={14} />
              <Text style={{ color: c.textMuted, fontSize: 12, fontWeight: '600' }}>{t.backspaceLabel}</Text>
            </Pressable>
            {!hintedWordIds.has(activeWord.word_id) ? (
              <Pressable
                disabled={hintBusy}
                onPress={() => void handleHint()}
                style={[styles.wheelActionBtn, { opacity: hintBusy ? 0.4 : 1 }]}
              >
                <Lightbulb color={c.textMuted} size={14} />
                <Text style={{ color: c.textMuted, fontSize: 12, fontWeight: '600' }}>{t.hintBtn}</Text>
              </Pressable>
            ) : adAvailable ? (
              <Pressable
                disabled={hintBusy}
                onPress={() => void handleHintAd()}
                style={[styles.wheelActionBtn, { opacity: hintBusy ? 0.4 : 1 }]}
              >
                <Lightbulb color={c.accent} size={14} />
                <Text style={{ color: c.accent, fontSize: 12, fontWeight: '600' }}>{t.hintAdBtn}</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      )}

      {!completion && !resultPanel && (
        <View style={{ marginTop: spacing.lg, gap: spacing.xs }}>
          {wordsSorted.map((w) => {
            const isSolved = solvedWordIds.includes(w.word_id);
            const isActive = w.word_id === activeWordId;
            return (
              <Pressable
                key={w.word_id}
                onPress={() => selectWord(w.word_id)}
                style={[
                  styles.clueRow,
                  { backgroundColor: isActive ? c.primarySoft : 'transparent', borderColor: isActive ? c.primary : 'transparent' },
                ]}
              >
                <Text style={{ color: c.textMuted, fontSize: 11, width: 18 }}>{numberAt.get(`${w.row_start},${w.col_start}`)}</Text>
                {w.direction === 'across' ? <ArrowRight color={c.textMuted} size={13} /> : <ArrowDown color={c.textMuted} size={13} />}
                <Text style={{ color: isSolved ? c.success : c.text, fontSize: 13, flex: 1, marginLeft: 6 }} numberOfLines={1}>
                  {w.clue_text}
                </Text>
                {isSolved && <CheckCircle2 color={c.success} size={15} />}
              </Pressable>
            );
          })}
        </View>
      )}

      {!!error && <Text style={{ color: c.danger, textAlign: 'center', marginTop: spacing.md }}>{error}</Text>}

      {xpToast !== null && (
        <View style={[styles.toast, { backgroundColor: c.accent }]}>
          <Sparkles color="#FFFFFF" size={14} />
          <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 13 }}>+{xpToast} XP</Text>
        </View>
      )}

      {hintXpToast !== null && (
        <View style={[styles.toast, { backgroundColor: c.textMuted, bottom: 70 }]}>
          <Lightbulb color="#FFFFFF" size={14} />
          <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 13 }}>-{hintXpToast} XP</Text>
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  h1: { fontSize: 20, fontWeight: '700' },
  cell: {
    width: CELL,
    height: CELL,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellNumber: { position: 'absolute', top: 1, left: 2, fontSize: 8, fontWeight: '600' },
  cellLetter: { fontSize: 15, fontWeight: '700' },
  progressBox: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wheelCircle: {
    position: 'absolute',
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wheelCenterBtn: {
    position: 'absolute',
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  wheelBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wheelBadgeText: { color: '#FFFFFF', fontSize: 9, fontWeight: '700' },
  wheelActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12 },
  speakBtn: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  clueRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 8, borderRadius: radius.sm, borderWidth: 1 },
  toast: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: radius.full,
  },
});
