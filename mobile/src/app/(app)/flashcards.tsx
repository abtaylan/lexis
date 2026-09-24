import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CircleCheckBig, CircleX, RotateCcw, Layers, ChevronRight, BookPlus, Volume2 } from 'lucide-react-native';
import * as Speech from 'expo-speech';
import { router, useFocusEffect } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useLocale } from '@/i18n';
import { wordsApi } from '@/api/words';
import { languagesApi } from '@/api/languages';
import type { Language, Word } from '@/api/types';
import { useAuth } from '@/store/auth';
import { useThemeColors } from '@/hooks/useThemeColors';
import { radius, spacing } from '@/constants/theme';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { ScreenNavBar } from '@/components/ui/ScreenNavBar';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Mascot } from '@/components/Mascot';

// game.tsx::SPEECH_LANG_MAP ile BİREBİR aynı (kasıtlı küçük tekrar).
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

// ── Flashcards — web'deki app/(app)/flashcards/page.tsx'in mobil karşılığı.
// Bugün için tekrar bekleyen kelimeler (wordsApi.getDue) öncelikli; yoksa
// tüm kelime havuzundan çalışılır. Karta dokununca ön/arka yüz değişir,
// "Bildim"/"Bilmedim" SM-2 tekrar algoritmasına wordsApi.review ile işlenir
// — web ile birebir aynı akış. Gerekli metinler merkezi sözlükte hazır. ──

