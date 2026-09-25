// src/app/(app)/roleplay.tsx — "Roleplay/diyalog botu" (24 Eylül 2026,
// Madde 2 — ikinci seçim) sohbet ekranı. message-thread.tsx'teki AYNI
// sohbet UI deseni (FlatList inverted, balon stilleri, composer satırı) --
// mevcut mesajlaşma ekranına hiç dokunulmadı, sadece görsel dili tekrar
// kullanıldı. İki aşama: senaryo seçimi -> canlı sohbet. Mikrofon/STT YOK.
import React, { useState } from 'react';
import {
  ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Pressable,
  StyleSheet, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Flag, Home, MessagesSquare, Send, Sparkles } from 'lucide-react-native';
import { useLocale } from '@/i18n';
import { roleplayApi } from '@/api/roleplay';
import type { RoleplayMessage, RoleplayScenario } from '@/api/types';
import { useThemeColors } from '@/hooks/useThemeColors';
import { radius, spacing } from '@/constants/theme';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';

const L: Record<'tr' | 'en', Record<string, string>> = {
  tr: {
    title: 'Diyalog Pratiği',
    subtitle: 'Bir senaryo seç, hedef dilinde canlı bir sohbete başla.',
    error: 'Bir şeyler ters gitti.',
    placeholder: 'Mesajını yaz…',
    finishBtn: 'Bitir',
    newSessionBtn: 'Yeni Senaryo',
    xpEarnedTpl: '+{xp} XP kazandın!',
    xpNoneMsg: 'Oturum bitti. Daha uzun bir sohbet XP kazandırır.',
    turnCounterTpl: '{turn}/{max} tur',
    home: 'Ana Menü',
  },
  en: {
    title: 'Roleplay Practice',
    subtitle: 'Pick a scenario and start a live chat in your target language.',
    error: 'Something went wrong.',
    placeholder: 'Type your message…',
    finishBtn: 'Finish',
    newSessionBtn: 'New Scenario',
    xpEarnedTpl: '+{xp} XP earned!',
    xpNoneMsg: 'Session ended. A longer chat earns XP.',
    turnCounterTpl: '{turn}/{max} turns',
    home: 'Home',
  },
};

type Stage = 'pick' | 'chat' | 'finished';

