import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { MessageCircle } from 'lucide-react-native';
import { socialApi } from '@/api/social';
import type { ConversationItem } from '@/api/types';
import { MESSAGES_STRINGS } from '@/i18n/messagesStrings';
import { useLocale } from '@/i18n';
import { useAuth } from '@/store/auth';
import { useThemeColors } from '@/hooks/useThemeColors';
import { radius, spacing } from '@/constants/theme';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';

// ── Mesajlar (gelen kutusu) — web'deki app/(app)/messages/page.tsx'in
// mobil karşılığı. Web'de olduğu gibi bu ekranda "yeni konuşma başlat" yok
// — yeni bir konuşma sadece bir kullanıcının herkese açık profilindeki
// "Mesaj gönder" ile başlar. Web ile aynı şekilde WebSocket YOK, 8sn'lik
// polling kullanılıyor (react-query'nin `refetchInterval`'ı bunu native
// olarak sağlıyor — ekran arka plandayken/unmount olduğunda otomatik durur).
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
function initialOf(name: string): string {
  return (name || '?').charAt(0).toUpperCase();
}

export default function MessagesInboxScreen() {
  const { locale } = useLocale();
  const { user } = useAuth();
  const c = useThemeColors();
  const ms = MESSAGES_STRINGS[locale] ?? MESSAGES_STRINGS.tr;

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['social-conversations'],
    queryFn: socialApi.getConversations,
    refetchInterval: 8000,
  });

  const openThread = (username?: string) => {
    if (!username) return;
    router.push({ pathname: '/(app)/message-thread', params: { username } });
  };

  return (
    <ScreenContainer refreshing={isRefetching} onRefresh={refetch}>
      <View style={styles.headerRow}>
        <View style={[styles.headerIcon, { backgroundColor: c.primarySoft }]}>
          <MessageCircle color={c.primary} size={18} />
        </View>
        <Text style={{ color: c.text, fontSize: 20, fontWeight: '700' }}>{ms.inboxTitle}</Text>
      </View>

      {isLoading && (
        <View style={{ alignItems: 'center', paddingVertical: spacing.xl }}>
          <ActivityIndicator color={c.primary} />
        </View>
      )}
      {!isLoading && isError && (
        <Card style={{ backgroundColor: c.dangerSoft, borderColor: c.dangerSoft }}>
          <Text style={{ color: c.danger, fontSize: 13 }}>{ms.inboxError}</Text>
        </Card>
      )}
      {!isLoading && !isError && (data?.length ?? 0) === 0 && <EmptyState title={ms.empty} subtitle={ms.emptySub} />}

      {(data ?? []).map((conv: ConversationItem) => {
        const name = conv.other_user.display_name || conv.other_user.username || '?';
        const isMine = !!user && conv.last_message_sender_id === user.id;
        const unread = conv.unread_count > 0;
        return (
          <Pressable key={conv.id} onPress={() => openThread(conv.other_user.username)} style={styles.row}>
            <View style={{ position: 'relative' }}>
              <View style={[styles.avatar, { backgroundColor: c.border }]}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: c.textSecondary }}>{initialOf(name)}</Text>
              </View>
              {unread && (
                <View style={[styles.unreadBadge, { backgroundColor: c.danger }]}>
                  <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>{conv.unread_count > 9 ? '9+' : conv.unread_count}</Text>
                </View>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: c.text, fontSize: 14, fontWeight: unread ? '700' : '600' }} numberOfLines={1}>
                {name}
              </Text>
              <Text style={{ color: c.textMuted, fontSize: 12, marginTop: 1 }} numberOfLines={1}>
                {conv.last_message_preview ? `${isMine ? `${ms.you}: ` : ''}${conv.last_message_preview}` : ''}
              </Text>
            </View>
            <Text style={{ color: c.textMuted, fontSize: 11 }}>{formatWhen(conv.last_message_at, locale)}</Text>
          </Pressable>
        );
      })}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg },
  headerIcon: { width: 34, height: 34, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  unreadBadge: { position: 'absolute', top: -2, right: -2, minWidth: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
});
