import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, MessageCircle, Trophy, UserPlus, Flame } from 'lucide-react-native';
import { notificationsApi } from '@/api/notifications';
import type { Notification } from '@/api/types';
import { NOTIFICATIONS_STRINGS } from '@/i18n/notificationsStrings';
import { useLocale } from '@/i18n';
import { useThemeColors } from '@/hooks/useThemeColors';
import { radius, spacing } from '@/constants/theme';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { EmptyState } from '@/components/ui/EmptyState';
import { Card } from '@/components/ui/Card';

// ── Bildirimler — DashboardHeader'daki zil ikonundan açılır. Backend
// GET /notifications (bkz. api/routes/notifications.py) polling ile
// çekilir; mesajlaşmayla aynı desen (WebSocket yok, bkz. messages.tsx).
function iconFor(type: string, color: string, size: number) {
  if (type === 'new_message') return <MessageCircle color={color} size={size} />;
  if (type === 'friend_request' || type === 'follow') return <UserPlus color={color} size={size} />;
  if (type === 'badge' || type === 'leaderboard_reward') return <Trophy color={color} size={size} />;
  if (type === 'streak') return <Flame color={color} size={size} />;
  return <Bell color={color} size={size} />;
}

function pad2(n: number) {
  return n < 10 ? `0${n}` : String(n);
}
function formatWhen(iso: string, locale: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  try {
    if (sameDay) return d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
  } catch {
    if (sameDay) return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
    return `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}`;
  }
}

export default function NotificationsScreen() {
  const { locale } = useLocale();
  const c = useThemeColors();
  const ns = NOTIFICATIONS_STRINGS[locale] ?? NOTIFICATIONS_STRINGS.tr;
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.getAll(50),
  });

  const items = data?.items ?? [];
  const hasUnread = items.some((n) => !n.is_read);

  const onMarkAllRead = async () => {
    await notificationsApi.markAllRead();
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
  };

  const onPressItem = async (n: Notification) => {
    if (!n.is_read) {
      await notificationsApi.markRead(n.id);
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  };

  return (
    <ScreenContainer refreshing={isRefetching} onRefresh={refetch}>
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <View style={[styles.headerIcon, { backgroundColor: c.primarySoft }]}>
            <Bell color={c.primary} size={18} />
          </View>
          <Text style={{ color: c.text, fontSize: 20, fontWeight: '700' }}>{ns.title}</Text>
        </View>
        {hasUnread && (
          <Pressable onPress={onMarkAllRead} hitSlop={8}>
            <Text style={{ color: c.primary, fontSize: 12, fontWeight: '600' }}>{ns.markAllRead}</Text>
          </Pressable>
        )}
      </View>

      {isLoading && (
        <View style={{ alignItems: 'center', paddingVertical: spacing.xl }}>
          <ActivityIndicator color={c.primary} />
        </View>
      )}
      {!isLoading && isError && (
        <Card style={{ backgroundColor: c.dangerSoft, borderColor: c.dangerSoft }}>
          <Text style={{ color: c.danger, fontSize: 13 }}>{ns.error}</Text>
        </Card>
      )}
      {!isLoading && !isError && items.length === 0 && <EmptyState title={ns.empty} subtitle={ns.emptySub} />}

      {items.map((n) => (
        <Pressable key={n.id} onPress={() => onPressItem(n)} style={styles.row}>
          <View style={[styles.iconWrap, { backgroundColor: n.is_read ? c.border : c.primarySoft }]}>
            {iconFor(n.type, n.is_read ? c.textMuted : c.primary, 18)}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: c.text, fontSize: 14, fontWeight: n.is_read ? '500' : '700' }} numberOfLines={1}>
              {n.title}
            </Text>
            <Text style={{ color: c.textMuted, fontSize: 12, marginTop: 1 }} numberOfLines={2}>
              {n.message}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 4 }}>
            <Text style={{ color: c.textMuted, fontSize: 11 }}>{formatWhen(n.created_at, locale)}</Text>
            {!n.is_read && <View style={[styles.dot, { backgroundColor: c.danger }]} />}
          </View>
        </Pressable>
      ))}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  headerIcon: { width: 34, height: 34, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  iconWrap: { width: 36, height: 36, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 7, height: 7, borderRadius: 4 },
});
