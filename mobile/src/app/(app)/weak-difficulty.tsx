// src/app/(app)/weak-difficulty.tsx — "Zayıf Zorluk Seviyen" tam liste ekranı.
//
// Kullanıcı isteği (25 Eylül 2026): "Zayıf Zorluk Seviyen bölümünde Odak
// konular mantığına geçilsin, içine tıklayınca yeni bir ekran açılsın oradan
// göreyim." dashboard.tsx artık sadece küçük, tıklanabilir bir özet kartı
// gösteriyor; bu ekran V2 madde #6 (Faz 2) zayıf zorluk seviyesi listesinin
// tamamını gösteriyor. Kendi sorgusu, dashboard'daki ['games-weak-difficulty']
// ile AYNI queryKey + parametreleri (days=30, limit=3) kullanıyor — zorluk
// seviyesi zaten sadece 3 tane (beginner/intermediate/advanced) olduğu için
// limit=3 zaten "tümü" anlamına geliyor. react-query önbelleği sayesinde
// dashboard'dan gelindiğinde veri anında görünür.
import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useLocale } from '@/i18n';
import { gamesApi } from '@/api/games';
import type { WeakDifficultyItem } from '@/api/types';
import { useThemeColors } from '@/hooks/useThemeColors';
import { radius, spacing } from '@/constants/theme';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { ScreenNavBar } from '@/components/ui/ScreenNavBar';

// Web'deki dashboard/page.tsx WEAK_DIFFICULTY_STRINGS ile birebir aynı
// tr/en metinler (bkz. mobile app/(app)/dashboard.tsx'teki aynı isimli
// sabit — özet karo orada, tam liste burada).
const WEAK_DIFFICULTY_STRINGS: Record<
  'tr' | 'en',
  { title: string; subtitle: string; cta: string; levelLabels: Record<string, string>; accuracyTpl: string; empty: string }
> = {
  tr: {
    title: 'Zayıf Zorluk Seviyen',
    subtitle: 'Oyunlarda en çok yanlış yaptığın zorluk seviyeleri',
    cta: 'Oyun Oyna',
    levelLabels: { beginner: 'Başlangıç', intermediate: 'Orta', advanced: 'İleri' },
    accuracyTpl: 'Doğruluk: %{percent}',
    empty: 'Şu anda zayıf bir zorluk seviyesi yok.',
  },
  en: {
    title: 'Your Weak Difficulty Level',
    subtitle: 'Difficulty levels you miss most in games',
    cta: 'Play a Game',
    levelLabels: { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' },
    accuracyTpl: 'Accuracy: {percent}%',
    empty: 'No weak difficulty levels right now.',
  },
};

export default function WeakDifficultyScreen() {
  const { locale } = useLocale();
  const c = useThemeColors();
  const s = WEAK_DIFFICULTY_STRINGS[locale as 'tr' | 'en'] ?? WEAK_DIFFICULTY_STRINGS.tr;

  const { data: weakDifficulty, isLoading } = useQuery({
    queryKey: ['games-weak-difficulty'],
    queryFn: () => gamesApi.weakDifficulty(30, 3),
  });

  const items = weakDifficulty?.items ?? [];

  return (
    <ScreenContainer>
      <ScreenNavBar />
      <Text style={{ fontSize: 20, fontWeight: '700', color: c.text }}>{s.title}</Text>
      <Text style={{ fontSize: 13, color: c.textMuted, marginTop: 4 }}>{s.subtitle}</Text>

      {isLoading && !weakDifficulty && (
        <View style={{ paddingVertical: spacing.xl * 2, alignItems: 'center' }}>
          <ActivityIndicator color={c.primary} />
        </View>
      )}

      {!isLoading && items.length === 0 && (
        <Text style={{ color: c.textMuted, marginTop: spacing.lg, textAlign: 'center' }}>{s.empty}</Text>
      )}

      {items.length > 0 && (
        <View style={{ gap: spacing.sm, marginTop: spacing.lg }}>
          {items.map((item: WeakDifficultyItem) => (
            <View key={item.difficulty_level} style={[styles.row, { borderColor: c.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: c.text }} numberOfLines={1}>
                  {s.levelLabels[item.difficulty_level] ?? item.difficulty_level}
                </Text>
                <Text style={{ fontSize: 12, color: c.textMuted, marginTop: 2 }}>
                  {s.accuracyTpl.replace('{percent}', String(Math.round(item.accuracy_ratio * 100)))}
                </Text>
              </View>
              <Pressable onPress={() => router.push('/(app)/game')} style={[styles.btn, { borderColor: c.warning }]}>
                <Text style={{ color: c.warning, fontSize: 12, fontWeight: '700' }}>{s.cta}</Text>
              </Pressable>
            </View>
          ))}
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  btn: {
    borderWidth: 1.5,
    borderRadius: radius.sm,
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
  },
});
