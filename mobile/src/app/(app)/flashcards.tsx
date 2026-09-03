import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { CircleCheckBig, CircleX, RotateCcw, Layers, ChevronRight } from 'lucide-react-native';
import { router, useFocusEffect } from 'expo-router';
import { useLocale } from '@/i18n';
import { wordsApi } from '@/api/words';
import { languagesApi } from '@/api/languages';
import type { Language, Word } from '@/api/types';
import { useAuth } from '@/store/auth';
import { useThemeColors } from '@/hooks/useThemeColors';
import { radius, spacing } from '@/constants/theme';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

// ── Flashcards — web'deki app/(app)/flashcards/page.tsx'in mobil karşılığı.
// Bugün için tekrar bekleyen kelimeler (wordsApi.getDue) öncelikli; yoksa
// tüm kelime havuzundan çalışılır. Karta dokununca ön/arka yüz değişir,
// "Bildim"/"Bilmedim" SM-2 tekrar algoritmasına wordsApi.review ile işlenir
// — web ile birebir aynı akış. Gerekli metinler merkezi sözlükte hazır. ──

export default function FlashcardsScreen() {
  const { user } = useAuth();
  const { t } = useLocale();
  const c = useThemeColors();

  const [langNames, setLangNames] = useState<Record<string, string>>({});
  useEffect(() => {
    languagesApi
      .getAll()
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

  useEffect(() => {
    loadCards();
  }, [loadCards]);

  // Kullanıcı geri bildirimi: yeni eklenen bir kelime "tekrar et" kartlarında
  // hemen çıkmıyordu, ancak uygulamadan tamamen çıkıp tekrar girince
  // görünüyordu. Sebep: bu sekme, sekmeler arasında unmount olmadığı için
  // yukarıdaki useEffect sadece İLK açılışta çalışıyor — Kelime Listesi'nden
  // yeni kelime ekleyip bu sekmeye dönmek kartları yeniden çekmiyordu.
  // useFocusEffect ile bu sekmeye her dönüldüğünde (odağı kazandığında) kart
  // kuyruğunu tazeliyoruz.
  useFocusEffect(
    useCallback(() => {
      loadCards();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const current = queue[index];
  const progress = queue.length > 0 ? (index / queue.length) * 100 : 0;

  const handleRate = async (success: boolean) => {
    if (!current || reviewing) return;
    setReviewing(true);
    try {
      await wordsApi.review(current.id, success);
    } catch {
      /* sessiz */
    } finally {
      setReviewing(false);
    }
    if (success) setCorrect((cc) => cc + 1);
    if (index + 1 >= queue.length) {
      setDone(true);
    } else {
      setIndex((i) => i + 1);
      setFlipped(false);
    }
  };

  const restart = () => loadCards();

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
        <Card style={{ backgroundColor: c.dangerSoft, borderColor: c.dangerSoft }}>
          <Text style={{ color: c.danger, fontSize: 13 }}>{error}</Text>
        </Card>
      </ScreenContainer>
    );
  }

  if (queue.length === 0) {
    return (
      <ScreenContainer>
        <View style={styles.center}>
          <Card style={{ alignItems: 'center', width: '100%', paddingVertical: spacing.xl }}>
            <View style={[styles.iconBadge, { backgroundColor: c.successSoft }]}>
              <CircleCheckBig color={c.success} size={26} />
            </View>
            <Text style={{ color: c.text, fontSize: 18, fontWeight: '700', marginTop: spacing.md }}>{t('greatJob')}</Text>
            <Text style={{ color: c.textMuted, fontSize: 13, marginTop: 4, textAlign: 'center' }}>{t('noWordsDue')}</Text>
          </Card>
        </View>
      </ScreenContainer>
    );
  }

  if (done) {
    return <DoneScreen total={queue.length} correct={correct} onRestart={restart} c={c} />;
  }

  return (
    <ScreenContainer>
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <View style={[styles.iconBadgeSm, { backgroundColor: c.primarySoft }]}>
            <Layers color={c.primary} size={16} />
          </View>
          <Text style={{ color: c.text, fontWeight: '600', fontSize: 14 }}>{t('flashcards')}</Text>
        </View>
        <Text style={{ color: c.textMuted, fontSize: 13, fontWeight: '600' }}>
          {index + 1} / {queue.length}
        </Text>
      </View>

      <View style={[styles.progressTrack, { backgroundColor: c.border }]}>
        <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: c.primary }]} />
      </View>

      <Pressable
        onPress={() => !reviewing && setFlipped((f) => !f)}
        style={[
          styles.flashCard,
          { backgroundColor: c.surface, borderColor: c.border, minHeight: flipped ? 240 : 190 },
        ]}
      >
        {!flipped ? (
          <View style={styles.cardFront}>
            <Text style={{ color: c.text, fontSize: 28, fontWeight: '700', textAlign: 'center' }}>{current.word}</Text>
            {current.word_type ? (
              <View style={[styles.typeBadge, { backgroundColor: c.primarySoft, marginTop: spacing.sm }]}>
                <Text style={{ color: c.primary, fontSize: 11, fontWeight: '600' }}>{current.word_type}</Text>
              </View>
            ) : null}
            <View style={styles.flipHint}>
              <Text style={{ color: c.textMuted, fontSize: 11 }}>{t('tapToFlip')}</Text>
              <ChevronRight color={c.textMuted} size={12} />
            </View>
          </View>
        ) : (
          <View style={styles.cardBack}>
            <View style={{ width: '100%' }}>
              <Text style={[styles.fieldLabel, { color: c.textMuted }]}>{t('colMeaning')}</Text>
              <Text style={{ color: c.text, fontSize: 17, fontWeight: '600' }}>{current.meaning}</Text>
            </View>
            {current.meaning_native && current.meaning_native !== current.meaning ? (
              <View style={{ width: '100%', marginTop: spacing.sm }}>
                <Text style={[styles.fieldLabel, { color: c.textMuted }]}>{nativeLabel}</Text>
                <Text style={{ color: c.primary, fontSize: 14, fontWeight: '500' }}>{current.meaning_native}</Text>
              </View>
            ) : null}
            {current.meaning_target && current.meaning_target !== current.meaning ? (
              <View style={{ width: '100%', marginTop: spacing.sm }}>
                <Text style={[styles.fieldLabel, { color: c.textMuted }]}>{t('meaningTargetTpl', { lang: learningLabel })}</Text>
                <Text style={{ color: c.textSecondary, fontSize: 13 }}>{current.meaning_target}</Text>
              </View>
            ) : null}
            {current.example ? (
              <View style={[styles.exampleBox, { borderTopColor: c.border }]}>
                <Text style={[styles.fieldLabel, { color: c.textMuted }]}>{t('exampleHeader')}</Text>
                <Text style={{ color: c.textMuted, fontSize: 12, fontStyle: 'italic' }}>{current.example}</Text>
              </View>
            ) : null}
          </View>
        )}
      </Pressable>

      {flipped ? (
        <View style={styles.rateRow}>
          <Pressable
            disabled={reviewing}
            onPress={() => handleRate(false)}
            style={[styles.rateBtn, { backgroundColor: c.dangerSoft, opacity: reviewing ? 0.5 : 1 }]}
          >
            <CircleX color={c.danger} size={18} />
            <Text style={{ color: c.danger, fontWeight: '700', fontSize: 13 }}>{t('dontKnowBtn')}</Text>
          </Pressable>
          <Pressable
            disabled={reviewing}
            onPress={() => handleRate(true)}
            style={[styles.rateBtn, { backgroundColor: c.successSoft, opacity: reviewing ? 0.5 : 1 }]}
          >
            <CircleCheckBig color={c.success} size={18} />
            <Text style={{ color: c.success, fontWeight: '700', fontSize: 13 }}>{t('knewItBtn')}</Text>
          </Pressable>
        </View>
      ) : (
        <View style={{ height: 52 }} />
      )}

      <View style={styles.miniScoreRow}>
        <Text style={{ color: c.textMuted, fontSize: 11 }}>{t('correctCountTpl', { n: correct })}</Text>
        <Text style={{ color: c.textMuted, fontSize: 11 }}>{t('wrongCountTpl', { n: index - correct })}</Text>
      </View>
    </ScreenContainer>
  );
}

