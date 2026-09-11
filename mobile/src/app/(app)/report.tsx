// src/app/(app)/report.tsx — "Raporum" (Kullanıcı Raporu) ekranı.
// web'deki app/(app)/report/page.tsx ile aynı davranış: dönemsel (bu
// hafta/ay) tüm ilerleme özetini bir önceki eşit uzunluktaki döneme
// kıyasla % değişimiyle gösterir (backend: GET /stats/report). duels.tsx/
// rewards.tsx ile aynı desen: kendi geri butonu, tab çubuğunda GÖRÜNMÜYOR
// (bkz. _layout.tsx href:null kaydı). dashboard.tsx'teki "Faz 3" kısayol
// grid'inden açılıyor.
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft, Clock, Flame, BookOpen, Gamepad2, Target, Map, Award, Trophy,
  Sparkles, ArrowUp, ArrowDown, Minus,
} from 'lucide-react-native';
import { statsApi } from '@/api/stats';
import type { UserReport } from '@/api/types';
import { REPORT_STRINGS } from '@/i18n/reportStrings';
import { useLocale } from '@/i18n';
import { useThemeColors } from '@/hooks/useThemeColors';
import { radius, spacing } from '@/constants/theme';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Card } from '@/components/ui/Card';

type Period = 'week' | 'month';

function ChangeBadge({
  pct, previous, newLabel, colors,
}: { pct: number | null; previous: number; newLabel: string; colors: ReturnType<typeof useThemeColors> }) {
  if (previous === 0) {
    if (pct === null) return null;
    return (
      <View style={styles.changeRow}>
        <Sparkles color={colors.primary} size={11} />
        <Text style={[styles.changeText, { color: colors.primary }]}>{newLabel}</Text>
      </View>
    );
  }
  if (pct === null) return null;
  if (pct === 0) {
    return (
      <View style={styles.changeRow}>
        <Minus color={colors.textMuted} size={11} />
        <Text style={[styles.changeText, { color: colors.textMuted }]}>0%</Text>
      </View>
    );
  }
  const up = pct > 0;
  const color = up ? colors.success : colors.danger;
  return (
    <View style={styles.changeRow}>
      {up ? <ArrowUp color={color} size={11} /> : <ArrowDown color={color} size={11} />}
      <Text style={[styles.changeText, { color }]}>{up ? '+' : ''}{pct}%</Text>
    </View>
  );
}

function StatBlock({
  label, value, unit, pct, previous, newLabel, colors,
}: {
  label: string; value: number | string; unit?: string;
  pct?: number | null; previous?: number; newLabel?: string;
  colors: ReturnType<typeof useThemeColors>;
}) {
  return (
    <View style={styles.statBlock}>
      <Text style={[styles.statLabel, { color: colors.textMuted }]}>{label}</Text>
      <View style={styles.statValueRow}>
        <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
        {unit && <Text style={[styles.statUnit, { color: colors.textMuted }]}>{unit}</Text>}
      </View>
      {pct !== undefined && previous !== undefined && newLabel !== undefined && (
        <ChangeBadge pct={pct} previous={previous} newLabel={newLabel} colors={colors} />
      )}
    </View>
  );
}

function SectionCard({
  icon, title, colors, children,
}: { icon: React.ReactNode; title: string; colors: ReturnType<typeof useThemeColors>; children: React.ReactNode }) {
  return (
    <Card style={{ marginBottom: spacing.md }}>
      <View style={styles.sectionHeader}>
        {icon}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      </View>
      {children}
    </Card>
  );
}

