// src/components/StreakHeatmap.tsx — Madde 3 (Görsel/GUI), "streak
// heatmap" (24 Eylül 2026). Web'deki components/layout/StreakHeatmap.tsx
// ile AYNI mantık (GitHub tarzı katkı takvimi, son 18 hafta, mevcut
// statsApi.getHistory -- backend değişikliği gerekmedi), React Native
// bileşenleriyle (View) yeniden yazıldı.
//
// DailyWordCard.tsx ile AYNI soft-disable deseni: veri gelmeden hiçbir şey
// render edilmez.
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { statsApi } from '@/api/stats';
import type { DailyProgress } from '@/api/types';
import { useLocale } from '@/i18n';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useThemeMode } from '@/store/theme';
import { radius, spacing } from '@/constants/theme';

const WEEKS = 18;

const L: Record<'tr' | 'en', { title: string; activeDaysTpl: string; less: string; more: string }> = {
  tr: {
    title: 'Çalışma Takvimi',
    activeDaysTpl: 'son {weeks} haftada {n} gün aktif',
    less: 'Az',
    more: 'Çok',
  },
  en: {
    title: 'Activity Calendar',
    activeDaysTpl: '{n} active days in the last {weeks} weeks',
    less: 'Less',
    more: 'More',
  },
};

const DAY_LABELS: Record<'tr' | 'en', string[]> = {
  tr: ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'],
  en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
};

// Web'deki LEVEL_CLASSES (#D9EFC4/#B3DE8F/#7FBD52/#3B6D11 açık,
// yeşilin koyu tema karşılıkları) ile aynı 5 kademeli ölçek.
const LEVEL_COLORS_LIGHT = ['#F1F3F5', '#D9EFC4', '#B3DE8F', '#7FBD52', '#3B6D11'];
const LEVEL_COLORS_DARK = ['#1E293B', '#0F2E14', '#14532D', '#15803D', '#4ADE80'];

function levelFor(count: number): number {
  if (count <= 0) return 0;
  if (count <= 2) return 1;
  if (count <= 5) return 2;
  if (count <= 9) return 3;
  return 4;
}

type DayCell = { date: string; count: number; level: number; isFuture: boolean };

function buildColumns(history: DailyProgress[], weeks: number): DayCell[][] {
  const byDate = new Map<string, number>();
  for (const h of history) {
    byDate.set(h.date, (h.words_added ?? 0) + (h.words_reviewed ?? 0));
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dayOfWeek = (today.getDay() + 6) % 7;
  const mondayThisWeek = new Date(today);
  mondayThisWeek.setDate(today.getDate() - dayOfWeek);
  const start = new Date(mondayThisWeek);
  start.setDate(mondayThisWeek.getDate() - (weeks - 1) * 7);

  const columns: DayCell[][] = [];
  for (let w = 0; w < weeks; w++) {
    const col: DayCell[] = [];
    for (let d = 0; d < 7; d++) {
      const day = new Date(start);
      day.setDate(start.getDate() + w * 7 + d);
      const dateStr = day.toISOString().split('T')[0];
      const isFuture = day > today;
      const count = isFuture ? 0 : byDate.get(dateStr) ?? 0;
      col.push({ date: dateStr, count, level: levelFor(count), isFuture });
    }
    columns.push(col);
  }
  return columns;
}

export function StreakHeatmap() {
  const c = useThemeColors();
  const { scheme } = useThemeMode();
  const { locale } = useLocale();
  const t = L[locale === 'tr' ? 'tr' : 'en'];
  const dayLabels = DAY_LABELS[locale === 'tr' ? 'tr' : 'en'];
  const levelColors = scheme === 'dark' ? LEVEL_COLORS_DARK : LEVEL_COLORS_LIGHT;

  const { data: history } = useQuery({
    queryKey: ['stats-history-heatmap'],
    queryFn: () => statsApi.getHistory(WEEKS * 7 + 1),
    retry: false,
  });

  if (!history) return null;

  const columns = buildColumns(history, WEEKS);
  const activeDays = columns.flat().filter((cell) => !cell.isFuture && cell.count > 0).length;

  return (
    <View style={[styles.wrap, { backgroundColor: c.surface, borderColor: c.border }]}>
      <View style={styles.header}>
        <Text style={{ color: c.text, fontSize: 14, fontWeight: '700' }}>{t.title}</Text>
        <Text style={{ color: c.textMuted, fontSize: 11 }}>
          {t.activeDaysTpl.replace('{n}', String(activeDays)).replace('{weeks}', String(WEEKS))}
        </Text>
      </View>

      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <View style={styles.dayLabelCol}>
          {dayLabels.map((d, i) => (
            <Text
              key={d}
              style={[styles.dayLabel, { color: c.textMuted, opacity: i % 2 === 0 ? 1 : 0 }]}
            >
              {d}
            </Text>
          ))}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', gap: 3 }}>
            {columns.map((col, wi) => (
              <View key={wi} style={{ gap: 3 }}>
                {col.map((cell) => (
                  <View
                    key={cell.date}
                    style={[
                      styles.cell,
                      { backgroundColor: cell.isFuture ? 'transparent' : levelColors[cell.level] },
                    ]}
                  />
                ))}
              </View>
            ))}
          </View>
        </ScrollView>
      </View>

      <View style={styles.legend}>
        <Text style={[styles.legendLabel, { color: c.textMuted }]}>{t.less}</Text>
        {levelColors.map((color, i) => (
          <View key={i} style={[styles.legendCell, { backgroundColor: color }]} />
        ))}
        <Text style={[styles.legendLabel, { color: c.textMuted }]}>{t.more}</Text>
      </View>
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  dayLabelCol: { justifyContent: 'space-between', paddingVertical: 1 },
  dayLabel: { fontSize: 9, lineHeight: 11, height: 11 },
  cell: { width: 11, height: 11, borderRadius: 2 },
  legend: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 3, marginTop: spacing.sm },
  legendLabel: { fontSize: 10 },
  legendCell: { width: 9, height: 9, borderRadius: 2 },
});
