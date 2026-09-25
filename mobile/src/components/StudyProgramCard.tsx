// src/components/StudyProgramCard.tsx
//
// Adaptif Öğrenme Motoru Madde 2 (24 Eylül 2026) — "Bu Haftanın Programı"
// dashboard kartı. Veri: GET /study-program/current (bkz.
// backend/app/services/study_program_service.py). Program haftada bir kez
// (Pazartesi) güncel performansa göre yeniden üretilir; ilerleme her
// yüklemede canlı hesaplanır. available=false ise (öğrenilen dilde soru
// içeriği yok) kart hiç gösterilmez — dashboard.tsx bunu kontrol eder.
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import type { Locale } from '@/i18n/locales';
import type { StudyProgram, StudyProgramTopic } from '@/api/types';
import { useThemeColors } from '@/hooks/useThemeColors';
import { radius, spacing } from '@/constants/theme';
import { Card } from '@/components/ui/Card';

type ThemeColors = ReturnType<typeof useThemeColors>;

export type Strings = {
  title: string;
  subtitle: string;
  levelTpl: string;
  wordsTitle: string;
  wordsTpl: string;
  reviewsTpl: string;
  wordsCta: string;
  topicsTitle: string;
  topicsCta: string;
  weak: string;
  next: string;
  progressTpl: string;
  done: string;
  review: string;
  practice: string;
  quizTitle: string;
  quizLocked: string;
  quizTpl: string;
  quizDone: string;
  quizCta: string;
};

export const STRINGS: Partial<Record<Locale, Strings>> = {
  tr: {
    title: 'Bu Haftanın Programı',
    subtitle: 'Performansına göre her Pazartesi yenilenir',
    levelTpl: 'Seviye {level}',
    wordsTitle: 'Bugünün kelime hedefi',
    wordsTpl: '{done}/{goal} yeni kelime',
    reviewsTpl: '{n} tekrar bekliyor',
    wordsCta: 'Çalış',
    topicsTitle: 'Odak konular',
    topicsCta: 'Tümünü görmek için dokun',
    weak: 'Zayıf konu',
    next: 'Sıradaki konu',
    progressTpl: '{done}/{target} soru',
    done: 'Tamamlandı',
    review: 'İncele',
    practice: 'Pratik Yap',
    quizTitle: 'Hafta sonu quizi',
    quizLocked: 'Cumartesi açılır — odak konulardan karışık 10 soru',
    quizTpl: '{done}/{target} soru cevaplandı',
    quizDone: 'Bu haftanın quizi tamamlandı',
    quizCta: 'Başla',
  },
  en: {
    title: "This Week's Plan",
    subtitle: 'Refreshed every Monday based on your performance',
    levelTpl: 'Level {level}',
    wordsTitle: "Today's word goal",
    wordsTpl: '{done}/{goal} new words',
    reviewsTpl: '{n} reviews due',
    wordsCta: 'Study',
    topicsTitle: 'Focus topics',
    topicsCta: 'Tap to see all',
    weak: 'Weak topic',
    next: 'Next topic',
    progressTpl: '{done}/{target} questions',
    done: 'Done',
    review: 'Review',
    practice: 'Practice',
    quizTitle: 'Weekend quiz',
    quizLocked: 'Unlocks on Saturday — 10 mixed questions from your focus topics',
    quizTpl: '{done}/{target} questions answered',
    quizDone: "This week's quiz is done",
    quizCta: 'Start',
  },
};

export function fill(tpl: string, vars: Record<string, string | number>): string {
  return Object.entries(vars).reduce((acc, [k, v]) => acc.replace(`{${k}}`, String(v)), tpl);
}

export function Bar({ value, max, color, c }: { value: number; max: number; color: string; c: ThemeColors }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <View style={{ height: 6, width: '100%', borderRadius: 999, backgroundColor: c.border, overflow: 'hidden' }}>
      <View style={{ height: '100%', width: `${pct}%`, borderRadius: 999, backgroundColor: color }} />
    </View>
  );
}

export function TopicRow({ topic, s, c }: { topic: StudyProgramTopic; s: Strings; c: ThemeColors }) {
  return (
    <View style={[styles.topicRow, { borderColor: c.border }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: c.text }} numberOfLines={1}>
            {topic.title}
          </Text>
          <Text style={{ fontSize: 12, marginTop: 2, color: topic.reason === 'weak' ? c.danger : c.textMuted }}>
            {topic.reason === 'weak' ? s.weak : s.next}
            <Text style={{ color: c.textMuted }}>
              {' · '}
              {topic.done
                ? s.done
                : fill(s.progressTpl, { done: Math.min(topic.practiced_count, topic.target_count), target: topic.target_count })}
            </Text>
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: spacing.xs }}>
          {topic.grammar_slug && (
            <Pressable
              onPress={() => router.push({ pathname: '/(app)/exam-grammar-detail', params: { slug: topic.grammar_slug! } })}
              style={[styles.pillBtn, { borderColor: c.primary }]}
            >
              <Text style={{ color: c.primary, fontSize: 12, fontWeight: '700' }}>{s.review}</Text>
            </Pressable>
          )}
          <Pressable
            onPress={() => router.push({ pathname: '/(app)/exam-topic-practice', params: { topic_tag: topic.topic_tag } })}
            style={[styles.pillBtn, { borderColor: c.warning }]}
          >
            <Text style={{ color: c.warning, fontSize: 12, fontWeight: '700' }}>{s.practice}</Text>
          </Pressable>
        </View>
      </View>
      <View style={{ marginTop: spacing.xs }}>
        <Bar value={topic.practiced_count} max={topic.target_count} color={topic.done ? c.success : c.warning} c={c} />
      </View>
    </View>
  );
}

