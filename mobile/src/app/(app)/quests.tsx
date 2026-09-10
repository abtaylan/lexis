import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Map, Check, Lock, Star, Award } from 'lucide-react-native';
import { questsApi } from '@/api/quests';
import type { QuestNodeItem } from '@/api/types';
import { QUESTS_STRINGS } from '@/i18n/questsStrings';
import { useLocale, type Locale } from '@/i18n';
import { useThemeColors } from '@/hooks/useThemeColors';
import { radius, spacing } from '@/constants/theme';
import { ScreenContainer } from '@/components/ui/ScreenContainer';

// ── Görev haritası — web'deki app/(app)/quests/page.tsx'in mobil karşılığı.
// Sıralı görev listesini (kilitli/açık/tamamlanmış), canlı ilerlemeyi
// (current_value/requirement_count) ve ödülü (XP + varsa rozet) gösterir.
// İlerleme SUNUCUDA tutuluyor (bkz. backend/app/api/routes/quests.py).
//
// DİL NOTU: quest_nodes içeriği backend'de SADECE tr/en (migration 042) —
// web'deki aynı adlı sayfadaki desenle birebir: locale tr ise title_tr,
// DEĞİLSE title_en (BİLİNÇLİ sınır, ekranın kendi 10 dilli arayüz
// metinlerinden bağımsız).
function localizedTitle(node: QuestNodeItem, locale: Locale): string {
  return locale === 'tr' ? node.title_tr : node.title_en;
}
function localizedDescription(node: QuestNodeItem, locale: Locale): string | undefined {
  return (locale === 'tr' ? node.description_tr : node.description_en) ?? undefined;
}

export default function QuestsScreen() {
  const { locale } = useLocale();
  const c = useThemeColors();
  const t = QUESTS_STRINGS[locale] ?? QUESTS_STRINGS.tr;

  const query = useQuery({ queryKey: ['quests-list'], queryFn: questsApi.list });
  const items = query.data?.items ?? [];

  return (
    <ScreenContainer refreshing={query.isRefetching} onRefresh={query.refetch}>
      <View style={styles.headerRow}>
        <View style={[styles.headerIcon, { backgroundColor: c.accentSoft }]}>
          <Map color={c.accent} size={20} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: c.text, fontSize: 18, fontWeight: '700' }}>{t.title}</Text>
          <Text style={{ color: c.textMuted, fontSize: 12, marginTop: 1 }}>{t.subtitle}</Text>
        </View>
      </View>

      {query.isLoading && (
        <View style={{ alignItems: 'center', paddingVertical: spacing.xl }}>
          <ActivityIndicator color={c.accent} />
        </View>
      )}
      {query.isError && (
        <Text style={{ color: c.danger, fontSize: 13, textAlign: 'center', paddingVertical: spacing.lg }}>{t.error}</Text>
      )}
      {!query.isLoading && !query.isError && items.length === 0 && (
        <Text style={{ color: c.textMuted, fontSize: 13, textAlign: 'center', paddingVertical: spacing.lg }}>{t.empty}</Text>
      )}

      {items.map((node, idx) => {
        const isLast = idx === items.length - 1;
        const pct = node.requirement_count > 0
          ? Math.min(100, Math.round((node.current_value / node.requirement_count) * 100))
          : 0;
        const title = localizedTitle(node, locale);
        const description = localizedDescription(node, locale);

        const nodeCircleStyle = node.is_completed
          ? { backgroundColor: c.success, borderColor: c.success }
          : node.is_unlocked
            ? { backgroundColor: c.surface, borderColor: c.accent }
            : { backgroundColor: c.background, borderColor: c.border };

        return (
          <View key={node.id} style={styles.itemRow}>
            <View style={styles.trackCol}>
              <View style={[styles.nodeCircle, nodeCircleStyle]}>
                {node.is_completed ? (
                  <Check color="#fff" size={18} />
                ) : node.is_unlocked ? (
                  <Star color={c.accent} size={15} />
                ) : (
                  <Lock color={c.textMuted} size={15} />
                )}
              </View>
              {!isLast && (
                <View style={[styles.connector, { backgroundColor: node.is_completed ? c.success : c.border }]} />
              )}
            </View>

            <View
              style={[
                styles.card,
                {
                  backgroundColor: node.is_unlocked ? c.surface : c.background,
                  borderColor: c.border,
                  opacity: node.is_unlocked ? 1 : 0.6,
                },
              ]}
            >
              <View style={styles.cardHeaderRow}>
                <Text style={{ color: c.text, fontSize: 14, fontWeight: '700', flex: 1 }} numberOfLines={2}>
                  {title}
                </Text>
                {node.is_completed && (
                  <Text style={{ color: c.success, fontSize: 11, fontWeight: '700' }}>{t.completedLabel}</Text>
                )}
                {!node.is_unlocked && (
                  <Text style={{ color: c.textMuted, fontSize: 11, fontWeight: '700' }}>{t.lockedLabel}</Text>
                )}
              </View>

              {description ? (
                <Text style={{ color: c.textMuted, fontSize: 12, marginTop: 2 }}>{description}</Text>
              ) : null}

              {node.is_unlocked && (
                <>
                  <View style={[styles.progressTrack, { backgroundColor: c.background }]}>
                    <View
                      style={[
                        styles.progressFill,
                        { backgroundColor: node.is_completed ? c.success : c.accent, width: `${node.is_completed ? 100 : pct}%` },
                      ]}
                    />
                  </View>
                  <Text style={{ color: c.textMuted, fontSize: 11, marginTop: 4 }}>
                    {Math.min(node.current_value, node.requirement_count)} / {node.requirement_count}
                  </Text>
                </>
              )}

              {(node.reward_xp > 0 || node.reward_badge_code) && (
                <View style={[styles.rewardRow, { borderTopColor: c.border }]}>
                  <Text style={{ color: c.textMuted, fontSize: 11 }}>{t.rewardLabel}:</Text>
                  {node.reward_xp > 0 && (
                    <Text style={{ color: c.amber, fontSize: 11, fontWeight: '700' }}>+{node.reward_xp} XP</Text>
                  )}
                  {node.reward_badge_code && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                      <Award color={c.primary} size={12} />
                      <Text style={{ color: c.primary, fontSize: 11, fontWeight: '700' }}>{t.badgeRewardLabel}</Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          </View>
        );
      })}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  headerIcon: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  itemRow: { flexDirection: 'row', gap: spacing.sm },
  trackCol: { alignItems: 'center' },
  nodeCircle: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  connector: { width: 2, flex: 1, minHeight: 20, marginTop: 4 },
  card: { flex: 1, marginBottom: spacing.sm, borderRadius: radius.lg, borderWidth: 1, padding: spacing.md },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.xs },
  progressTrack: { height: 6, borderRadius: 3, overflow: 'hidden', marginTop: spacing.sm },
  progressFill: { height: '100%', borderRadius: 3 },
  rewardRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1 },
});
