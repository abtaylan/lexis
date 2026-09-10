import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Trophy, User as UserIcon } from 'lucide-react-native';
import { leaguesApi } from '@/api/leagues';
import type { LeagueMemberItem } from '@/api/types';
import { LEAGUE_STRINGS, LEAGUE_TIER_NAMES } from '@/i18n/leagueStrings';
import { useLocale } from '@/i18n';
import { useThemeColors } from '@/hooks/useThemeColors';
import { radius, spacing } from '@/constants/theme';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';

// ── Haftalık lig — web'deki app/(app)/league/page.tsx'in mobil karşılığı.
// Kullanıcının bu haftaki lig grubunu + CANLI (xp_events'ten hesaplanan,
// backend'in zaten xp'ye göre azalan sıralı döndürdüğü) liderlik tablosunu
// gösterir. Terfi/düşme haftalık kapanışta scheduled task tarafından
// işlenir (bkz. backend/app/api/routes/leagues.py docstring'i); bu ekran
// sadece MEVCUT durumu okur. Backend: /api/v1/leagues/me ──

function formatDateRange(startIso: string, endIso: string, locale: string): string {
  try {
    const start = new Date(startIso);
    const end = new Date(endIso);
    const fmt = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' });
    return `${fmt.format(start)} – ${fmt.format(end)}`;
  } catch {
    return '';
  }
}

export default function LeagueScreen() {
  const { locale } = useLocale();
  const c = useThemeColors();
  const t = LEAGUE_STRINGS[locale] ?? LEAGUE_STRINGS.tr;
  const tierNames = LEAGUE_TIER_NAMES[locale] ?? LEAGUE_TIER_NAMES.tr;

  const query = useQuery({ queryKey: ['league-me'], queryFn: leaguesApi.getMyLeague });
  const status = query.data;

  const tierLabel = status ? (tierNames[status.tier_slug] ?? status.tier_slug) : '';
  const memberCount = status?.members.length ?? 0;
  const promoteCutoff = Math.max(1, Math.ceil(memberCount / 3));
  const demoteCutoff = Math.max(1, Math.ceil(memberCount / 3));

  return (
    <ScreenContainer refreshing={query.isRefetching} onRefresh={query.refetch}>
      <View style={styles.headerRow}>
        <View style={[styles.headerIcon, { backgroundColor: c.warningSoft }]}>
          <Trophy color={c.warning} size={20} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: c.text, fontSize: 18, fontWeight: '700' }}>{t.title}</Text>
          {status && (
            <Text style={{ color: c.textMuted, fontSize: 12, marginTop: 1 }}>
              {tierLabel} · {formatDateRange(status.week_start, status.week_end, locale)}
            </Text>
          )}
        </View>
      </View>

      {query.isLoading && (
        <View style={{ alignItems: 'center', paddingVertical: spacing.xl }}>
          <ActivityIndicator color={c.warning} />
        </View>
      )}
      {query.isError && (
        <Card style={{ backgroundColor: c.dangerSoft, borderColor: c.dangerSoft }}>
          <Text style={{ color: c.danger, fontSize: 13 }}>{t.error}</Text>
        </Card>
      )}
      {!query.isLoading && !query.isError && (!status || status.members.length === 0) && (
        <EmptyState title={t.empty} subtitle={t.emptySub} />
      )}

      {!query.isLoading && !query.isError && status && status.members.length > 0 && (
        <Card style={{ paddingVertical: spacing.sm, paddingHorizontal: spacing.sm, gap: 2 }}>
          {status.members.map((m: LeagueMemberItem, idx: number) => {
            const rank = idx + 1;
            const isPromoteZone = rank <= promoteCutoff && memberCount > 3;
            const isDemoteZone = rank > memberCount - demoteCutoff && memberCount > 3;
            const rankColor = isPromoteZone ? c.success : isDemoteZone ? c.danger : c.textMuted;
            return (
              <View
                key={m.user_id}
                style={[
                  styles.memberRow,
                  m.is_me ? { backgroundColor: c.primarySoft } : null,
                ]}
              >
                <View style={styles.memberLeft}>
                  <Text style={{ color: rankColor, fontSize: 12, fontWeight: '700', width: 20, textAlign: 'center' }}>
                    {rank}
                  </Text>
                  <View style={[styles.avatar, { backgroundColor: c.background }]}>
                    <UserIcon color={c.textMuted} size={15} />
                  </View>
                  <Text style={{ color: c.text, fontSize: 13, fontWeight: '600', flexShrink: 1 }} numberOfLines={1}>
                    {m.username || '—'}
                    {m.is_me ? (
                      <Text style={{ color: c.primary, fontWeight: '500', fontSize: 12 }}> ({t.youLabel})</Text>
                    ) : null}
                  </Text>
                </View>
                <Text style={{ color: c.textSecondary, fontSize: 13, fontWeight: '700' }}>
                  {m.xp} <Text style={{ color: c.textMuted, fontWeight: '400', fontSize: 11 }}>{t.xpLabel}</Text>
                </Text>
              </View>
            );
          })}
        </Card>
      )}

      {!query.isLoading && !query.isError && status && status.members.length > 3 && (
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: c.success }]} />
            <Text style={{ color: c.textMuted, fontSize: 11 }}>{t.promoteHint}</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: c.danger }]} />
            <Text style={{ color: c.textMuted, fontSize: 11 }}>{t.demoteHint}</Text>
          </View>
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  headerIcon: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  memberRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, paddingVertical: spacing.sm, paddingHorizontal: spacing.xs, borderRadius: radius.md },
  memberLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1, minWidth: 0 },
  avatar: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  legendRow: { flexDirection: 'row', justifyContent: 'center', gap: spacing.lg, marginTop: spacing.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 7, height: 7, borderRadius: 4 },
});
