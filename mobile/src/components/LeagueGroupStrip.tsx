import React, { useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import type { LeagueOverviewGroup } from '@/api/types';
import { useThemeColors } from '@/hooks/useThemeColors';
import { radius, spacing } from '@/constants/theme';

// ── src/components/LeagueGroupStrip.tsx — web'deki
// components/league/LeagueGroupStrip.tsx'in RN karşılığı. Faz 3 devamı
// (10 Eylül 2026 kullanıcı geri bildirimi: "Ligin üst kısmında tüm
// ligler yan yana olsun, ok tuşu ile ilerleyerek diğer lig isimlerini
// göreyim"): eskiden dikey "Tüm Ligler" kart listesinin yerini yatay
// kaydırılabilir, sol/sağ ok butonlu bir şerit aldı. league.tsx (kendi
// ligim) VE league-detail.tsx (herhangi bir grup) tarafından ORTAK
// kullanılıyor.

const SCROLL_STEP = 220;

export function LeagueGroupStrip({
  groups,
  tierNames,
  currentLeagueId,
  youLabel,
  onSelect,
}: {
  groups: LeagueOverviewGroup[];
  tierNames: Record<string, string>;
  currentLeagueId?: string;
  youLabel: string;
  onSelect: (leagueId: string) => void;
}) {
  const c = useThemeColors();
  const scrollRef = useRef<ScrollView>(null);
  const offsetX = useRef(0);

  if (groups.length === 0) return null;

  const scrollBy = (dx: number) => {
    const next = Math.max(0, offsetX.current + dx);
    scrollRef.current?.scrollTo({ x: next, animated: true });
  };

  return (
    <View style={styles.wrap}>
      <Pressable onPress={() => scrollBy(-SCROLL_STEP)} style={[styles.arrowBtn, { borderColor: c.border }]} hitSlop={6}>
        <ChevronLeft color={c.textMuted} size={16} />
      </Pressable>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        onScroll={(e) => {
          offsetX.current = e.nativeEvent.contentOffset.x;
        }}
        scrollEventThrottle={32}
        contentContainerStyle={styles.scrollContent}
        style={{ flex: 1 }}
      >
        {groups.map((g) => {
          const active = g.league_id === currentLeagueId;
          return (
            <Pressable
              key={g.league_id}
              onPress={() => onSelect(g.league_id)}
              style={({ pressed }) => [
                styles.chip,
                {
                  borderColor: active ? c.warning : c.border,
                  backgroundColor: active ? c.warningSoft : c.surface,
                },
                pressed ? { opacity: 0.7 } : null,
              ]}
            >
              <Text style={{ color: active ? c.warning : c.text, fontSize: 12, fontWeight: '700' }}>
                {tierNames[g.tier_slug] ?? g.tier_slug}
              </Text>
              <Text style={{ color: c.textMuted, fontSize: 10, marginTop: 1 }} numberOfLines={1}>
                {g.group_name}
                {g.is_mine ? ` · ${youLabel}` : ''}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <Pressable onPress={() => scrollBy(SCROLL_STEP)} style={[styles.arrowBtn, { borderColor: c.border }]} hitSlop={6}>
        <ChevronRight color={c.textMuted} size={16} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  arrowBtn: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: { flexDirection: 'row', gap: spacing.xs, paddingVertical: 2 },
  chip: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    minWidth: 92,
  },
});