function DoneScreen({
  total,
  correct,
  onRestart,
  c,
}: {
  total: number;
  correct: number;
  onRestart: () => void;
  c: ReturnType<typeof useThemeColors>;
}) {
  const { t, gt } = useLocale();
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
  const tone = pct >= 80 ? { bg: c.successSoft, text: c.success } : pct >= 50 ? { bg: c.warningSoft, text: c.warning } : { bg: c.dangerSoft, text: c.danger };

  return (
    <ScreenContainer>
      <View style={styles.center}>
        <Card style={{ alignItems: 'center', width: '100%', paddingVertical: spacing.xl }}>
          <View style={[styles.iconBadge, { backgroundColor: tone.bg }]}>
            <CircleCheckBig color={tone.text} size={28} />
          </View>
          <Text style={{ color: c.text, fontSize: 20, fontWeight: '700', marginTop: spacing.md }}>{t('sessionComplete')}</Text>
          <Text style={{ color: c.textMuted, fontSize: 13, marginTop: 4, marginBottom: spacing.lg }}>
            {t('reviewedCountTpl', { n: total })}
          </Text>

          <View style={styles.scoreRow}>
            <View style={[styles.scoreTile, { backgroundColor: c.successSoft }]}>
              <Text style={{ color: c.success, fontSize: 22, fontWeight: '700' }}>{correct}</Text>
              <Text style={{ color: c.success, fontSize: 11, fontWeight: '600', marginTop: 2 }}>{t('correctLabel')}</Text>
            </View>
            <View style={[styles.scoreTile, { backgroundColor: c.dangerSoft }]}>
              <Text style={{ color: c.danger, fontSize: 22, fontWeight: '700' }}>{total - correct}</Text>
              <Text style={{ color: c.danger, fontSize: 11, fontWeight: '600', marginTop: 2 }}>{t('wrongLabel')}</Text>
            </View>
          </View>

          <View style={{ width: '100%', marginTop: spacing.lg }}>
            <View style={styles.rowBetween}>
              <Text style={{ color: c.textMuted, fontSize: 12 }}>{t('successRate')}</Text>
              <Text style={{ color: tone.text, fontSize: 12, fontWeight: '700' }}>{pct}%</Text>
            </View>
            <View style={[styles.progressTrack, { backgroundColor: c.border, marginTop: 4 }]}>
              <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: tone.text }]} />
            </View>
          </View>

          <View style={{ width: '100%', marginTop: spacing.lg }}>
            <Button title={t('restartBtn')} icon={<RotateCcw color="#FFFFFF" size={16} />} onPress={onRestart} />
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
  iconBadge: { width: 56, height: 56, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  iconBadgeSm: { width: 28, height: 28, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  progressTrack: { height: 6, borderRadius: radius.full, overflow: 'hidden', marginTop: spacing.md },
  progressFill: { height: 6, borderRadius: radius.full },
  flashCard: { borderWidth: 1, borderRadius: radius.lg, marginTop: spacing.md, marginBottom: spacing.md, overflow: 'hidden' },
  cardFront: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  cardBack: { flex: 1, padding: spacing.lg },
  fieldLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', marginBottom: 4 },
  exampleBox: { width: '100%', borderTopWidth: 1, marginTop: spacing.sm, paddingTop: spacing.sm },
  typeBadge: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.full },
  flipHint: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: spacing.md },
  rateRow: { flexDirection: 'row', gap: spacing.md },
  rateBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: spacing.md, borderRadius: radius.lg },
  miniScoreRow: { flexDirection: 'row', justifyContent: 'center', gap: spacing.md, marginTop: spacing.md },
  scoreRow: { flexDirection: 'row', gap: spacing.sm, width: '100%' },
  scoreTile: { flex: 1, borderRadius: radius.md, paddingVertical: spacing.sm, alignItems: 'center' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between' },
});
