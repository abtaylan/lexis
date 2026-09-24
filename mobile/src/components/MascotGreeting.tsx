// src/components/MascotGreeting.tsx — Madde 3 (Görsel/GUI), "maskot/
// avatar sistemi" (24 Eylül 2026). web/src/components/layout/
// MascotGreeting.tsx ile AYNI mantık (günün durumuna göre ruh hali
// değişen maskot + konuşma balonu), RN bileşenleriyle yeniden yazıldı.
// Kendi veri çekmiyor — dashboard.tsx zaten sahip olduğu `stats`'ı prop
// olarak geçiyor.
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Mascot, type MascotMood } from './Mascot';
import { useLocale } from '@/i18n';
import { useThemeColors } from '@/hooks/useThemeColors';
import { radius, spacing } from '@/constants/theme';

interface MascotGreetingProps {
  streak: number;
  todayAdded: number;
  dailyGoal: number;
}

const L: Record<'tr' | 'en', { celebrate: string; happy: string; idle: string; sad: string }> = {
  tr: {
    celebrate: 'Harika! Bugünkü hedefini tamamladın. 🎉',
    happy: 'Güzel gidiyorsun, böyle devam!',
    idle: '{streak} günlük serin var — bugün de bir kelime ekleyelim mi?',
    sad: 'Bugün henüz başlamadın. Küçük bir adım at, ben yardım edeyim!',
  },
  en: {
    celebrate: "Nice! You've hit today's goal. 🎉",
    happy: "You're doing great, keep it up!",
    idle: '{streak}-day streak going — add a word today too?',
    sad: "You haven't started today. One small step — I'll cheer you on!",
  },
};

function moodFor(streak: number, todayAdded: number, dailyGoal: number): MascotMood {
  if (dailyGoal > 0 && todayAdded >= dailyGoal) return 'celebrate';
  if (todayAdded > 0) return 'happy';
  if (streak > 0) return 'idle';
  return 'sad';
}

export function MascotGreeting({ streak, todayAdded, dailyGoal }: MascotGreetingProps) {
  const c = useThemeColors();
  const { locale } = useLocale();
  const t = L[locale === 'tr' ? 'tr' : 'en'];
  const mood = moodFor(streak, todayAdded, dailyGoal);
  const message = t[mood].replace('{streak}', String(streak));

  return (
    <View style={[styles.wrap, { backgroundColor: c.surface, borderColor: c.border }]}>
      <Mascot mood={mood} size={48} />
      <View style={[styles.bubble, { backgroundColor: c.background }]}>
        <Text style={{ color: c.text, fontSize: 13, lineHeight: 18 }}>{message}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 4,
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
  },
  bubble: {
    flex: 1,
    borderRadius: radius.lg,
    borderTopLeftRadius: 4,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm + 4,
  },
});