export default function FlashcardsScreen() {
  const { user } = useAuth();
  const { t } = useLocale();
  const c = useThemeColors();
  const queryClient = useQueryClient();

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
  const sessionStartRef = useRef<number>(Date.now());

  // ── Gerçek 3D çevirme (Madde 3, 24 Eylül 2026) — web'deki
  // app/(app)/flashcards/page.tsx ile AYNI mantık: ön/arka yüz AYNI ANDA
  // View ağacında (mutlak konumlanmış, backfaceVisibility: 'hidden'),
  // Animated.Value ile rotateY döndürülüyor. `flipped` her değiştiğinde
  // (hem tıklamada hem bir sonraki karta geçerken) flipAnim 0<->1 arası
  // animasyonla geçiyor. ──
  const flipAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(flipAnim, {
      toValue: flipped ? 1 : 0,
      duration: 500,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, [flipped, flipAnim]);
  const frontRotate = flipAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
  const backRotate = flipAnim.interpolate({ inputRange: [0, 1], outputRange: ['180deg', '360deg'] });

  // ── Ses dalga formu — telaffuz TTS çalarken kartta gösterilen animasyonlu
  // çubuklar. expo-speech zaten game.tsx'te kullanılan bir bağımlılık
  // (bkz. o dosyadaki aynı isimli speakWord) — burada YENİ bir native
  // modül eklenmedi, sadece flashcards ekranında da kullanılıyor. ──
  const [isSpeaking, setIsSpeaking] = useState(false);
  const speakWord = useCallback(
    (text: string) => {
      if (!text) return;
      const langCode = SPEECH_LANG_MAP[user?.learning_lang ?? ''];
      try {
        Speech.stop();
        Speech.speak(text, {
          language: langCode,
          onStart: () => setIsSpeaking(true),
          onDone: () => setIsSpeaking(false),
          onStopped: () => setIsSpeaking(false),
          onError: () => {
            setIsSpeaking(false);
            if (langCode) {
              try {
                Speech.speak(text, { onStart: () => setIsSpeaking(true), onDone: () => setIsSpeaking(false) });
              } catch {
                /* sessiz */
              }
            }
          },
        });
      } catch {
        setIsSpeaking(false);
      }
    },
    [user?.learning_lang]
  );

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
      sessionStartRef.current = Date.now();
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

  // Kart değiştiğinde hâlâ çalan bir telaffuz varsa kes.
  useEffect(() => {
    return () => {
      try {
        Speech.stop();
      } catch {
        /* sessiz */
      }
    };
  }, [index]);

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
      // KULLANICI GERİ BİLDİRİMİ (7 Eylül 2026): "Uygulama içindeyken
      // değişimi görmem lazım" — bkz. game.tsx'teki aynı yorum.
      queryClient.invalidateQueries({ queryKey: ['xp'] });
      queryClient.invalidateQueries({ queryKey: ['stats-summary'] });
    } catch {
      /* sessiz */
    } finally {
      setReviewing(false);
    }
    if (success) setCorrect((cc) => cc + 1);
    if (index + 1 >= queue.length) {
      const finalCorrect = success ? correct + 1 : correct;
      wordsApi.logStudySession({
        words_studied: queue.length,
        correct_count: finalCorrect,
        wrong_count: queue.length - finalCorrect,
        duration_secs: Math.round((Date.now() - sessionStartRef.current) / 1000),
        study_type: 'flashcard',
      });
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
        <ScreenNavBar />
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
        <ScreenNavBar />
        <Card style={{ backgroundColor: c.dangerSoft, borderColor: c.dangerSoft }}>
          <Text style={{ color: c.danger, fontSize: 13 }}>{error}</Text>
        </Card>
      </ScreenContainer>
    );
  }

  if (queue.length === 0) {
    // KULLANICI GERİ BİLDİRİMİ (6 Eylül 2026): "final kartlara kelime
    // eklenmemiş, boş gözüküyor, harika iş yazıyor, çok saçma". Bu ekrana
    // sadece kelime hazinesi TAMAMEN BOŞSA düşülüyor (loadCards, bugün
    // tekrarı gelen kelime yoksa zaten TÜM kelimelere düşüyor — yani bu dal
    // hiçbir zaman "bugün için hepsini bitirdin" anlamına gelmiyor, sadece
    // "hiç kelimen yok" anlamına geliyor). Bu yüzden kutlama mesajı yerine
    // kelime eklemeye yönlendiren, dürüst bir boş durum gösteriyoruz.
    return (
      <ScreenContainer>
        <ScreenNavBar />
        <View style={styles.center}>
          <Card style={{ alignItems: 'center', width: '100%', paddingVertical: spacing.xl }}>
            <View style={[styles.iconBadge, { backgroundColor: c.primarySoft }]}>
              <BookPlus color={c.primary} size={26} />
            </View>
            <Text style={{ color: c.text, fontSize: 18, fontWeight: '700', marginTop: spacing.md }}>{t('noWordsYetTitle')}</Text>
            <Text style={{ color: c.textMuted, fontSize: 13, marginTop: 4, textAlign: 'center' }}>{t('noWordsYetSubtitle')}</Text>
            <View style={{ width: '100%', marginTop: spacing.lg }}>
              <Button title={t('addWordBtn')} icon={<BookPlus color="#FFFFFF" size={16} />} onPress={() => router.push('/(app)/words')} />
            </View>
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
      <ScreenNavBar />
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

      <Pressable onPress={() => !reviewing && setFlipped((f) => !f)} style={styles.flashCardWrap}>
        {/* Ön yüz */}
        <Animated.View
          style={[
            styles.flashCardFace,
            { backgroundColor: c.surface, borderColor: c.border, transform: [{ perspective: 1200 }, { rotateY: frontRotate }] },
          ]}
        >
          <View style={styles.cardFront}>
            <View style={styles.wordRow}>
              <Text style={{ color: c.text, fontSize: 28, fontWeight: '700', textAlign: 'center' }}>{current.word}</Text>
              <Pressable
                onPress={(e) => {
                  e.stopPropagation();
                  speakWord(current.word);
                }}
                style={[styles.speakBtn, { backgroundColor: c.primarySoft }]}
              >
                <Volume2 color={c.primary} size={16} />
              </Pressable>
            </View>
            {isSpeaking && <WaveformBars color={c.primary} />}
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
        </Animated.View>

        {/* Arka yüz */}
        <Animated.View
          style={[
            styles.flashCardFace,
            { backgroundColor: c.surface, borderColor: c.border, transform: [{ perspective: 1200 }, { rotateY: backRotate }] },
          ]}
        >
          <ScrollView contentContainerStyle={styles.cardBack}>
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
          </ScrollView>
        </Animated.View>
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

// Ses dalga formu — telaffuz TTS çalarken 5 çubuk, her biri farklı bir
// gecikmeyle Animated.loop üzerinden scaleY animasyonu yapıyor (web'deki
// globals.css::.wave-bar keyframe'inin RN Animated karşılığı).
function WaveformBars({ color }: { color: string }) {
  const bars = useRef([0, 1, 2, 3, 4].map(() => new Animated.Value(0.3))).current;
  useEffect(() => {
    const anims = bars.map((v, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 120),
          Animated.timing(v, { toValue: 1, duration: 450, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(v, { toValue: 0.3, duration: 450, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])
      )
    );
    anims.forEach((a) => a.start());
    return () => anims.forEach((a) => a.stop());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.waveRow}>
      {bars.map((v, i) => (
        <Animated.View key={i} style={[styles.waveBar, { backgroundColor: color, transform: [{ scaleY: v }] }]} />
      ))}
    </View>
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
  // Maskot/avatar sistemi (24 Eylül 2026, Madde 3c) — web'deki
  // flashcards/page.tsx::DoneScreen ile aynı skor-kademesi eşiği.
  const mascotMood = pct >= 80 ? 'celebrate' : pct >= 50 ? 'happy' : 'sad';

  return (
    <ScreenContainer>
      <ScreenNavBar />
      <View style={styles.center}>
        <Card style={{ alignItems: 'center', width: '100%', paddingVertical: spacing.xl }}>
          <Mascot mood={mascotMood} size={64} />
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
  flashCardWrap: { height: 300, marginTop: spacing.md, marginBottom: spacing.md },
  flashCardFace: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 1,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backfaceVisibility: 'hidden',
  },
  cardFront: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  cardBack: { flexGrow: 1, padding: spacing.lg },
  wordRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  speakBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  waveRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 16, marginTop: spacing.sm },
  waveBar: { width: 3, height: 16, borderRadius: 2 },
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
