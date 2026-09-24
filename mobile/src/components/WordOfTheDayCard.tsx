// src/components/WordOfTheDayCard.tsx — dashboard "Günün Kelimesi" kartı
// (Madde 5, 24 Eylül 2026). Kullanıcının zaten e-postada aldığı günlük
// kelime içeriğini (bkz. backend/send_daily_word_email.py,
// word_of_the_day_service.py) mobil dashboard'da da gösterir. Salt
// okunur — hiçbir şeyi güncellemez.
//
// DailyWordCard.tsx ile AYNI self-contained "soft-disable" deseni: kendi
// sorgusunu kendi yapar, veri yoksa (found=false) ya da hata durumunda
// sessizce hiçbir şey göstermez. DailyWordCard ile KARIŞTIRILMASIN — o
// ayrı bir özellik ("Günlük Kelime Avı" Wordle oyunu).
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { BookOpen } from 'lucide-react-native';
import { wordsApi } from '@/api/words';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useLocale } from '@/i18n';
import { radius, spacing } from '@/constants/theme';

const L: Record<'tr' | 'en', Record<string, string>> = {
  tr: {
    title: 'Günün Kelimesi',
    example: 'Örnek',
    tip: 'İpucu',
  },
  en: {
    title: 'Word of the Day',
    example: 'Example',
    tip: 'Tip',
  },
};

export function WordOfTheDayCard() {
  const c = useThemeColors();
  const { locale } = useLocale();
  const t = L[locale === 'tr' ? 'tr' : 'en'];

  const { data } = useQuery({
    queryKey: ['word-of-the-day'],
    queryFn: wordsApi.wordOfTheDay,
    retry: false,
  });

  if (!data || !data.found) return null;

  return (
    <View style={[styles.wrap, { backgroundColor: c.surface, borderColor: c.border }]}>
      <View style={styles.header}>
        <View style={[styles.icon, { backgroundColor: c.primarySoft }]}>
          <BookOpen color={c.primary} size={18} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: c.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 0.4 }}>
            {t.title.toUpperCase()}
          </Text>
          <Text style={{ color: c.text, fontSize: 17, fontWeight: '800' }} numberOfLines={1}>
            {data.word}
          </Text>
        </View>
        {!!data.level && (
          <View style={[styles.levelBadge, { backgroundColor: c.border }]}>
            <Text style={{ color: c.textMuted, fontSize: 10, fontWeight: '700' }}>{data.level}</Text>
          </View>
        )}
      </View>

      {!!data.meaning_native && (
        <Text style={{ color: c.text, fontSize: 13, marginTop: spacing.sm }}>{data.meaning_native}</Text>
      )}

      {!!data.example_1_target && (
        <Text style={{ color: c.textMuted, fontSize: 12, fontStyle: 'italic', marginTop: 4 }}>
          {t.example}: "{data.example_1_target}"
        </Text>
      )}
      {!!data.example_1_native && (
        <Text style={{ color: c.textMuted, fontSize: 12, fontStyle: 'italic', marginTop: 2, opacity: 0.8 }}>
          {data.example_1_native}
        </Text>
      )}

      {!!data.grammar_note_native && (
        <Text style={{ color: c.primary, fontSize: 12, marginTop: spacing.sm }}>
          <Text style={{ fontWeight: '700' }}>{t.tip}: </Text>
          {data.grammar_note_native}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.md,
    marginTop: spacing.sm,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 4 },
  icon: { width: 36, height: 36, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  levelBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.sm },
});
