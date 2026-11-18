// src/app/(app)/crossword.tsx — "Çengel Bulmaca" seviye listesi ekranı
// (18 Kasım 2026 kullanıcı isteği). 200 sabit seviye, 4 zorluk kademesi
// (Başlangıç 1-50 / Orta 51-100 / İleri 101-150 / Advance 151-200).
// İlerleme kullanıcının genel kelime seviyesinden BAĞIMSIZ — her zaman
// 1'den başlar (bkz. backend/app/services/crossword_service.py). Seviyeler
// SIRAYLA açılır: current_level'dan büyük seviyeler kilitli gösterilir.
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { CheckCircle2, Lock, Puzzle } from 'lucide-react-native';
import { useLocale } from '@/i18n';
import { crosswordApi } from '@/api/crossword';
import type { CrosswordLevelsResponse } from '@/api/types';
import { useThemeColors } from '@/hooks/useThemeColors';
import { radius, spacing } from '@/constants/theme';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { ScreenNavBar } from '@/components/ui/ScreenNavBar';
import { Card } from '@/components/ui/Card';

const L: Record<'tr' | 'en', Record<string, string>> = {
  tr: {
    title: 'Çengel Bulmaca',
    subtitle: 'Kelimeleri bul, bulmacayı tamamla, XP kazan.',
    error: 'Bir şeyler ters gitti.',
    levelLabel: 'Seviye',
    completeBonusTpl: 'Bulmaca bonusu: +{xp} XP',
    currentBadge: 'Şu an burada',
  },
  en: {
    title: 'Hook Crossword',
    subtitle: 'Find the words, finish the puzzle, earn XP.',
    error: 'Something went wrong.',
    levelLabel: 'Level',
    completeBonusTpl: 'Puzzle bonus: +{xp} XP',
    currentBadge: 'You are here',
  },
};

export default function CrosswordLevelsScreen() {
  const c = useThemeColors();
  const { locale } = useLocale();
  const t = L[locale === 'tr' ? 'tr' : 'en'];

  const [data, setData] = useState<CrosswordLevelsResponse | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    crosswordApi
      .levels()
      .then(setData)
      .catch(() => setError(t.error));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Bir bulmaca bitirilip geri dönüldüğünde current_level güncellenmiş
  // olabilir — her odaklanmada tazele (flashcards.tsx'teki AYNI desen).
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <ScreenContainer>
      <ScreenNavBar />
      <View style={styles.headerRow}>
        <Puzzle color={c.accent} size={22} />
        <Text style={[styles.h1, { color: c.text }]}>{t.title}</Text>
      </View>
      <Text style={{ color: c.textMuted, fontSize: 13, marginBottom: spacing.lg }}>{t.subtitle}</Text>

      {!data && !error && (
        <View style={{ paddingVertical: spacing.xl * 2, alignItems: 'center' }}>
          <ActivityIndicator color={c.primary} />
        </View>
      )}

      {!!error && <Text style={{ color: c.danger, textAlign: 'center', marginTop: spacing.md }}>{error}</Text>}

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
                      onPress={() => router.push({ pathname: '/(app)/crossword-puzzle', params: { level: String(level) } })}
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
