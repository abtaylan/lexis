import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { Bell, MessageCircle, Flame } from 'lucide-react-native';
import { notificationsApi } from '@/api/notifications';
import { socialApi } from '@/api/social';
import { statsApi } from '@/api/stats';
import { useAuth } from '@/store/auth';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useLocale } from '@/i18n';
import { radius, spacing } from '@/constants/theme';

// ── Dashboard hero header — onaylanan tasarım canvas'ındaki (Main.dc.html,
// "Gradient hero (Yön B'den)") nihai haliyle birebir: marka renklerinde
// (primary → accent) 135°'lik gradyan, sağ üstte bildirim/mesaj/profil
// kısayolları, altında seri (streak) ve seviye/XP kartları gömülü olarak
// yer alır. Önceki sürüm expo-linear-gradient'i yeni bir native bağımlılık
// olarak eklememek için düz renk kullanıyordu — tasarımın kendisi gradyan
// üzerine kurulu olduğundan bu sürümde resmi Expo paketi (expo-linear-gradient,
// mobile/package.json'a eklendi) ile gerçek gradyana geçildi.
interface DashboardHeaderProps {
  greeting: string;
  subtitle: string;
}

export function DashboardHeader({ greeting, subtitle }: DashboardHeaderProps) {
  const c = useThemeColors();
  const { user } = useAuth();
  const { xpLabels } = useLocale();

  const { data: notifData } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.getAll(50),
    refetchInterval: 30000,
  });
  const { data: unreadMessages } = useQuery({
    queryKey: ['social-unread-count'],
    queryFn: socialApi.getUnreadMessageCount,
    refetchInterval: 30000,
  });
  const { data: stats } = useQuery({ queryKey: ['stats-summary'], queryFn: statsApi.getSummary });
  const { data: xp } = useQuery({ queryKey: ['xp'], queryFn: statsApi.getXp });

  const unreadNotifications = notifData?.unread_count ?? 0;
  const hasUnreadMessages = (unreadMessages ?? 0) > 0;
  const initial = (user?.display_name || user?.username || '?').trim().charAt(0).toUpperCase();

  const xpSpan = xp ? Math.max(1, xp.next_level_xp_target - xp.current_level_xp_floor) : 1;
  const xpPct = xp ? Math.min(100, Math.max(0, Math.round((xp.xp_into_level / xpSpan) * 100))) : 0;

  return (
    <LinearGradient
      colors={[c.primary, c.accent]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.wrap}
    >
      <View style={styles.topRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.greeting} numberOfLines={1}>
            {greeting}
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>

        <View style={styles.actions}>
          <HeaderIconButton
            icon={<Bell color="#fff" size={17} />}
            count={unreadNotifications}
            onPress={() => router.push('/(app)/notifications')}
          />
          <HeaderIconButton
            icon={<MessageCircle color="#fff" size={17} />}
            dot={hasUnreadMessages}
            onPress={() => router.push('/(app)/messages')}
          />
          <Pressable onPress={() => router.push('/(app)/profile')} style={styles.avatar} hitSlop={8}>
            <Text style={styles.avatarText}>{initial}</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.cardsRow}>
        <View style={styles.miniCard}>
          <View style={styles.miniCardHead}>
            <Flame color="#fff" size={16} />
            <Text style={styles.miniCardLabel}>SERİ</Text>
          </View>
          <Text style={styles.miniCardValue}>{stats?.current_streak ?? 0} gün</Text>
        </View>

        <View style={styles.miniCard}>
          <View style={[styles.miniCardHead, { justifyContent: 'space-between' }]}>
            <Text style={styles.miniCardLabel}>{xp ? `${xpLabels.level.toUpperCase()} ${xp.level}` : '—'}</Text>
            {xp && <Text style={styles.xpRemaining}>{xp.xp_to_next_level} XP kaldı</Text>}
          </View>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${xpPct}%` }]} />
          </View>
        </View>
      </View>
    </LinearGradient>
  );
}

function HeaderIconButton({
  icon,
  count,
  dot,
  onPress,
}: {
  icon: React.ReactNode;
  count?: number;
  dot?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.iconBtn} hitSlop={8}>
      {icon}
      {!!count && count > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{count > 9 ? '9+' : count}</Text>
        </View>
      )}
      {!count && dot && <View style={styles.badgeDot} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderBottomLeftRadius: radius.xl + 8,
    borderBottomRightRadius: radius.xl + 8,
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  topRow: { flexDirection: 'row', alignItems: 'center' },
  greeting: { color: '#fff', fontSize: 20, fontWeight: '700' },
  subtitle: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 2 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  badge: {
    position: 'absolute',
    top: -3,
    right: -3,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  badgeDot: {
    position: 'absolute',
    top: -1,
    right: -1,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#DC2626',
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  cardsRow: { flexDirection: 'row', gap: spacing.sm },
  miniCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: radius.lg,
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.md,
  },
  miniCardHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  miniCardLabel: { fontSize: 11, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
  miniCardValue: { fontSize: 22, fontWeight: '700', color: '#fff' },
  xpRemaining: { fontSize: 11, color: 'rgba(255,255,255,0.8)' },
  track: { height: 7, borderRadius: radius.full, backgroundColor: 'rgba(255,255,255,0.25)', overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.full, backgroundColor: '#fff' },
});
