// src/app/(app)/crossword.tsx — "Çengel Bulmaca" seviye listesi ekranı
// (18 Kasım 2026 kullanıcı isteği). 200 sabit seviye, 4 zorluk kademesi
// (Başlangıç 1-50 / Orta 51-100 / İleri 101-150 / Advance 151-200).
// İlerleme kullanıcının genel kelime seviyesinden BAĞIMSIZ — her zaman
// 1'den başlar (bkz. backend/app/services/crossword_service.py). Seviyeler
// SIRAYLA açılır: current_level'dan büyük seviyeler kilitli gösterilir.
//
// 23 Kasım 2026 kullanıcı isteği ("bu oyunu çeşitlendirecez ... bulmacaya
// girince 3 seçenek olacak"): üstte bir mod seçici (standard/reverse/
// own_pool, bkz. CrosswordMode) eklendi — her modun KENDİ ilerlemesi var
// (bkz. backend user_crossword_progress.mode), o yüzden mod değişince
// seviyeler yeniden çekilir (current_level moda göre farklı olabilir).
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { BookMarked, CheckCircle2, Lock, Puzzle, Repeat } from 'lucide-react-native';
import { useLocale } from '@/i18n';
import { crosswordApi } from '@/api/crossword';
import type { CrosswordLevelsResponse, CrosswordMode } from '@/api/types';
import { useThemeColors } from '@/hooks/useThemeColors';
import { radius, spacing } from '@/constants/theme';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { ScreenNavBar } from '@/components/ui/ScreenNavBar';
import { Card } from '@/components/ui/Card';

function errorDetail(err: unknown): string {
  const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
  return typeof detail === 'string' ? detail : '';
}

const MODES: CrosswordMode[] = ['standard', 'reverse', 'own_pool'];

const L: Record<'tr' | 'en', Record<string, string>> = {
  tr: {
    title: 'Çengel Bulmaca',
    subtitle: 'Kelimeleri bul, bulmacayı tamamla, XP kazan.',
    error: 'Bir şeyler ters gitti.',
    levelLabel: 'Seviye',
    completeBonusTpl: 'Bulmaca bonusu: +{xp} XP',
    currentBadge: 'Şu an burada',
    modeStandardLabel: 'Standart',
    modeReverseLabel: 'Ters',
    modeOwnPoolLabel: 'Kelimelerim',
    modeStandardDesc: 'Türkçe ipucundan İngilizce kelimeyi bul.',
    modeReverseDesc: 'İngilizce ipucundan Türkçe karşılığını bul.',
    modeOwnPoolDesc: "Kelimelerim listendeki kendi kelimelerinle bulmaca çöz.",
    ownPoolNotEnough: "Bu mod için Kelimelerim listende bu dil çiftinde en az 3 kelime olması gerekiyor. Önce birkaç kelime ekle.",
  },
  en: {
    title: 'Hook Crossword',
    subtitle: 'Find the words, finish the puzzle, earn XP.',
    error: 'Something went wrong.',
    levelLabel: 'Level',
    completeBonusTpl: 'Puzzle bonus: +{xp} XP',
    currentBadge: 'You are here',
    modeStandardLabel: 'Standard',
    modeReverseLabel: 'Reverse',
    modeOwnPoolLabel: 'My Words',
    modeStandardDesc: 'Find the English word from the Turkish clue.',
    modeReverseDesc: 'Find the Turkish word from the English clue.',
    modeOwnPoolDesc: 'Solve puzzles made from your own My Words list.',
    ownPoolNotEnough: 'This mode needs at least 3 words in your My Words list for this language pair. Add a few words first.',
  },
};

const MODE_ICONS: Record<CrosswordMode, typeof Puzzle> = {
  standard: Puzzle,
  reverse: Repeat,
  own_pool: BookMarked,
};

