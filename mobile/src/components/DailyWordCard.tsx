// src/components/DailyWordCard.tsx — dashboard'da "Günlük Kelime Avı"
// (24 Eylül 2026, Madde 2 seçimi) için kompakt durum kartı.
//
// Kendi sorgusunu kendi yapan, veri gelmezse (henüz kelime üretilmemiş /
// hata) sessizce hiçbir şey göstermeyen "soft-disable" bileşeni
// (DashboardHeader.tsx'teki placement-status sorgusu ile AYNI desen).
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Flame, Sparkles } from 'lucide-react-native';
import { dailyChallengeApi } from '@/api/dailyChallenge';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useLocale } from '@/i18n';
import { radius, spacing } from '@/constants/theme';

const L: Record<'tr' | 'en', Record<string, string>> = {
  tr: {
    title: 'Günlük Kelime Avı',
    solved: 'Bugünü çözdün!',
    failed: 'Bugünkü kelime kaçtı',
    pending: 'Bugünün kelimesi seni bekliyor',
    play: 'Oyna',
  },
  en: {
    title: 'Daily Word Hunt',
    solved: "You solved today's word!",
    failed: "Today's word got away",
    pending: "Today's word is waiting",
    play: 'Play',
  },
};

export function DailyWordCard() {
  const c = useThemeColors();
  const { locale } = useLocale();
  const t = L[locale === 'tr' ? 'tr' : 'en'];

  const { data: state } = useQuery({
    queryKey: ['daily-challenge-today'],
    queryFn: dailyChallengeApi.today,
    retry: false,
  });

  if (!state) return null;

  const statusText = state.is_complete ? t.solved : state.is_failed ? t.failed : t.pending;
  const remaining = state.max_wrong_guesses - state.wrong_guesses;
  const canPlay = !state.is_complete && !state.is_failed;

  return (
    <Pressable
      onPress={() => router.push('/(app)/daily-word')}
      style={[styles.wrap, { backgroundColor: c.surface, borderColor: c.border }]}
    >
      <View style={[styles.icon, { backgroundColor: c.warningSoft }]}>
        <Sparkles color={c.warning} size={18} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: c.text, fontSize: 14, fontWeight: '700' }}>{t.title}</Text>
        <Text style={{ color: c.textMuted, fontSize: 12, marginTop: 2 }}>
          {statusText}
          {canPlay ? ` · ${remaining}/${state.max_wrong_guesses}` : ''}
        </Text>
      </View>
      {state.streak > 0 && (
        <View style={styles.streak}>
          <Flame color="#F97316" size={14} fill="#FB923C" />
          <Text style={{ color: '#F97316', fontSize: 12, fontWeight: '700' }}>{state.streak}</Text>
        </View>
      )}
      {canPlay && <Text style={{ color: c.primary, fontSize: 12, fontWeight: '700' }}>{t.play}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 4,
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.md,
    marginTop: spacing.sm,
  },
  icon: { width: 36, height: 36, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  streak: { flexDirection: 'row', alignItems: 'center', gap: 3 },
});
