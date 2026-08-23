import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Brain, CircleCheckBig, CircleX, RotateCcw, Trophy } from 'lucide-react-native';
import { router } from 'expo-router';
import { useLocale } from '@/i18n';
import { wordsApi } from '@/api/words';
import type { Word } from '@/api/types';
import { useThemeColors } from '@/hooks/useThemeColors';
import { radius, spacing } from '@/constants/theme';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

// ── Quiz — web'deki app/(app)/quiz/page.tsx'in mobil karşılığı. Aynı mantık:
// kullanıcının kelimelerinden 4 seçenekli çoktan seçmeli 20 soruluk bir tur
// oluşturulur (kelime → anlam), doğru/yanlış web/game/page.tsx'teki gibi
// wordsApi.review ile SM-2 tekrar algoritmasına işlenir. Gerekli tüm metinler
// merkezi sözlükte (translations.json) zaten mevcut — web ile birebir aynı
// anahtarlar kullanılıyor, ayrı bir *Strings.ts dosyasına gerek yok. ──

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

export default function QuizScreen() {
  const { t } = useLocale();
  const c = useThemeColors();

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
      const pool = (res.items || []).filter((w) => w.meaning_native || w.meaning);
      if (pool.length < 4) {
        setError(t('quizMinWordsError'));
        return;
      }
      const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, 20);
      setCards(buildQuiz(shuffled));
    } catch {
      setError(t('wordsLoadError'));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const current = cards[index];

  const handleAnswer = async (optionIndex: number) => {
    if (selected !== null || submitting || !current) return;
    setSelected(optionIndex);
    const isCorrect = optionIndex === current.correctIndex;
    if (isCorrect) setScore((s) => s + 1);
    setSubmitting(true);
    try {
      await wordsApi.review(current.word.id, isCorrect);
    } catch {
      /* sessiz */
    } finally {
      setSubmitting(false);
    }

    setTimeout(() => {
      if (index + 1 >= cards.length) {
        setDone(true);
      } else {
        setIndex((i) => i + 1);
        setSelected(null);
      }
    }, 1000);
  };

  if (loading) {
    return (
      <ScreenContainer>
        <View style={styles.center}>
          <ActivityIndicator color={c.primary} />
          <Text style={{ color: c.textMuted, marginTop: spacing.sm }}>{t('loading')}</Text>
        </View>
      </ScreenContainer>
    );
  }

  if (error) {
    return (
      <ScreenContainer>
        <Card style={{ backgroundColor: c.warningSoft, borderColor: c.warningSoft }}>
          <Text style={{ color: c.warning, fontSize: 13 }}>{error}</Text>
        </Card>
      </ScreenContainer>
    );
  }

  if (done) {
    return <DoneScreen score={score} total={cards.length} onRestart={load} c={c} />;
  }

  if (!current) return null;
  const progress = cards.length > 0 ? (index / cards.length) * 100 : 0;

  return (
    <ScreenContainer>
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <View style={[styles.iconBadge, { backgroundColor: c.primarySoft }]}>
            <Brain color={c.primary} size={16} />
          </View>
          <Text style={{ color: c.text, fontWeight: '600', fontSize: 14 }}>{t('quiz')}</Text>
        </View>
        <View style={styles.topBarRight}>
          <Text style={{ color: c.success, fontSize: 12, fontWeight: '600' }}>
            {t('correctCountTpl', { n: score })}
          </Text>
          <Text style={{ color: c.textMuted, fontSize: 12 }}>
            {t('questionCounterTpl', { i: index + 1, n: cards.length })}
          </Text>
        </View>
      </View>

      <View style={[styles.progressTrack, { backgroundColor: c.border }]}>
        <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: c.primary }]} />
      </View>

      <Card style={{ alignItems: 'center', marginTop: spacing.md, marginBottom: spacing.md }}>
        <Text style={{ color: c.textMuted, fontSize: 11, fontWeight: '600', textTransform: 'uppercase', marginBottom: spacing.sm }}>
          {t('quizQuestionPrompt')}
        </Text>
        <Text style={{ color: c.text, fontSize: 26, fontWeight: '700', textAlign: 'center' }}>{current.word.word}</Text>
        {current.word.word_type ? (
          <View style={[styles.typeBadge, { backgroundColor: c.primarySoft, marginTop: spacing.sm }]}>
            <Text style={{ color: c.primary, fontSize: 11, fontWeight: '600' }}>{current.word.word_type}</Text>
          </View>
        ) : null}
      </Card>

      <View style={{ gap: spacing.sm }}>
        {current.options.map((opt, i) => {
          const isCorrectOption = i === current.correctIndex;
          const isSelected = i === selected;
          const answered = selected !== null;
          let borderColor = c.border;
          let bg = c.surface;
          let textColor = c.text;
          let letterBg = c.border;
          let letterColor = c.textMuted;
          let icon: React.ReactNode = null;
          if (answered) {
            if (isCorrectOption) {
              borderColor = c.success;
              bg = c.successSoft;
              textColor = c.success;
              letterBg = c.success;
              letterColor = '#FFFFFF';
              icon = <CircleCheckBig color={c.success} size={16} />;
            } else if (isSelected) {
              borderColor = c.danger;
              bg = c.dangerSoft;
              textColor = c.danger;
              letterBg = c.danger;
              letterColor = '#FFFFFF';
              icon = <CircleX color={c.danger} size={16} />;
            } else {
              borderColor = c.border;
              textColor = c.textMuted;
            }
          }
          return (
            <Pressable
              key={i}
              disabled={answered}
              onPress={() => handleAnswer(i)}
              style={[styles.optionRow, { borderColor, backgroundColor: bg }]}
            >
              <View style={[styles.optionLetter, { backgroundColor: letterBg }]}>
                <Text style={{ color: letterColor, fontSize: 11, fontWeight: '700' }}>{['A', 'B', 'C', 'D'][i]}</Text>
              </View>
              <Text style={{ color: textColor, fontSize: 14, fontWeight: '600', flex: 1 }}>{opt}</Text>
              {icon}
            </Pressable>
          );
        })}
      </View>
    </ScreenContainer>
  );
}

