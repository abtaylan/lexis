import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { statsApi } from '@/api/stats';
import { useLocale } from '@/i18n';
import { useThemeColors } from '@/hooks/useThemeColors';
import { radius, spacing } from '@/constants/theme';
import { Card } from '@/components/ui/Card';

export function XPBar() {
  const { xpLabels } = useLocale();
  const c = useThemeColors();
  const { data: xp } = useQuery({ queryKey: ['xp'], queryFn: statsApi.getXp });

  if (!xp) return null;

  const span = Math.max(1, xp.next_level_xp_target - xp.current_level_xp_floor);
  const pct = Math.min(100, Math.max(0, Math.round((xp.xp_into_level / span) * 100)));

  return (
    <Card style={{ marginBottom: spacing.md }}>
      <View style={styles.row}>
        <View style={styles.left}>
          <View style={[styles.levelBadge, { backgroundColor: c.warningSoft }]}>
            <Text style={{ color: c.warning, fontWeight: '700', fontSize: 14 }}>{xp.level}</Text>
          </View>
          <View>
            <Text style={{ color: c.text, fontWeight: '600', fontSize: 14 }}>
              {xpLabels.level} {xp.level}
            </Text>
            <Text style={{ color: c.textMuted, fontSize: 12 }}>{xp.total_xp} XP</Text>
          </View>
        </View>
        <Text style={{ color: c.textMuted, fontSize: 12 }}>
          {xp.xp_to_next_level} XP {xpLabels.toNextLevel}
        </Text>
      </View>
      <View style={[styles.track, { backgroundColor: c.border }]}>
        <View style={[styles.fill, { width: `${pct}%`, backgroundColor: c.primary }]} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  left: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  levelBadge: { width: 36, height: 36, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  track: { height: 8, borderRadius: radius.full, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.full },
});