export default function RoleplayScreen() {
  const c = useThemeColors();
  const { locale } = useLocale();
  const t = L[locale === 'tr' ? 'tr' : 'en'];

  const { data: scenarios } = useQuery({
    queryKey: ['roleplay-scenarios'],
    queryFn: roleplayApi.listScenarios,
  });

  const [stage, setStage] = useState<Stage>('pick');
  const [error, setError] = useState('');
  const [starting, setStarting] = useState<string | null>(null);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<RoleplayMessage[]>([]);
  const [turnCount, setTurnCount] = useState(0);
  const [maxTurns, setMaxTurns] = useState(20);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [xpAwarded, setXpAwarded] = useState<number | null>(null);

  const handleStart = async (scenario: RoleplayScenario) => {
    setStarting(scenario.slug);
    setError('');
    try {
      const session = await roleplayApi.startSession(scenario.slug);
      setSessionId(session.id);
      setMessages(session.messages);
      setTurnCount(session.turn_count);
      setStage('chat');
    } catch {
      setError(t.error);
    } finally {
      setStarting(null);
    }
  };

  const handleSend = async () => {
    const text = draft.trim();
    if (!text || !sessionId || sending) return;
    setSending(true);
    setError('');
    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    setDraft('');
    try {
      const res = await roleplayApi.sendMessage(sessionId, text);
      setMessages((prev) => [...prev, { role: 'assistant', content: res.reply }]);
      setTurnCount(res.turn_count);
      setMaxTurns(res.max_turns);
    } catch {
      setError(t.error);
    } finally {
      setSending(false);
    }
  };

  const handleFinish = async () => {
    if (!sessionId || finishing) return;
    setFinishing(true);
    setError('');
    try {
      const res = await roleplayApi.finishSession(sessionId);
      setXpAwarded(res.xp_awarded);
      setStage('finished');
    } catch {
      setError(t.error);
    } finally {
      setFinishing(false);
    }
  };

  const handleNewSession = () => {
    setSessionId(null);
    setMessages([]);
    setTurnCount(0);
    setXpAwarded(null);
    setStage('pick');
  };

  const reversedMessages = [...messages].reverse();

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: c.background }]} edges={['top']}>
      {/* words.tsx'teki AYNI Android duzeltmesi (bkz. o dosyadaki yorum,
          24 Eylul 2026, Task #15): Android'de 'padding' davranisi
          beklendigi gibi calismiyor -- klavye acilinca composer alani
          klavyenin arkasinda kalip gorunmuyordu. 'height' ile duzeltildi. */}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <View style={[styles.header, { borderBottomColor: c.border }]}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <ArrowLeft color={c.textMuted} size={20} />
          </Pressable>
          <Text style={{ color: c.text, fontSize: 15, fontWeight: '700', flex: 1 }}>{t.title}</Text>
          {stage === 'chat' && (
            <Pressable onPress={handleFinish} disabled={finishing} hitSlop={10} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              {finishing ? <ActivityIndicator size="small" color={c.textMuted} /> : <Flag color={c.textMuted} size={16} />}
              <Text style={{ color: c.textMuted, fontSize: 12, fontWeight: '600' }}>{t.finishBtn}</Text>
            </Pressable>
          )}
          <Pressable onPress={() => router.replace('/(app)/dashboard')} hitSlop={10}>
            <Home color={c.textMuted} size={20} />
          </Pressable>
        </View>

        {!!error && <Text style={{ color: c.danger, fontSize: 12, textAlign: 'center', marginTop: spacing.sm }}>{error}</Text>}

        {stage === 'pick' && (
          <View style={{ flex: 1, padding: spacing.md, gap: spacing.sm }}>
            <Text style={{ color: c.textMuted, fontSize: 13 }}>{t.subtitle}</Text>
            {(scenarios ?? []).map((s) => (
              <Pressable
                key={s.slug}
                onPress={() => handleStart(s)}
                disabled={!!starting}
                style={[styles.scenarioRow, { backgroundColor: c.surface, borderColor: c.border, opacity: starting ? 0.7 : 1 }]}
              >
                <View style={[styles.scenarioIcon, { backgroundColor: c.primarySoft }]}>
                  <MessagesSquare color={c.primary} size={18} />
                </View>
                <Text style={{ color: c.text, fontSize: 14, fontWeight: '600', flex: 1 }}>
                  {locale === 'tr' ? s.title_tr : s.title_en}
                </Text>
                {starting === s.slug && <ActivityIndicator size="small" color={c.textMuted} />}
              </Pressable>
            ))}
          </View>
        )}

        {stage === 'chat' && (
          <>
            <Text style={{ color: c.textMuted, fontSize: 11, textAlign: 'center', marginTop: 4 }}>
              {t.turnCounterTpl.replace('{turn}', String(turnCount)).replace('{max}', String(maxTurns))}
            </Text>
            <FlatList
              data={reversedMessages}
              keyExtractor={(_, i) => String(i)}
              inverted
              contentContainerStyle={{ padding: spacing.md, gap: 6 }}
              renderItem={({ item }) => {
                const mine = item.role === 'user';
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
                      <Text style={{ color: mine ? '#fff' : c.text, fontSize: 14 }}>{item.content}</Text>
                    </View>
                  </View>
                );
              }}
            />
            <View style={[styles.composerRow, { borderTopColor: c.border }]}>
              <TextInput
                value={draft}
                onChangeText={setDraft}
                placeholder={t.placeholder}
                placeholderTextColor={c.textMuted}
                maxLength={500}
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
          </>
        )}

        {stage === 'finished' && (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.lg }}>
            <View style={[styles.finishIcon, { backgroundColor: c.successSoft }]}>
              <Sparkles color={c.success} size={26} />
            </View>
            <Text style={{ color: c.text, fontSize: 15, fontWeight: '700', textAlign: 'center' }}>
              {xpAwarded ? t.xpEarnedTpl.replace('{xp}', String(xpAwarded)) : t.xpNoneMsg}
            </Text>
            <Pressable onPress={handleNewSession} style={[styles.newBtn, { backgroundColor: c.primary }]}>
              <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>{t.newSessionBtn}</Text>
            </Pressable>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: 1 },
  scenarioRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 4, borderRadius: radius.lg, borderWidth: 1, padding: spacing.md },
  scenarioIcon: { width: 36, height: 36, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  bubble: { maxWidth: '78%', borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  composerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderTopWidth: 1 },
  input: { flex: 1, borderWidth: 1, borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2, fontSize: 14 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  finishIcon: { width: 56, height: 56, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  newBtn: { borderRadius: radius.lg, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm + 4 },
});