function topicLabel(tag: string): string {
  return tag.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function ReportScreen() {
  const { locale } = useLocale();
  const c = useThemeColors();
  const t = REPORT_STRINGS[locale] ?? REPORT_STRINGS.tr;
  const [period, setPeriod] = useState<Period>('week');

  const { data, isLoading, isError, refetch } = useQuery<UserReport>({
    queryKey: ['user-report', period],
    queryFn: () => statsApi.getUserReport(period),
  });

  return (
    <ScreenContainer>
      <Pressable onPress={() => router.back()} style={styles.backRow}>
        <ArrowLeft color={c.textSecondary} size={18} />
        <Text style={{ color: c.textSecondary, marginLeft: spacing.xs, fontSize: 14, fontWeight: '600' }}>
          {locale === 'tr' ? 'Geri' : 'Back'}
        </Text>
      </Pressable>

      <Text style={{ fontSize: 20, fontWeight: '700', color: c.text }}>{t.title}</Text>
      <Text style={{ fontSize: 14, marginTop: spacing.xs, lineHeight: 20, color: c.textSecondary }}>{t.subtitle}</Text>

      <View style={[styles.tabRow, { marginTop: spacing.lg, marginBottom: spacing.md }]}>
        <Pressable
          onPress={() => setPeriod('week')}
          style={[styles.tabBtn, { backgroundColor: period === 'week' ? c.primarySoft : 'transparent' }]}
        >
          <Text style={{ color: period === 'week' ? c.primary : c.textMuted, fontWeight: '600', fontSize: 13 }}>
            {t.weekTab}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setPeriod('month')}
          style={[styles.tabBtn, { backgroundColor: period === 'month' ? c.primarySoft : 'transparent' }]}
        >
          <Text style={{ color: period === 'month' ? c.primary : c.textMuted, fontWeight: '600', fontSize: 13 }}>
            {t.monthTab}
          </Text>
        </Pressable>
      </View>

      {isLoading ? (
        <View style={{ marginTop: spacing.xxl, alignItems: 'center' }}>
          <ActivityIndicator color={c.primary} />
        </View>
      ) : isError || !data ? (
        <Card style={{ alignItems: 'center' }}>
          <Text style={{ color: c.textSecondary, fontSize: 13, marginBottom: spacing.sm }}>{t.error}</Text>
          <Pressable onPress={() => refetch()}>
            <Text style={{ color: c.primary, fontSize: 13, fontWeight: '600' }}>{t.retryBtn}</Text>
          </Pressable>
        </Card>
      ) : (
        <View>
          <SectionCard icon={<Clock color={c.textMuted} size={16} />} title={t.sectionStudy} colors={c}>
            <View style={styles.statRow}>
              <StatBlock
                label={t.minutesLabel} value={data.study.minutes_current}
                pct={data.study.minutes_change_pct} previous={data.study.minutes_previous} newLabel={t.newLabel} colors={c}
              />
              <StatBlock
                label={t.sessionsLabel} value={data.study.sessions_current}
                pct={data.study.sessions_change_pct} previous={data.study.sessions_previous} newLabel={t.newLabel} colors={c}
              />
            </View>
          </SectionCard>

          <SectionCard icon={<Flame color={c.textMuted} size={16} />} title={t.sectionStreak} colors={c}>
            <View style={styles.statRow}>
              <StatBlock label={t.currentStreakLabel} value={data.streak.current} unit={t.streakUnit} colors={c} />
              <StatBlock label={t.longestStreakLabel} value={data.streak.longest} unit={t.streakUnit} colors={c} />
            </View>
          </SectionCard>

          <SectionCard icon={<BookOpen color={c.textMuted} size={16} />} title={t.sectionVocabulary} colors={c}>
            <View style={styles.statRow}>
              <StatBlock label={t.totalWordsLabel} value={data.vocabulary.total_words} colors={c} />
              <StatBlock
                label={t.learnedWordsLabel}
                value={`${data.vocabulary.learned_words} (${data.vocabulary.learned_pct}%)`}
                colors={c}
              />
              <StatBlock
                label={t.newWordsLabel} value={data.vocabulary.new_words_current}
                pct={data.vocabulary.new_words_change_pct} previous={data.vocabulary.new_words_previous} newLabel={t.newLabel} colors={c}
              />
            </View>
          </SectionCard>

          <SectionCard icon={<Gamepad2 color={c.textMuted} size={16} />} title={t.sectionGames} colors={c}>
            <View style={styles.statRow}>
              <StatBlock
                label={t.gameSessionsLabel} value={data.games.sessions_current}
                pct={data.games.sessions_change_pct} previous={data.games.sessions_previous} newLabel={t.newLabel} colors={c}
              />
              <StatBlock label={t.avgScoreLabel} value={data.games.avg_score_current} colors={c} />
            </View>
          </SectionCard>

          <SectionCard icon={<Target color={c.textMuted} size={16} />} title={t.sectionExam} colors={c}>
            <View style={[styles.statRow, { marginBottom: spacing.sm }]}>
              <StatBlock
                label={t.accuracyLabel}
                value={data.exam.accuracy_current !== null ? `${data.exam.accuracy_current}%` : '—'}
                colors={c}
              />
            </View>
            {data.exam.weak_topics.length === 0 && data.exam.strong_topics.length === 0 ? (
              <Text style={{ color: c.textMuted, fontSize: 12 }}>{t.noTopicDataLabel}</Text>
            ) : (
              <View style={{ gap: spacing.sm }}>
                {data.exam.weak_topics.length > 0 && (
                  <View>
                    <Text style={[styles.subLabel, { color: c.textMuted }]}>{t.weakTopicsLabel}</Text>
                    {data.exam.weak_topics.map((topic) => (
                      <View key={topic.topic_tag} style={styles.topicRow}>
                        <Text style={{ color: c.text, fontSize: 13 }}>{topicLabel(topic.topic_tag)}</Text>
                        <Text style={{ color: c.textMuted, fontSize: 11 }}>
                          {topic.accuracy}% · {topic.attempts} {t.attemptsUnit}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
                {data.exam.strong_topics.length > 0 && (
                  <View>
                    <Text style={[styles.subLabel, { color: c.textMuted }]}>{t.strongTopicsLabel}</Text>
                    {data.exam.strong_topics.map((topic) => (
                      <View key={topic.topic_tag} style={styles.topicRow}>
                        <Text style={{ color: c.text, fontSize: 13 }}>{topicLabel(topic.topic_tag)}</Text>
                        <Text style={{ color: c.textMuted, fontSize: 11 }}>
                          {topic.accuracy}% · {topic.attempts} {t.attemptsUnit}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}
          </SectionCard>

          <SectionCard icon={<Map color={c.textMuted} size={16} />} title={t.sectionQuests} colors={c}>
            <View style={styles.statRow}>
              <StatBlock
                label={t.questsCompletedLabel} value={data.quests.completed_current}
                pct={data.quests.completed_previous > 0
                  ? Math.round(((data.quests.completed_current - data.quests.completed_previous) / data.quests.completed_previous) * 100)
                  : null}
                previous={data.quests.completed_previous}
                newLabel={t.newLabel}
                colors={c}
              />
              <StatBlock label={t.questsProgressLabel} value={`${data.quests.progress_pct}%`} colors={c} />
            </View>
          </SectionCard>

          <SectionCard icon={<Award color={c.textMuted} size={16} />} title={t.sectionBadges} colors={c}>
            <View style={styles.statRow}>
              <StatBlock label={t.badgesTotalLabel} value={data.badges.total_earned} colors={c} />
              <StatBlock label={t.badgesNewLabel} value={data.badges.earned_current} colors={c} />
            </View>
          </SectionCard>

          <SectionCard icon={<Trophy color={c.textMuted} size={16} />} title={t.sectionLeague} colors={c}>
            <View style={[styles.statRow, { marginBottom: spacing.sm }]}>
              <StatBlock label={t.currentTierLabel} value={data.league.current_tier ?? '—'} colors={c} />
            </View>
            {data.league.history.length === 0 ? (
              <Text style={{ color: c.textMuted, fontSize: 12 }}>{t.noLeagueHistoryLabel}</Text>
            ) : (
              <View>
                <Text style={[styles.subLabel, { color: c.textMuted }]}>{t.leagueHistoryLabel}</Text>
                {data.league.history.slice(0, 6).map((h, i) => (
                  <View key={`${h.week_start}-${i}`} style={styles.topicRow}>
                    <Text style={{ color: c.text, fontSize: 13 }}>{h.tier_slug ?? '—'}</Text>
                    <Text style={{ color: c.textMuted, fontSize: 11 }}>
                      {h.outcome === 'promoted' ? t.outcomePromoted
                        : h.outcome === 'demoted' ? t.outcomeDemoted
                        : t.outcomeStayed}
                      {h.final_rank != null ? ` · #${h.final_rank}` : ''}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </SectionCard>

          <SectionCard icon={<Sparkles color={c.textMuted} size={16} />} title={t.sectionSubscription} colors={c}>
            {data.subscription.is_premium ? (
              <View>
                <Text style={{ color: c.amber, fontWeight: '700', fontSize: 14 }}>{t.premiumActiveLabel}</Text>
                {data.subscription.premium_until && (
                  <Text style={{ color: c.textMuted, fontSize: 11, marginTop: 2 }}>
                    {t.premiumUntilTpl.replace('{date}', new Date(data.subscription.premium_until).toLocaleDateString(locale))}
                  </Text>
                )}
              </View>
            ) : (
              <Text style={{ color: c.textSecondary, fontSize: 13 }}>{t.freeLabel}</Text>
            )}
          </SectionCard>
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  backRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  tabRow: { flexDirection: 'row', gap: spacing.sm },
  tabBtn: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: radius.md },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.sm },
  sectionTitle: { fontSize: 13, fontWeight: '700' },
  statRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg },
  statBlock: { minWidth: 90, gap: 2 },
  statLabel: { fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.3 },
  statValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  statValue: { fontSize: 18, fontWeight: '700' },
  statUnit: { fontSize: 11 },
  changeRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 1 },
  changeText: { fontSize: 10, fontWeight: '600' },
  subLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 4 },
  topicRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 3 },
});
