// src/app/(app)/crossword-puzzle.tsx — Çengel Bulmaca oynanış ekranı
// (18 Kasım 2026 kullanıcı isteği). Hücre bazlı grid: her hücre kendi
// TextInput'u, kesişen kelimeler aynı hücreyi (dolayısıyla aynı harfi)
// paylaşır. Bir kelimenin TÜM hücreleri dolunca otomatik olarak sunucuya
// kontrol ettirilir (bkz. useEffect aşağıda) — ayrı bir "Kontrol Et"
// butonuna gerek yok, kullanıcı isteğiyle birebir: "her kelime bilinince
// XP kazanılsın".
//
// Güvenlik: doğru cevaplar istemciye asla gönderilmez (bkz. backend
// crossword.py) — TEK istisna, zaten çözülmüş kelimeler: bu ekran yarım
// bırakılan bir seviyeye geri dönüldüğünde onları BOŞ değil DOLU göstermek
// için backend'in sağladığı `answer` alanını (sadece solved_word_ids için
// dolu gelir) kullanır.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputKeyPressEventData,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowDown, ArrowRight, CheckCircle2, Sparkles, Trophy } from 'lucide-react-native';
import { useLocale } from '@/i18n';
import { crosswordApi } from '@/api/crossword';
import type { CrosswordLevelResponse, CrosswordWord } from '@/api/types';
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

export default function CrosswordPuzzleScreen() {
  const c = useThemeColors();
  const { locale } = useLocale();
  const t = L[locale === 'tr' ? 'tr' : 'en'];
  const { level: levelParam } = useLocalSearchParams<{ level: string }>();
  const levelNum = Number(levelParam) || 1;

  const [puzzle, setPuzzle] = useState<CrosswordLevelResponse | null>(null);
  const [error, setError] = useState('');
  const [gridLetters, setGridLetters] = useState<Record<string, string>>({});
  const [solvedWordIds, setSolvedWordIds] = useState<string[]>([]);
  const [activeWordId, setActiveWordId] = useState<string | null>(null);
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [shakeKeys, setShakeKeys] = useState<Set<string>>(new Set());
  const [xpToast, setXpToast] = useState<number | null>(null);
  const [completion, setCompletion] = useState<{ xp: number; nextLevel: number | null } | null>(null);

  const inputRefs = useRef<Record<string, TextInput | null>>({});

  useEffect(() => {
    setPuzzle(null);
    setGridLetters({});
    setSolvedWordIds([]);
    setActiveWordId(null);
    setCompletion(null);
    crosswordApi
      .level(levelNum)
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
      .catch(() => setError(t.error));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [levelNum]);

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
        const result = await crosswordApi.attemptWord(levelNum, wordId, answer);
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
    [levelNum, wordsById, cellMap, solvedWordIds, t.error]
  );

  // Herhangi bir kelimenin TÜM hücreleri dolunca otomatik kontrol.
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

  const handleChangeCell = (key: string, idx: number, text: string) => {
    const word = activeWordId ? wordsById.get(activeWordId) : undefined;
    const letter = text.slice(-1).toUpperCase();
    setGridLetters((prev) => ({ ...prev, [key]: letter }));
    if (letter && word && idx < word.answer_length - 1) {
      const nextKey = cellsForWord(word)[idx + 1];
      inputRefs.current[nextKey]?.focus();
    }
  };

  const handleKeyPress = (key: string, idx: number, e: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
    if (e.nativeEvent.key !== 'Backspace' || gridLetters[key] || idx <= 0) return;
    const word = activeWordId ? wordsById.get(activeWordId) : undefined;
    if (!word) return;
    const prevKey = cellsForWord(word)[idx - 1];
    inputRefs.current[prevKey]?.focus();
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

  const activeWord = activeWordId ? wordsById.get(activeWordId) : undefined;
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

      {completion && (
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
                onPress={() => router.replace({ pathname: '/(app)/crossword-puzzle', params: { level: String(completion.nextLevel) } })}
              />
            ) : (
              <Text style={{ color: c.success, textAlign: 'center', fontWeight: '600' }}>{t.allDoneTitle}</Text>
            )}
            <Button title={t.backToListBtn} variant="secondary" onPress={() => router.back()} />
          </View>
        </Card>
      )}

      {!completion && (
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
                  const isShaking = shakeKeys.has(key);
                  const number = numberAt.get(key);
                  const wordIdxForActive = activeWord ? cellsForWord(activeWord).indexOf(key) : -1;

                  return (
                    <View
                      key={key}
                      style={[
                        styles.cell,
                        {
                          borderColor: isShaking ? c.danger : isActive ? c.primary : isSolved ? c.success : c.border,
                          backgroundColor: isShaking ? c.dangerSoft : isSolved ? c.successSoft : isActive ? c.primarySoft : c.surface,
                        },
                      ]}
                    >
                      {!!number && <Text style={[styles.cellNumber, { color: c.textMuted }]}>{number}</Text>}
                      <TextInput
                        ref={(ref) => {
                          inputRefs.current[key] = ref;
                        }}
                        value={gridLetters[key] ?? ''}
                        editable={!isSolved}
                        maxLength={1}
                        autoCapitalize="characters"
                        autoCorrect={false}
                        onFocus={() => handleCellFocus(key)}
                        onChangeText={(text) => handleChangeCell(key, wordIdxForActive, text)}
                        onKeyPress={(e) => handleKeyPress(key, wordIdxForActive, e)}
                        style={[
                          styles.cellInput,
                          { color: isSolved ? c.success : c.text },
                        ]}
                      />
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      {!completion && (
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
  cellInput: {
    width: CELL - 4,
    height: CELL - 4,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '700',
    padding: 0,
  },
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