export function StudyProgramCard({ program, locale }: { program: StudyProgram; locale: Locale }) {
  const c = useThemeColors();
  const s = STRINGS[locale] ?? STRINGS.tr!;
  if (!program.available || program.focus_topics.length === 0) return null;
  const today = program.today;
  const quiz = program.weekend_quiz;

  return (
    <Card style={{ marginTop: spacing.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: c.text }}>{s.title}</Text>
          <Text style={{ fontSize: 12, color: c.textMuted, marginTop: 2 }}>{s.subtitle}</Text>
        </View>
        {!!program.level && (
          <View style={[styles.levelBadge, { backgroundColor: c.accentSoft }]}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: c.primary }}>
              {fill(s.levelTpl, { level: program.level.toUpperCase() })}
            </Text>
          </View>
        )}
      </View>

      {!!today && (
        <View style={[styles.topicRow, { borderColor: c.border, marginTop: spacing.sm }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: c.textMuted }}>{s.wordsTitle}</Text>
              <Text style={{ fontSize: 14, fontWeight: '600', color: c.text, marginTop: 2 }}>
                {fill(s.wordsTpl, { done: today.new_words_today, goal: today.new_word_goal })}
                {today.reviews_due > 0 && (
                  <Text style={{ fontSize: 12, fontWeight: '400', color: c.textMuted }}>
                    {' · '}
                    {fill(s.reviewsTpl, { n: today.reviews_due })}
                  </Text>
                )}
              </Text>
            </View>
            <Pressable onPress={() => router.push('/(app)/game')} style={[styles.pillBtn, { borderColor: c.primary }]}>
              <Text style={{ color: c.primary, fontSize: 12, fontWeight: '700' }}>{s.wordsCta}</Text>
            </Pressable>
          </View>
          <View style={{ marginTop: spacing.xs }}>
            <Bar value={today.new_words_today} max={today.new_word_goal} color={c.primary} c={c} />
          </View>
        </View>
      )}

      {/* Odak konular — kullanıcı isteği (25 Eylül 2026): "Odak konular
          bölümü ekranda çok yer kaplıyor, orası küçük bir alan olsun,
          oraya tıklayınca ek bir sayfa açılsın, onun içinde sıralansın
          konular." Tam liste artık study-focus-topics.tsx'te (bkz.
          app/(app)/study-focus-topics.tsx); burada sadece ilk konunun
          önizlemesiyle küçük, tıklanabilir bir özet var. */}
      <Pressable
        onPress={() => router.push('/(app)/study-focus-topics')}
        style={({ pressed }) => [styles.topicsSummaryRow, { borderColor: c.border, opacity: pressed ? 0.85 : 1 }]}
      >
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: c.textMuted }}>
            {s.topicsTitle} · {program.completed_topics}/{program.focus_topics.length}
          </Text>
          <Text style={{ fontSize: 14, fontWeight: '600', color: c.text, marginTop: 2 }} numberOfLines={1}>
            {program.focus_topics[0]?.title}
            {program.focus_topics.length > 1 ? `  +${program.focus_topics.length - 1}` : ''}
          </Text>
        </View>
        <ChevronRight color={c.textMuted} size={18} />
      </Pressable>

      {!!quiz && (
        <View style={[styles.quizRow, { borderColor: c.border }]}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: c.text }}>{s.quizTitle}</Text>
            <Text style={{ fontSize: 12, color: c.textMuted, marginTop: 2 }}>
              {!quiz.available ? s.quizLocked : quiz.done ? s.quizDone : fill(s.quizTpl, { done: quiz.answered_count, target: quiz.target_count })}
            </Text>
          </View>
          {quiz.available && !quiz.done && (
            <Pressable
              onPress={() => router.push({ pathname: '/(app)/exam-topic-practice', params: { topic_tag: 'weekly-quiz' } })}
              style={[styles.quizCta, { backgroundColor: c.primary }]}
            >
              <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>{s.quizCta}</Text>
            </Pressable>
          )}
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  topicsSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginTop: spacing.sm,
  },
  topicRow: { borderWidth: 1, borderRadius: radius.md, padding: spacing.sm },
  pillBtn: { borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 6 },
  levelBadge: { borderRadius: 999, paddingHorizontal: spacing.sm, paddingVertical: 4 },
  quizRow: {
    marginTop: spacing.sm,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: radius.md,
    padding: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  quizCta: { borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: 8 },
});
