// src/app/(app)/rewards.tsx — "Rozetler ve Ödüller" tam katalog ekranı
// (V2 öncelik #2, hiç başlanmamıştı). web'deki app/(app)/rewards/page.tsx
// ile aynı davranış: kazanılan + kazanılmayan TÜM rozetleri gösterir
// (backend: GET /stats/badges/catalog). Profildeki BadgeShowcase (sadece
// kazanılanlar) "Tümünü Gör" ile buraya yönlendiriyor — duels.tsx/
// exam-grammar.tsx'teki gibi kendi geri butonuyla, tab çubuğunda GÖRÜNMÜYOR
// (bkz. _layout.tsx href:null kaydı).
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Award, Lock, Sparkles } from 'lucide-react-native';
import { statsApi } from '@/api/stats';
import type { BadgeCatalogItem } from '@/api/types';
import { CATEGORY_ORDER, CATEGORY_SECTION, REWARDS_STRINGS } from '@/i18n/rewardsStrings';
import { useLocale } from '@/i18n';
import { useThemeColors } from '@/hooks/useThemeColors';
import { radius, spacing } from '@/constants/theme';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Card } from '@/components/ui/Card';

type Tab = 'achievement' | 'title';

function BadgeTile({ item, locale, colors }: { item: BadgeCatalogItem; locale: string; colors: ReturnType<typeof useThemeColors> }) {
  const nameKey = `name_${locale}` as keyof BadgeCatalogItem;
  const name = (item[nameKey] as string) || item.name_en || item.code;
  const requirement = locale === 'tr' ? item.requirement_tr : item.requirement_en || item.requirement_tr;

  return (
    <View
      style={[
        styles.tile,
        {
          backgroundColor: item.earned ? colors.warningSoft : colors.background,
          borderColor: item.earned ? colors.amber : colors.border,
        },
      ]}
    >
      <Text style={[styles.emoji, !item.earned && styles.emojiLocked]}>{item.icon_emoji}</Text>
      <Text numberOfLines={2} style={[styles.tileName, { color: item.earned ? colors.text : colors.textMuted }]}>
        {name}
      </Text>
      {item.earned ? (
        <Text style={[styles.tileMeta, { color: colors.amber }]}>{item.period_key ?? ''}</Text>
      ) : (
        <View style={styles.lockedRow}>
          <Lock color={colors.textMuted} size={10} />
          <Text numberOfLines={2} style={[styles.tileMeta, { color: colors.textMuted }]}>{requirement}</Text>
        </View>
      )}
    </View>
  );
}

export default function RewardsScreen() {
  const { locale } = useLocale();
  const c = useThemeColors();
  const t = REWARDS_STRINGS[locale] ?? REWARDS_STRINGS.tr;
  const [tab, setTab] = useState<Tab>('achievement');

  const { data: items, isLoading, isError, refetch } = useQuery({
    queryKey: ['badges-catalog'],
    queryFn: statsApi.getBadgesCatalog,
  });

  const filtered = (items ?? []).filter((i) => i.kind === tab);
  const grouped = new Map<string, BadgeCatalogItem[]>();
  for (const item of filtered) {
    const key = CATEGORY_SECTION[item.category] ?? item.category;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(item);
  }
  const sections = CATEGORY_ORDER.filter((key) => grouped.has(key)).map((key) => ({
    key,
    label: (t as unknown as Record<string, string>)[`section_${key}`] ?? key,
    items: grouped.get(key)!,
  }));

  const earnedCount = (items ?? []).filter((i) => i.kind === 'achievement' && i.earned).length;
  const totalCount = (items ?? []).filter((i) => i.kind === 'achievement').length;

  return (
    <ScreenContainer>
      <Pressable onPress={() => router.back()} style={styles.backRow}>
        <ArrowLeft color={c.textSecondary} size={18} />
        <Text style={{ color: c.textSecondary, marginLeft: spacing.xs, fontSize: 14, fontWeight: '600' }}>{t.backBtn}</Text>
      </Pressable>

      <Text style={{ fontSize: 20, fontWeight: '700', color: c.text }}>{t.title}</Text>
      <Text style={{ fontSize: 14, marginTop: spacing.xs, lineHeight: 20, color: c.textSecondary }}>{t.subtitle}</Text>

      <View style={[styles.tabRow, { marginTop: spacing.lg }]}>
        <Pressable
          onPress={() => setTab('achievement')}
          style={[styles.tabBtn, { backgroundColor: tab === 'achievement' ? c.primarySoft : 'transparent' }]}
        >
          <Award color={tab === 'achievement' ? c.primary : c.textMuted} size={16} />
          <Text style={{ color: tab === 'achievement' ? c.primary : c.textMuted, fontWeight: '600', fontSize: 13, marginLeft: 6 }}>
            {t.achievementsTab}
          </Text>
          {totalCount > 0 && (
            <Text style={{ color: c.textMuted, fontSize: 11, marginLeft: 6 }}>
              {t.earnedCountTpl.replace('{earned}', String(earnedCount)).replace('{total}', String(totalCount))}
            </Text>
          )}
        </Pressable>
        <Pressable
          onPress={() => setTab('title')}
          style={[styles.tabBtn, { backgroundColor: tab === 'title' ? c.primarySoft : 'transparent' }]}
        >
          <Sparkles color={tab === 'title' ? c.primary : c.textMuted} size={16} />
          <Text style={{ color: tab === 'title' ? c.primary : c.textMuted, fontWeight: '600', fontSize: 13, marginLeft: 6 }}>
            {t.titlesTab}
          </Text>
        </Pressable>
      </View>

      {isLoading ? (
        <View style={{ marginTop: spacing.xxl, alignItems: 'center' }}>
          <ActivityIndicator color={c.primary} />
        </View>
      ) : isError ? (
        <Card style={{ marginTop: spacing.lg, alignItems: 'center' }}>
          <Text style={{ color: c.textSecondary, fontSize: 13, marginBottom: spacing.sm }}>{t.error}</Text>
          <Pressable onPress={() => refetch()}>
            <Text style={{ color: c.primary, fontSize: 13, fontWeight: '600' }}>{t.retryBtn}</Text>
          </Pressable>
        </Card>
      ) : sections.length === 0 ? (
        <Card style={{ marginTop: spacing.lg }}>
          <Text style={{ color: c.textMuted, fontSize: 13, textAlign: 'center' }}>{t.titlesEmpty}</Text>
        </Card>
      ) : (
        <View style={{ marginTop: spacing.lg, gap: spacing.lg }}>
          {sections.map((section) => (
            <View key={section.key}>
              <Text style={{ fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4, color: c.textMuted, marginBottom: spacing.sm }}>
                {section.label}
              </Text>
              <View style={styles.grid}>
                {section.items.map((item) => (
                  <BadgeTile key={item.code} item={item} locale={locale} colors={c} />
                ))}
              </View>
            </View>
          ))}
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  backRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  tabRow: { flexDirection: 'row', gap: spacing.sm },
  tabBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, borderRadius: radius.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tile: {
    width: '31%',
    borderRadius: radius.md,
    borderWidth: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    alignItems: 'center',
    gap: 3,
  },
  emoji: { fontSize: 26 },
  emojiLocked: { opacity: 0.35 },
  tileName: { fontSize: 11, fontWeight: '600', textAlign: 'center' },
  tileMeta: { fontSize: 9, textAlign: 'center' },
  lockedRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 2 },
});
