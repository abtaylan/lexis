// src/app/(app)/roleplay.tsx — "Roleplay/diyalog botu" (ilk sürüm: 24 Eylül
// 2026; 25 Kasım 2026'da dallanan diyalog ağacına GEÇİŞ — kullanıcı isteği:
// serbest metin yazmak yerine her adımda sunulan 3 hazır cevaptan birini
// işaretleyerek konuşma pratiği). Dört aşama: kategori seçimi -> senaryo
// seçimi -> sabit/dallanan sohbet -> bitiş. Mikrofon/STT YOK.
import React, { useState } from 'react';
import {
  ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Pressable,
  ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft, Check, Flag, Home, Minus, MessagesSquare, Sparkles, X,
  Plane, Utensils, ShoppingBag, GraduationCap, Users, Heart, Stethoscope,
  Landmark, Headphones, Ticket, FileText, Car, Briefcase,
} from 'lucide-react-native';
import { useLocale } from '@/i18n';
import { roleplayApi } from '@/api/roleplay';
import type { RoleplayCategory, RoleplayOption } from '@/api/types';
import { useThemeColors } from '@/hooks/useThemeColors';
import { radius, spacing } from '@/constants/theme';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';

// roleplay_data.py::CATEGORIES içindeki icon alanıyla birebir eşleşir
// (web/src/app/(app)/roleplay/page.tsx'teki ICONS ile AYNI harita).
const ICONS: Record<string, typeof Plane> = {
  plane: Plane,
  utensils: Utensils,
  'shopping-bag': ShoppingBag,
  home: Home,
  briefcase: Briefcase,
  'graduation-cap': GraduationCap,
  users: Users,
  heart: Heart,
  stethoscope: Stethoscope,
  landmark: Landmark,
  headphones: Headphones,
  ticket: Ticket,
  'file-text': FileText,
  car: Car,
};

const L: Record<'tr' | 'en', Record<string, string>> = {
  tr: {
    title: 'Diyalog Pratiği',
    subtitle: 'Bir kategori seç, sonra bir senaryo seç.',
    error: 'Bir şeyler ters gitti.',
    finishBtn: 'Bitir',
    newSessionBtn: 'Başka Senaryo',
    xpEarnedTpl: '+{xp} XP kazandın!',
    xpNoneMsg: 'Oturum bitti.',
    home: 'Ana Menü',
  },
  en: {
    title: 'Roleplay Practice',
    subtitle: 'Pick a category, then a scenario.',
    error: 'Something went wrong.',
    finishBtn: 'Finish',
    newSessionBtn: 'Another Scenario',
    xpEarnedTpl: '+{xp} XP earned!',
    xpNoneMsg: 'Session ended.',
    home: 'Home',
  },
};

type Stage = 'categories' | 'pick' | 'chat' | 'finished';
type ChatLine = { who: 'bot' | 'user'; text: string; quality?: 'good' | 'ok' | 'poor' };

