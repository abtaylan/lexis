import React, { useMemo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Trophy, ChevronUp, ChevronDown, Users2 } from 'lucide-react-native';
import { leaguesApi } from '@/api/leagues';
import { LEAGUE_STRINGS, LEAGUE_TIER_NAMES } from '@/i18n/leagueStrings';
import { useLocale } from '@/i18n';
import { useThemeColors } from '@/hooks/useThemeColors';
import { radius, spacing } from '@/constants/theme';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { LeagueTable } from '@/components/LeagueTable';
import { LeagueGroupStrip } from '@/components/LeagueGroupStrip';

// ── Haftalık lig — web'deki app/(app)/league/page.tsx'in mobil karşılığı.
// Kullanıcının bu haftaki lig grubunu + CANLI (xp_events'ten hesaplanan,
// backend'in zaten xp'ye göre azalan sıralı döndürdüğü) liderlik tablosunu
// gösterir. Terfi/düşme haftalık kapanışta scheduled task tarafından
// işlenir (bkz. backend/league_weekly_rollover.py); bu ekran sadece
// MEVCUT durumu okur. Backend: /api/v1/leagues/me + /api/v1/leagues/overview
//
// Faz 3 devamı (10 Eylül 2026 kullanıcı geri bildirimi):
// - "Lig sayfasına girince benim olduğum lig direk çıksın" → /me ve
//   /overview zaten AYRI useQuery hook'ları (react-query onları paralel
//   ve bağımsız yürütür) — LeagueTable artık SADECE query.isLoading'e
//   bağlı, overview'i beklemiyor.
// - "Ligin üst kısmında tüm ligler yan yana olsun, ok tuşu ile
//   ilerleyerek diğer lig isimlerini göreyim" → dikey "Tüm Ligler" kart
//   listesinin yerini LeagueGroupStrip (yatay, ok butonlu) aldı.
// - "Benim lig sıralama kutusunun altında benim alt lig ve üst ligimin
//   ismi geçsin, tıklayarak o ligin içine girebileyim" → prev/next
//   kademe kutucukları eklendi (league-detail.tsx ile aynı mantık).