export default function CrosswordLevelsScreen() {
  const c = useThemeColors();
  const { locale } = useLocale();
  const t = L[locale === 'tr' ? 'tr' : 'en'];
  const modeLabel: Record<CrosswordMode, string> = {
    standard: t.modeStandardLabel,
    reverse: t.modeReverseLabel,
    own_pool: t.modeOwnPoolLabel,
  };
  const modeDesc: Record<CrosswordMode, string> = {
    standard: t.modeStandardDesc,
    reverse: t.modeReverseDesc,
    own_pool: t.modeOwnPoolDesc,
  };

  const [mode, setMode] = useState<CrosswordMode>('standard');
  const [data, setData] = useState<CrosswordLevelsResponse | null>(null);
  const [error, setError] = useState('');

  const load = useCallback((m: CrosswordMode) => {
    setData(null);
    setError('');
    crosswordApi
      .levels(m)
      .then(setData)
      .catch((err) => setError(errorDetail(err) || t.error));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Bir bulmaca bitirilip geri dönüldüğünde current_level güncellenmiş
  // olabilir — her odaklanmada tazele (flashcards.tsx'teki AYNI desen).
  // 23 Kasım 2026: `mode` da dependency — mod değişince (veya ekrana her
  // dönüşte) o modun kendi ilerlemesi çekilir.
  useFocusEffect(
    useCallback(() => {
      load(mode);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [load, mode])
  );

  return (
    <ScreenContainer>
      <ScreenNavBar />
      <View style={styles.headerRow}>
        <Puzzle color={c.accent} size={22} />
        <Text style={[styles.h1, { color: c.text }]}>{t.title}</Text>
      </View>
      <Text style={{ color: c.textMuted, fontSize: 13, marginBottom: spacing.md }}>{t.subtitle}</Text>

      <View style={styles.tabRow}>
        {MODES.map((m) => {
          const Icon = MODE_ICONS[m];
          const isActive = m === mode;
          return (
            <Pressable
              key={m}
              onPress={() => setMode(m)}
              style={[styles.tabBtn, { backgroundColor: isActive ? c.primarySoft : 'transparent' }]}
            >
              <Icon color={isActive ? c.primary : c.textMuted} size={15} />
              <Text style={{ color: isActive ? c.primary : c.textMuted, fontWeight: '600', fontSize: 12, marginLeft: 6 }}>
                {modeLabel[m]}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={{ color: c.textMuted, fontSize: 12 }}>{modeDesc[mode]}</Text>
      {mode === 'own_pool' && (
        <Text style={{ color: c.textMuted, fontSize: 11, fontStyle: 'italic', marginTop: 2, marginBottom: spacing.lg }}>
          {t.ownPoolNotEnough}
        </Text>
      )}
      {mode !== 'own_pool' && <View style={{ marginBottom: spacing.lg }} />}

      {!data && !error && (
        <View style={{ paddingVertical: spacing.xl * 2, alignItems: 'center' }}>
          <ActivityIndicator color={c.primary} />
        </View>
      )}

      {!!error && (
        <Card style={{ marginTop: spacing.md, alignItems: 'center' }}>
          <Text style={{ color: c.danger, textAlign: 'center', fontSize: 13 }}>{error}</Text>
        </Card>
      )}

      {data &&
        data.tiers.map((tier) => {
          const levels = Array.from({ length: tier.level_to - tier.level_from + 1 }, (_, i) => tier.level_from + i);
          return (
            <Card key={tier.name} style={{ marginBottom: spacing.lg }}>
              <View style={styles.tierHeaderRow}>
                <Text style={{ color: c.text, fontWeight: '700', fontSize: 15 }}>{tier.name}</Text>
                <Text style={{ color: c.textMuted, fontSize: 11 }}>
                  {tier.level_from}–{tier.level_to}
                </Text>
              </View>
              <Text style={{ color: c.accent, fontSize: 11, marginBottom: spacing.sm }}>
                {t.completeBonusTpl.replace('{xp}', String(tier.completion_xp))}
              </Text>

              <View style={styles.grid}>
                {levels.map((level) => {
                  const isLocked = level > data.current_level;
                  const isCurrent = level === data.current_level;
                  const isDone = level < data.current_level;

                  return (
                    <Pressable
                      key={level}
                      disabled={isLocked}
                      onPress={() => router.push({ pathname: '/(app)/crossword-puzzle', params: { level: String(level), mode } })}
                      style={[
                        styles.levelTile,
                        {
                          backgroundColor: isCurrent ? c.primary : isDone ? c.successSoft : isLocked ? c.background : c.surface,
                          borderColor: isCurrent ? c.primary : isDone ? c.success : c.border,
                          opacity: isLocked ? 0.5 : 1,
                        },
                      ]}
                    >
                      {isLocked ? (
                        <Lock color={c.textMuted} size={13} />
                      ) : isDone ? (
                        <CheckCircle2 color={c.success} size={13} />
                      ) : null}
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: '700',
                          color: isCurrent ? '#FFFFFF' : isDone ? c.success : isLocked ? c.textMuted : c.text,
                        }}
                      >
                        {level}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </Card>
          );
        })}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  h1: { fontSize: 20, fontWeight: '700' },
  tabRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: 6, flexWrap: 'wrap' },
  tabBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, borderRadius: radius.md },
  tierHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  levelTile: {
    width: 44,
    height: 36,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 3,
  },
});