function DoneScreen({
  score,
  total,
  onRestart,
  c,
}: {
  score: number;
  total: number;
  onRestart: () => void;
  c: ReturnType<typeof useThemeColors>;
}) {
  const { t, gt } = useLocale();
  const pct = total > 0 ? Math.round((score / total) * 100) : 0;
  const tier =
    pct >= 80
      ? { label: t('tierExcellent'), bg: c.successSoft, text: c.success }
      : pct >= 50
        ? { label: t('tierGood'), bg: c.warningSoft, text: c.warning }
        : { label: t('tierKeepGoing'), bg: c.dangerSoft, text: c.danger };

  return (
    <ScreenContainer>
      <View style={styles.center}>
        <Card style={{ alignItems: 'center', width: '100%', paddingVertical: spacing.xl }}>
          <View style={[styles.trophyBadge, { backgroundColor: tier.bg }]}>
            <Trophy color={tier.text} size={28} />
          </View>
          <Text style={{ color: c.text, fontSize: 20, fontWeight: '700', marginTop: spacing.md }}>{tier.label}</Text>
          <Text style={{ color: c.textMuted, fontSize: 13, marginTop: 4, marginBottom: spacing.lg }}>
            {t('questionsCompletedTpl', { n: total })}
          </Text>

          <View style={styles.scoreRow}>
            <View style={[styles.scoreTile, { backgroundColor: c.successSoft }]}>
              <Text style={{ color: c.success, fontSize: 22, fontWeight: '700' }}>{score}</Text>
              <Text style={{ color: c.success, fontSize: 11, fontWeight: '600', marginTop: 2 }}>{t('correctLabel')}</Text>
            </View>
            <View style={[styles.scoreTile, { backgroundColor: c.dangerSoft }]}>
              <Text style={{ color: c.danger, fontSize: 22, fontWeight: '700' }}>{total - score}</Text>
              <Text style={{ color: c.danger, fontSize: 11, fontWeight: '600', marginTop: 2 }}>{t('wrongLabel')}</Text>
            </View>
          </View>

          <View style={{ width: '100%', marginTop: spacing.lg }}>
            <View style={styles.rowBetween}>
              <Text style={{ color: c.textMuted, fontSize: 12 }}>{t('successRate')}</Text>
              <Text style={{ color: tier.text, fontSize: 12, fontWeight: '700' }}>{pct}%</Text>
            </View>
            <View style={[styles.progressTrack, { backgroundColor: c.border, marginTop: 4 }]}>
              <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: tier.text }]} />
            </View>
          </View>

          <View style={{ width: '100%', marginTop: spacing.lg }}>
            <Button title={t('retryQuizBtn')} icon={<RotateCcw color="#FFFFFF" size={16} />} onPress={onRestart} />
          </View>
          <View style={{ marginTop: spacing.sm, width: '100%' }}>
            <Button title={gt.backToDashboardBtn} variant="ghost" onPress={() => router.push('/(app)/dashboard')} />
          </View>
        </Card>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', paddingTop: spacing.xl },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  topBarLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  topBarRight: { alignItems: 'flex-end', gap: 2 },
  iconBadge: { width: 28, height: 28, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  progressTrack: { height: 6, borderRadius: radius.full, overflow: 'hidden', marginTop: spacing.md },
  progressFill: { height: 6, borderRadius: radius.full },
  typeBadge: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.full },
  optionRow: {
    borderWidth: 2,
    borderRadius: radius.md,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  optionLetter: { width: 22, height: 22, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  trophyBadge: { width: 56, height: 56, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  scoreRow: { flexDirection: 'row', gap: spacing.sm, width: '100%' },
  scoreTile: { flex: 1, borderRadius: radius.md, paddingVertical: spacing.sm, alignItems: 'center' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between' },
});