export default function LeagueScreen() {
  const { locale } = useLocale();
  const c = useThemeColors();
  const t = LEAGUE_STRINGS[locale] ?? LEAGUE_STRINGS.tr;
  const tierNames = LEAGUE_TIER_NAMES[locale] ?? LEAGUE_TIER_NAMES.tr;

  const query = useQuery({ queryKey: ['league-me'], queryFn: leaguesApi.getMyLeague });
  const status = query.data;
  const overviewQuery = useQuery({ queryKey: ['league-overview'], queryFn: leaguesApi.getOverview });
  const overview = overviewQuery.data?.groups ?? [];

  const tierLabel = status ? (tierNames[status.tier_slug] ?? status.tier_slug) : '';

  const prevTierGroup = useMemo(
    () => (status ? overview.find((g) => g.tier_index === status.tier_index - 1) : undefined),
    [overview, status],
  );
  const nextTierGroup = useMemo(
    () => (status ? overview.find((g) => g.tier_index === status.tier_index + 1) : undefined),
    [overview, status],
  );

  const refresh = () => {
    query.refetch();
    overviewQuery.refetch();
  };

  return (
    <ScreenContainer refreshing={query.isRefetching} onRefresh={refresh}>
      <View style={styles.headerRow}>
        <View style={[styles.headerIcon, { backgroundColor: c.warningSoft }]}>
          <Trophy color={c.warning} size={20} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: c.text, fontSize: 18, fontWeight: '700' }}>{t.title}</Text>
          {status && (
            <Text style={{ color: c.textMuted, fontSize: 12, marginTop: 1 }} numberOfLines={1}>
              {tierLabel} · {status.group_name}
            </Text>
          )}
        </View>
        <Pressable
          onPress={() => router.push('/(app)/custom-leagues')}
          style={({ pressed }) => [styles.customLeaguesBtn, { backgroundColor: c.accentSoft, opacity: pressed ? 0.8 : 1 }]}
        >
          <Users2 color={c.accent} size={14} />
          <Text style={{ color: c.accent, fontWeight: '700', fontSize: 11 }}>{t.customLeaguesBtn}</Text>
        </Pressable>
      </View>

      {overview.length > 0 && (
        <View style={{ marginBottom: spacing.md }}>
          <LeagueGroupStrip
            groups={overview}
            tierNames={tierNames}
            currentLeagueId={status?.league_id}
            youLabel={t.youLabel}
            onSelect={(id) => router.push({ pathname: '/(app)/league-detail', params: { id } })}
          />
        </View>
      )}

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
        <LeagueTable
          members={status.members}
          rankLabel={t.rankLabel}
          userLabel={t.userLabel}
          xpLabel={t.xpLabel}
          youLabel={t.youLabel}
          weekStartIso={status.week_start}
          weekEndIso={status.week_end}
          locale={locale}
        />
      )}

      {!query.isLoading && !query.isError && status && status.members.length > 6 && (
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

      {!query.isLoading && !query.isError && status && (prevTierGroup || nextTierGroup) && (
        <View style={styles.tierNavRow}>
          <Pressable
            disabled={!prevTierGroup}
            onPress={() => prevTierGroup && router.push({ pathname: '/(app)/league-detail', params: { id: prevTierGroup.league_id } })}
            style={({ pressed }) => [
              styles.tierNavCard,
              { borderColor: c.border, backgroundColor: c.surface },
              !prevTierGroup ? { opacity: 0.4 } : null,
              pressed && prevTierGroup ? { backgroundColor: c.background } : null,
            ]}
          >
            <ChevronDown color={c.textMuted} size={14} />
            <View style={{ minWidth: 0 }}>
              <Text style={{ color: c.textMuted, fontSize: 9, fontWeight: '700', textTransform: 'uppercase' }}>{t.prevLeagueLabel}</Text>
              <Text style={{ color: c.text, fontSize: 13, fontWeight: '700' }} numberOfLines={1}>
                {prevTierGroup ? (tierNames[prevTierGroup.tier_slug] ?? prevTierGroup.tier_slug) : '—'}
              </Text>
            </View>
          </Pressable>
          <Pressable
            disabled={!nextTierGroup}
            onPress={() => nextTierGroup && router.push({ pathname: '/(app)/league-detail', params: { id: nextTierGroup.league_id } })}
            style={({ pressed }) => [
              styles.tierNavCard,
              { borderColor: c.border, backgroundColor: c.surface, justifyContent: 'flex-end' },
              !nextTierGroup ? { opacity: 0.4 } : null,
              pressed && nextTierGroup ? { backgroundColor: c.background } : null,
            ]}
          >
            <View style={{ minWidth: 0, alignItems: 'flex-end' }}>
              <Text style={{ color: c.textMuted, fontSize: 9, fontWeight: '700', textTransform: 'uppercase' }}>{t.nextLeagueLabel}</Text>
              <Text style={{ color: c.text, fontSize: 13, fontWeight: '700' }} numberOfLines={1}>
                {nextTierGroup ? (tierNames[nextTierGroup.tier_slug] ?? nextTierGroup.tier_slug) : '—'}
              </Text>
            </View>
            <ChevronUp color={c.textMuted} size={14} />
          </Pressable>
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  headerIcon: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  customLeaguesBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs + 1, borderRadius: radius.full },
  legendRow: { flexDirection: 'row', justifyContent: 'center', gap: spacing.lg, marginTop: spacing.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 7, height: 7, borderRadius: 4 },
  tierNavRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  tierNavCard: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, borderWidth: 1, borderRadius: radius.md, padding: spacing.sm + 2 },
});