export default function RoleplayScreen() {
  const c = useThemeColors();
  const { locale } = useLocale();
  const t = L[locale === 'tr' ? 'tr' : 'en'];

  const { data: categories } = useQuery({
    queryKey: ['roleplay-categories'],
    queryFn: roleplayApi.listCategories,
  });

  const [stage, setStage] = useState<Stage>('categories');
  const [selectedCategory, setSelectedCategory] = useState<RoleplayCategory | null>(null);
  const [error, setError] = useState('');
  const [starting, setStarting] = useState<string | null>(null);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [lines, setLines] = useState<ChatLine[]>([]);
  const [options, setOptions] = useState<RoleplayOption[]>([]);
  const [choosing, setChoosing] = useState<string | null>(null);
  const [finishing, setFinishing] = useState(false);
  const [xpAwarded, setXpAwarded] = useState<number | null>(null);

  const handlePickCategory = (cat: RoleplayCategory) => {
    setSelectedCategory(cat);
    setStage('pick');
  };

  const handleStart = async (slug: string) => {
    setStarting(slug);
    setError('');
    try {
      const session = await roleplayApi.startSession(slug);
      setSessionId(session.id);
      setLines([{ who: 'bot', text: session.bot_line }]);
      setOptions(session.options);
      setStage('chat');
    } catch {
      setError(t.error);
    } finally {
      setStarting(null);
    }
  };

  const handleChoose = async (option: RoleplayOption) => {
    if (!sessionId || choosing) return;
    setChoosing(option.id);
    setError('');
    setOptions([]);
    setLines((prev) => [...prev, { who: 'user', text: option.text }]);
    try {
      const res = await roleplayApi.chooseOption(sessionId, option.id);
      setLines((prev) => [...prev, { who: 'bot', text: res.reaction, quality: res.quality }]);
      if (res.status === 'completed') {
        setXpAwarded(res.xp_awarded);
        setTimeout(() => setStage('finished'), 700);
      } else if (res.next_bot_line) {
        setLines((prev) => [...prev, { who: 'bot', text: res.next_bot_line as string }]);
        setOptions(res.options || []);
      }
    } catch {
      setError(t.error);
    } finally {
      setChoosing(null);
    }
  };

  const handleFinishEarly = async () => {
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
    setLines([]);
    setOptions([]);
    setXpAwarded(null);
    setSelectedCategory(null);
    setStage('categories');
  };

  const qualityIcon = (q?: 'good' | 'ok' | 'poor') => {
    if (q === 'good') return <Check color={c.success} size={14} />;
    if (q === 'poor') return <X color={c.danger} size={14} />;
    if (q === 'ok') return <Minus color="#D97706" size={14} />;
    return null;
  };

  const headerTitle =
    stage === 'pick' && selectedCategory
      ? locale === 'tr'
        ? selectedCategory.title_tr
        : selectedCategory.title_en
      : t.title;

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: c.background }]} edges={['top']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={[styles.header, { borderBottomColor: c.border }]}>
          <Pressable
            onPress={() => (stage === 'pick' ? setStage('categories') : router.back())}
            hitSlop={10}
          >
            <ArrowLeft color={c.textMuted} size={20} />
          </Pressable>
          <Text style={{ color: c.text, fontSize: 15, fontWeight: '700', flex: 1 }}>{headerTitle}</Text>
          {stage === 'chat' && (
            <Pressable
              onPress={handleFinishEarly}
              disabled={finishing}
              hitSlop={10}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
            >
              {finishing ? (
                <ActivityIndicator size="small" color={c.textMuted} />
              ) : (
                <Flag color={c.textMuted} size={16} />
              )}
              <Text style={{ color: c.textMuted, fontSize: 12, fontWeight: '600' }}>{t.finishBtn}</Text>
            </Pressable>
          )}
          <Pressable onPress={() => router.replace('/(app)/dashboard')} hitSlop={10}>
            <Home color={c.textMuted} size={20} />
          </Pressable>
        </View>

        {!!error && (
          <Text style={{ color: c.danger, fontSize: 12, textAlign: 'center', marginTop: spacing.sm }}>
            {error}
          </Text>
        )}

        {stage === 'categories' && (
          <FlatList
            data={categories ?? []}
            keyExtractor={(item) => item.slug}
            numColumns={2}
            contentContainerStyle={{ padding: spacing.md, gap: spacing.sm }}
            columnWrapperStyle={{ gap: spacing.sm }}
            ListHeaderComponent={
              <Text style={{ color: c.textMuted, fontSize: 13, marginBottom: spacing.sm }}>{t.subtitle}</Text>
            }
            renderItem={({ item }) => {
              const Icon = ICONS[item.icon] || MessagesSquare;
              return (
                <Pressable
                  onPress={() => handlePickCategory(item)}
                  style={[styles.categoryCard, { backgroundColor: c.surface, borderColor: c.border }]}
                >
                  <View style={[styles.scenarioIcon, { backgroundColor: c.primarySoft }]}>
                    <Icon color={c.primary} size={18} />
                  </View>
                  <Text style={{ color: c.text, fontSize: 13, fontWeight: '600' }}>
                    {locale === 'tr' ? item.title_tr : item.title_en}
                  </Text>
                  <Text style={{ color: c.textMuted, fontSize: 11 }}>{item.scenarios.length}</Text>
                </Pressable>
              );
            }}
          />
        )}

        {stage === 'pick' && selectedCategory && (
          <View style={{ flex: 1, padding: spacing.md, gap: spacing.sm }}>
            {selectedCategory.scenarios.map((s) => (
              <Pressable
                key={s.slug}
                onPress={() => handleStart(s.slug)}
                disabled={!!starting}
                style={[
                  styles.scenarioRow,
                  { backgroundColor: c.surface, borderColor: c.border, opacity: starting ? 0.7 : 1 },
                ]}
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
            <ScrollView
              style={styles.flex}
              contentContainerStyle={{ padding: spacing.md, gap: 6 }}
              onContentSizeChange={() => {}}
            >
              {lines.map((line, i) => (
                <View
                  key={i}
                  style={{
                    flexDirection: line.who === 'user' ? 'row-reverse' : 'row',
                    alignItems: 'center',
                    gap: 4,
                    justifyContent: line.who === 'user' ? 'flex-end' : 'flex-start',
                  }}
                >
                  {qualityIcon(line.quality)}
                  <View
                    style={[
                      styles.bubble,
                      line.who === 'user'
                        ? { backgroundColor: c.primary, borderBottomRightRadius: 4 }
                        : { backgroundColor: c.surface, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: c.border },
                    ]}
                  >
                    <Text style={{ color: line.who === 'user' ? '#fff' : c.text, fontSize: 14 }}>{line.text}</Text>
                  </View>
                </View>
              ))}
              {!!choosing && (
                <View style={{ flexDirection: 'row' }}>
                  <View style={[styles.bubble, { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border }]}>
                    <ActivityIndicator size="small" color={c.textMuted} />
                  </View>
                </View>
              )}
            </ScrollView>

            {options.length > 0 && (
              <View style={{ padding: spacing.md, gap: spacing.sm }}>
                {options.map((opt) => (
                  <Pressable
                    key={opt.id}
                    onPress={() => handleChoose(opt)}
                    disabled={!!choosing}
                    style={[
                      styles.optionBtn,
                      { backgroundColor: c.surface, borderColor: c.border, opacity: choosing ? 0.6 : 1 },
                    ]}
                  >
                    <Text style={{ color: c.text, fontSize: 14, fontWeight: '600' }}>{opt.text}</Text>
                  </Pressable>
                ))}
              </View>
            )}
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
  categoryCard: { flex: 1, gap: 6, borderRadius: radius.lg, borderWidth: 1, padding: spacing.md },
  scenarioRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 4, borderRadius: radius.lg, borderWidth: 1, padding: spacing.md },
  scenarioIcon: { width: 36, height: 36, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  bubble: { maxWidth: '78%', borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  optionBtn: { borderRadius: radius.lg, borderWidth: 1, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2 },
  finishIcon: { width: 56, height: 56, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  newBtn: { borderRadius: radius.lg, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm + 4 },
});
