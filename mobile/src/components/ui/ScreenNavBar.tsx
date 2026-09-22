// src/components/ui/ScreenNavBar.tsx
// Kullanici istegi (22 Eylul 2026): "hem mobil hem web, her bolumun ve alt
// sayfanin mutlaka bir 'geri don' ve bir 'ana menuye don' butonu olmali."
// Ekranlarin cogunda zaten kendi "Geri" satiri vardi (ArrowLeft + router.back(),
// bkz. report.tsx/rewards.tsx/exam-grammar.tsx deseni) ama HICBIRINDE ana
// menuye donus yoktu; duels/league/custom-leagues/quests/friends/messages/
// stats/premium/quiz/flashcards/duel-room ekranlarinda ise geri donus bile
// yoktu (yalnizca donanim geri tusu/iOS kaydirma jestiyle cikilabiliyordu).
// Bu bilesen ikisini tek satirda, tutarli bir gorunumle veriyor -- mevcut
// "Geri" satirlarinin yerini alacak sekilde tasarlandi (ayni ArrowLeft ikonu,
// ayni stil), sag tarafa Home ikonlu "Ana Menu" butonu eklendi.
import React from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, Home } from 'lucide-react-native';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useLocale } from '@/i18n';
import { spacing } from '@/constants/theme';

interface ScreenNavBarProps {
  // Geri butonuna ozel davranis gerekiyorsa (orn. placement sinavinda
  // router.replace kullanilmasi gibi) override edilebilir.
  onBack?: () => void;
  // Bazi ekranlarda (orn. bir akisin ilk adimi) geri butonu anlamsiz olabilir.
  showBack?: boolean;
  style?: ViewStyle;
}

export function ScreenNavBar({ onBack, showBack = true, style }: ScreenNavBarProps) {
  const c = useThemeColors();
  const { locale } = useLocale();
  const backLabel = locale === 'tr' ? 'Geri' : 'Back';
  const homeLabel = locale === 'tr' ? 'Ana Menü' : 'Home';

  return (
    <View style={[styles.row, style]}>
      {showBack ? (
        <Pressable onPress={onBack ?? (() => router.back())} style={styles.btn} hitSlop={8}>
          <ArrowLeft color={c.textSecondary} size={18} />
          <Text style={[styles.text, { color: c.textSecondary }]}>{backLabel}</Text>
        </Pressable>
      ) : (
        <View />
      )}
      <Pressable onPress={() => router.replace('/(app)/dashboard')} style={styles.btn} hitSlop={8}>
        <Home color={c.textSecondary} size={18} />
        <Text style={[styles.text, { color: c.textSecondary }]}>{homeLabel}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  btn: { flexDirection: 'row', alignItems: 'center' },
  text: { marginLeft: spacing.xs, fontSize: 14, fontWeight: '600' },
});
