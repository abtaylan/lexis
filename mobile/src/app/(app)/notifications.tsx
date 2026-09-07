import React from 'react';
import { ActivityIndicator, Alert, Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, type Href } from 'expo-router';
import { Bell, MessageCircle, Trophy, UserPlus, Flame, Trash2 } from 'lucide-react-native';
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
//
// KULLANICI GERİ BİLDİRİMİ (7 Eylül 2026): "üzerine tıklayınca bir şey
// olmadı [...] ona tıklayınca o sayfaya geçiş olmalı ve bildirim temizle
// özelliği olmalı" — bkz. aşağıdaki routeFor() (tıklayınca ilgili sayfaya
// yönlendirme) ve onDelete/onClearAll (tekil/toplu silme).
//
// Not: backend bildirim satırlarında (friend_request/friend_accept/
// challenge_*/new_message/reward) hedef kaydın id'si tutulmuyor — sadece
// schedule_reminder için schedule_item_id var (bkz. NotificationResponse).
// Bu yüzden yönlendirme "hangi ekran" seviyesinde (örn. arkadaşlık isteği
// → Arkadaşlar ekranı, İstekler sekmesi), belirli bir kullanıcı/sohbete
// değil.
function iconFor(type: string, color: string, size: number) {
  if (type === 'new_message') return <MessageCircle color={color} size={size} />;
  if (type === 'friend_request' || type === 'follow') return <UserPlus color={color} size={size} />;
  if (type === 'badge' || type === 'leaderboard_reward') return <Trophy color={color} size={size} />;
  if (type === 'reward') return <Flame color={color} size={size} />;
  return <Bell color={color} size={size} />;
}

// Bildirim türünden hedef ekrana yönlendirme. Karşılığı olmayan türler
// (challenge_* — mobilde henüz bir Meydan Okumalar ekranı yok, bkz.
// friends.tsx'teki not) için null döner: sadece okundu işaretlenir, sayfa
// değişmez.
function routeFor(n: Notification): Href | null {
  switch (n.type) {
    case 'friend_request':
      return { pathname: '/(app)/friends', params: { tab: 'requests' } };
    case 'friend_accept':
    case 'follow':
      return { pathname: '/(app)/friends', params: { tab: 'friends' } };
    case 'new_message':
      return '/(app)/messages';
    case 'reward':
      return '/(app)/stats';
    case 'schedule_reminder':
      return '/(app)/schedule';
    default:
      return null;
  }
}

// Swipeable'ın renderRightActions'ı — sola kaydırınca ortaya çıkan kırmızı
// "Sil" aksiyonu. progress 0→1 arası animasyonla genişleyip belirginleşir.
function DeleteAction({
  progress,
  onPress,
  label,
}: {
  progress: Animated.AnimatedInterpolation<number>;
  onPress: () => void;
  label: string;
}) {
  const c = useThemeColors();
  const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1], extrapolate: 'clamp' });
  return (
    <Pressable onPress={onPress} style={[styles.deleteAction, { backgroundColor: c.danger }]}>
      <Animated.View style={{ alignItems: 'center', gap: 2, transform: [{ scale }] }}>
        <Trash2 color="#fff" size={18} />
        <Text style={styles.deleteActionText}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
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
  const { locale, t } = useLocale();
  const c = useThemeColors();
  const ns = NOTIFICATIONS_STRINGS[locale] ?? NOTIFICATIONS_STRINGS.tr;
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.getAll(50),
  });

  const items = data?.items ?? [];
  const hasUnread = items.some((n) => !n.is_read);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });
  const clearAllMutation = useMutation({
    mutationFn: () => notificationsApi.clearAll(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const onMarkAllRead = async () => {
    await notificationsApi.markAllRead();
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
  };

  const onClearAll = () => {
    Alert.alert(ns.clearAll, ns.clearAllConfirm, [
      { text: t('cancelBtn'), style: 'cancel' },
      { text: ns.clearAllBtn, style: 'destructive', onPress: () => clearAllMutation.mutate() },
    ]);
  };

  // KULLANICI GERİ BİLDİRİMİ (7 Eylül 2026): "üzerine tıklayınca bir şey
  // olmadı" — önceki sürümde okundu-işaretleme isteği `await` ediliyordu;
  // bu istek başarısız olursa (ağ hatası, backend henüz deploy olmamış
  // vb.) yönlendirme koduna hiç ulaşılmıyordu. Artık yönlendirme HER
  // ZAMAN hemen çalışıyor; okundu işaretleme arka planda, sonucu
  // beklemeden ve hata olsa bile sessizce (navigasyonu etkilemeden)
  // yapılıyor.
  const onPressItem = (n: Notification) => {
    if (!n.is_read) {
      notificationsApi
        .markRead(n.id)
        .then(() => queryClient.invalidateQueries({ queryKey: ['notifications'] }))
        .catch(() => {});
    }
    const target = routeFor(n);
    if (target) router.push(target);
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
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          {hasUnread && (
            <Pressable onPress={onMarkAllRead} hitSlop={8}>
              <Text style={{ color: c.primary, fontSize: 12, fontWeight: '600' }}>{ns.markAllRead}</Text>
            </Pressable>
          )}
          {items.length > 0 && (
            <Pressable onPress={onClearAll} hitSlop={8}>
              <Text style={{ color: c.danger, fontSize: 12, fontWeight: '600' }}>{ns.clearAll}</Text>
            </Pressable>
          )}
        </View>
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
        // KULLANICI GERİ BİLDİRİMİ (7 Eylül 2026): "üzerine gelince sola
        // kaydır yapıp, sil butonu çıksın" — sabit çöp kutusu ikonu yerine
        // sola kaydırınca (swipe) açılan kırmızı "Sil" aksiyonu.
        <Swipeable
          key={n.id}
          renderRightActions={(progress) => (
            <DeleteAction progress={progress} onPress={() => deleteMutation.mutate(n.id)} label={ns.deleteBtn} />
          )}
          overshootRight={false}
          rightThreshold={40}
        >
          <Pressable onPress={() => onPressItem(n)} style={[styles.row, { backgroundColor: c.background }]}>
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
        </Swipeable>
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
  deleteAction: { width: 72, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, marginLeft: spacing.sm },
  deleteActionText: { color: '#fff', fontSize: 11, fontWeight: '700' },
});
