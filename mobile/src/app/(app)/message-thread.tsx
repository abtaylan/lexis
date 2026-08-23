import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Pressable,
  StyleSheet, Text, TextInput, View,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Send } from 'lucide-react-native';
import { socialApi } from '@/api/social';
import type { MessageItem } from '@/api/types';
import { MESSAGES_STRINGS } from '@/i18n/messagesStrings';
import { useLocale } from '@/i18n';
import { useAuth } from '@/store/auth';
import { useThemeColors } from '@/hooks/useThemeColors';
import { radius, spacing } from '@/constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';

// ── Konuşma (mesaj thread) — web'deki app/(app)/messages/[username]/page.tsx
// karşılığı. Kullanıcı adı, bracket route yerine expo-router `params` ile
// taşınıyor (bu codebase'de henüz hiç iç içe/dinamik route yok, flat-file
// kuralına uyulduğu için — bkz. friends.tsx ve u/profil ekranı da aynı
// deseni kullanıyor). Web ile aynı: WebSocket YOK, 4sn'lik polling.
// Mobilde web'in `scrollIntoView` DOM API'si yok — bunun yerine `inverted`
// FlatList kullanılıyor (en yeni mesaj en altta, liste ters çevrilip en
// yeni-önce sıralanmış veriyle besleniyor — standart RN sohbet deseni).
export default function MessageThreadScreen() {
  const { username: usernameParam } = useLocalSearchParams<{ username: string }>();
  const username = typeof usernameParam === 'string' ? usernameParam : '';
  const { locale } = useLocale();
  const { user } = useAuth();
  const c = useThemeColors();
  const qc = useQueryClient();
  const ms = MESSAGES_STRINGS[locale] ?? MESSAGES_STRINGS.tr;

  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [sendErrorFlag, setSendErrorFlag] = useState(false);

  const { data: thread, isLoading, error } = useQuery({
    queryKey: ['social-thread', username],
    queryFn: () => socialApi.getConversationThread(username),
    enabled: !!username,
    refetchInterval: 4000,
    retry: false,
  });

  const status = (error as { response?: { status?: number } } | null)?.response?.status;
  const notFound = status === 404;
  const blocked = status === 403;
  const genericError = !!error && !notFound && !blocked;

  const handleSend = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    setSendErrorFlag(false);
    try {
      const sent = await socialApi.sendMessage(username, text);
      setDraft('');
      // İyimser ekleme — web her gönderimden sonra tüm thread'i yeniden
      // çekiyordu, mobilde algılanan gecikmeyi azaltmak için mesajı hemen
      // listeye ekliyoruz; bir sonraki poll zaten sunucuyla senkronlar.
      qc.setQueryData(['social-thread', username], (prev: typeof thread) =>
        prev ? { ...prev, messages: [...prev.messages, sent] } : prev
      );
      qc.invalidateQueries({ queryKey: ['social-conversations'] });
    } catch {
      setSendErrorFlag(true);
    } finally {
      setSending(false);
    }
  };

  const goBack = () => router.push('/(app)/messages');

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.flex, { backgroundColor: c.background }]} edges={['top']}>
        <View style={{ padding: spacing.lg }}>
          <ActivityIndicator color={c.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (notFound || blocked || genericError) {
    return (
      <SafeAreaView style={[styles.flex, { backgroundColor: c.background }]} edges={['top']}>
        <View style={{ padding: spacing.lg }}>
          <View style={{ backgroundColor: blocked ? c.dangerSoft : c.background, borderRadius: radius.lg, padding: spacing.md }}>
            <Text style={{ color: blocked ? c.danger : c.textSecondary, fontSize: 13 }}>
              {notFound ? ms.notFound : blocked ? ms.blockedError : ms.threadError}
            </Text>
          </View>
          <Pressable onPress={goBack} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.md }}>
            <ArrowLeft color={c.primary} size={16} />
            <Text style={{ color: c.primary, fontSize: 13, fontWeight: '600' }}>{ms.threadBack}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (!thread) return null;

  const other = thread.other_user;
  const otherName = other.display_name || other.username || '?';
  const reversedMessages = [...thread.messages].reverse();

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: c.background }]} edges={['top']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={8}>
        <View style={[styles.header, { borderBottomColor: c.border }]}>
          <Pressable onPress={goBack} hitSlop={10}>
            <ArrowLeft color={c.textMuted} size={20} />
          </Pressable>
          <Pressable
            onPress={() => other.username && router.push({ pathname: '/(app)/user-profile', params: { username: other.username } })}
            style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 }}
          >
            <View style={[styles.avatar, { backgroundColor: c.primary }]}>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>{otherName.charAt(0).toUpperCase()}</Text>
            </View>
            <Text style={{ color: c.text, fontSize: 15, fontWeight: '700' }} numberOfLines={1}>{otherName}</Text>
          </Pressable>
        </View>

        {reversedMessages.length === 0 ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: c.textMuted, fontSize: 13 }}>{ms.emptyThread}</Text>
          </View>
        ) : (
          <FlatList
            data={reversedMessages}
            keyExtractor={(m) => m.id}
            inverted
            contentContainerStyle={{ padding: spacing.md, gap: 6 }}
            renderItem={({ item }) => {
              const mine = item.sender_id === user?.id;
              return (
                <View style={{ flexDirection: 'row', justifyContent: mine ? 'flex-end' : 'flex-start' }}>
                  <View
                    style={[
                      styles.bubble,
                      mine
                        ? { backgroundColor: c.primary, borderBottomRightRadius: 4 }
                        : { backgroundColor: c.surface, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: c.border },
                    ]}
                  >
                    <Text style={{ color: mine ? '#fff' : c.text, fontSize: 14 }}>{item.body}</Text>
                    <Text style={{ color: mine ? 'rgba(255,255,255,0.75)' : c.textMuted, fontSize: 10, marginTop: 3 }}>
                      {new Date(item.created_at).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                </View>
              );
            }}
          />
        )}

        {sendErrorFlag ? (
          <Text style={{ color: c.danger, fontSize: 11, paddingHorizontal: spacing.md }}>{ms.threadError}</Text>
        ) : null}

        <View style={[styles.composerRow, { borderTopColor: c.border }]}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder={ms.placeholder}
            placeholderTextColor={c.textMuted}
            maxLength={2000}
            style={[styles.input, { borderColor: c.border, color: c.text, backgroundColor: c.surface }]}
            returnKeyType="send"
            onSubmitEditing={handleSend}
          />
          <Pressable
            onPress={handleSend}
            disabled={sending || !draft.trim()}
            style={[styles.sendBtn, { backgroundColor: c.primary, opacity: sending || !draft.trim() ? 0.5 : 1 }]}
          >
            {sending ? <ActivityIndicator color="#fff" size="small" /> : <Send color="#fff" size={16} />}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: 1 },
  avatar: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  bubble: { maxWidth: '78%', borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  composerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderTopWidth: 1 },
  input: { flex: 1, borderWidth: 1.5, borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontSize: 14 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
