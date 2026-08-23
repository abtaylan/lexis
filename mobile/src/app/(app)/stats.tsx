import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Text, useWindowDimensions, View } from 'react-native';
import { BarChart, LineChart, PieChart } from 'react-native-gifted-charts';
import {
  BookOpen, RefreshCw, Flame, TrendingUp, Gauge, Trophy, Sparkles, CircleCheckBig,
} from 'lucide-react-native';
import { useLocale } from '@/i18n';
import { statsApi } from '@/api/stats';
import type { AnalyticsData } from '@/api/types';
import { useThemeColors } from '@/hooks/useThemeColors';
import { radius, spacing } from '@/constants/theme';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Card } from '@/components/ui/Card';

// ── İstatistik ekranı — web'deki app/(app)/stats/page.tsx'in mobil karşılığı.
// Web Recharts (DOM/SVG) kullanıyor, bu RN'de çalışmıyor — bunun yerine
// react-native-gifted-charts (react-native-svg tabanlı, zaten mobile'da mevcut
// bağımlılık) seçildi: peer dependency'leri esnek (React 19 sorunsuz), gradient
// efektleri react-native-svg'nin kendi <LinearGradient>'ini kullanıyor, bu
// yüzden ekstra bir paket (expo-linear-gradient) gerekmiyor. ──

const TYPE_COLORS = ['#378ADD', '#534AB7', '#3B6D11', '#854F0B', '#0F6E56', '#94a3b8'];

function pad2(n: number) {
  return n < 10 ? `0${n}` : String(n);
}
function shortDate(iso: string) {
  const d = new Date(iso);
  return `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}`;
}

function SectionHeader({ icon, title, sub }: { icon: React.ReactNode; title: string; sub?: string }) {
  const c = useThemeColors();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginBottom: spacing.md }}>
      <View style={{ marginTop: 2 }}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: c.text, fontSize: 14, fontWeight: '700' }}>{title}</Text>
        {sub ? <Text style={{ color: c.textMuted, fontSize: 11, marginTop: 2 }}>{sub}</Text> : null}
      </View>
    </View>
  );
}

function LegendDot({ color, label, value }: { color: string; label: string; value: number }) {
  const c = useThemeColors();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm }}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
      <Text style={{ color: c.textSecondary, fontSize: 12, flex: 1 }}>{label}</Text>
      <Text style={{ color: c.text, fontSize: 12, fontWeight: '700' }}>{value}</Text>
    </View>
  );
}

export default function StatsScreen() {
  const { t } = useLocale();
  const c = useThemeColors();
  const { width } = useWindowDimensions();
  const chartWidth = Math.max(220, width - spacing.lg * 2 - spacing.lg * 2 - 8);

  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    statsApi
      .getAnalytics()
      .then(setData)
      .catch(() => setError(t('statsLoadError')))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <ScreenContainer>
        <View style={{ alignItems: 'center', justifyContent: 'center', paddingTop: spacing.xxl }}>
          <ActivityIndicator color={c.primary} />
          <Text style={{ color: c.textMuted, marginTop: spacing.sm }}>{t('loading')}</Text>
        </View>
      </ScreenContainer>
    );
  }

  if (error) {
    return (
      <ScreenContainer>
        <Card style={{ backgroundColor: c.dangerSoft, borderColor: c.dangerSoft }}>
          <Text style={{ color: c.danger, fontSize: 13 }}>{error}</Text>
        </Card>
      </ScreenContainer>
    );
  }

  if (!data) return null;

  const TYPE_LABEL: Record<string, string> = {
    noun: t('typeNoun'),
    verb: t('typeVerb'),
    adjective: t('typeAdjective'),
    adverb: t('typeAdverb'),
    'phrasal verb': t('typePhrasalVerb'),
    idiom: t('typeIdiom'),
    phrase: t('typePhrase'),
    'diğer': t('typeOther'),
  };
  const tl = (w: string) => TYPE_LABEL[w] ?? (w.charAt(0).toUpperCase() + w.slice(1));

  const totals = data.totals;
  const empty = totals.total === 0;

  if (empty) {
    return (
      <ScreenContainer>
        <Text style={{ color: c.text, fontSize: 20, fontWeight: '700' }}>{t('statsPageTitle')}</Text>
        <Text style={{ color: c.textMuted, fontSize: 12, marginTop: 2, marginBottom: spacing.lg }}>{t('statsPageSubtitle')}</Text>
        <Card style={{ alignItems: 'center', paddingVertical: spacing.xl }}>
          <View style={{ width: 56, height: 56, borderRadius: radius.lg, backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
            <Sparkles color={c.primary} size={26} />
          </View>
          <Text style={{ color: c.text, fontSize: 16, fontWeight: '700', marginTop: spacing.md }}>{t('noDataYet')}</Text>
          <Text style={{ color: c.textMuted, fontSize: 13, marginTop: 4, textAlign: 'center' }}>{t('noDataYetSub')}</Text>
        </Card>
      </ScreenContainer>
    );
  }

  const statusData = [
    { name: t('learnedLabel'), value: totals.learned, color: c.success },
    { name: t('learningLabel'), value: totals.learning, color: c.warning },
    { name: t('statusArchived'), value: totals.archived, color: c.textMuted },
  ].filter((d) => d.value > 0);

  const typeData = data.type_breakdown.map((d, i) => ({
    name: tl(d.word_type),
    total: d.total,
    rate: d.learn_rate,
    avgRep: d.avg_repetition,
    color: TYPE_COLORS[i % TYPE_COLORS.length],
  }));

  const trendData = data.daily_added.map((d, i, arr) => ({
    value: d.added,
    label: i % 5 === 0 || i === arr.length - 1 ? shortDate(d.date) : '',
  }));

  const progressSlice = data.daily_progress.slice(-21);
  const maxStreak = Math.max(0, ...data.daily_progress.map((d) => d.streak_day));
  const learnRate = totals.total > 0 ? Math.round((totals.learned / totals.total) * 100) : 0;

  const summary = [
    { label: t('totalWords'), value: String(totals.total), bg: c.primarySoft, fg: c.primary, icon: <BookOpen color={c.primary} size={18} /> },
    { label: t('learnedLabel'), value: String(totals.learned), bg: c.successSoft, fg: c.success, icon: <CircleCheckBig color={c.success} size={18} /> },
    { label: t('learningLabel'), value: String(totals.learning), bg: c.warningSoft, fg: c.warning, icon: <RefreshCw color={c.warning} size={18} /> },
    { label: t('longestStreak'), value: t('streakDaysAbbrTpl', { n: String(maxStreak) }), bg: c.dangerSoft, fg: c.danger, icon: <Flame color={c.danger} size={18} /> },
  ];

  return (
    <ScreenContainer>
      <Text style={{ color: c.text, fontSize: 20, fontWeight: '700' }}>{t('statsPageTitle')}</Text>
      <Text style={{ color: c.textMuted, fontSize: 12, marginTop: 2, marginBottom: spacing.lg }}>{t('statsPageSubtitle')}</Text>

      {/* Özet kartlar */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg }}>
        {summary.map((s) => (
          <Card key={s.label} style={{ flexBasis: '47%', flexGrow: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md }}>
            <View style={{ width: 36, height: 36, borderRadius: radius.md, backgroundColor: s.bg, alignItems: 'center', justifyContent: 'center' }}>
              {s.icon}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: c.text, fontSize: 18, fontWeight: '700' }}>{s.value}</Text>
              <Text style={{ color: c.textMuted, fontSize: 11 }}>{s.label}</Text>
            </View>
          </Card>
        ))}
      </View>

      {/* Durum dağılımı */}
      <Card style={{ marginBottom: spacing.lg }}>
        <SectionHeader icon={<Gauge color={c.textMuted} size={16} />} title={t('statusDistribution')} sub={t('statusDistributionSub')} />
        <View style={{ alignItems: 'center' }}>
          <PieChart
            data={statusData.map((d) => ({ value: d.value, color: d.color }))}
            donut
            radius={80}
            innerRadius={55}
            centerLabelComponent={() => (
              <View style={{ alignItems: 'center' }}>
                <Text style={{ color: c.success, fontSize: 22, fontWeight: '700' }}>{learnRate}%</Text>
                <Text style={{ color: c.textMuted, fontSize: 9 }}>{t('learnedPercentLabel')}</Text>
              </View>
            )}
          />
        </View>
        <View style={{ marginTop: spacing.md }}>
          {statusData.map((d) => (
            <LegendDot key={d.name} color={d.color} label={d.name} value={d.value} />
          ))}
        </View>
      </Card>

      {typeData.length > 0 && (
        <>
          {/* Kelime türüne göre öğrenme oranı */}
          <Card style={{ marginBottom: spacing.lg }}>
            <SectionHeader icon={<Trophy color={c.textMuted} size={16} />} title={t('typeByLearnRate')} sub={t('typeByLearnRateSub')} />
            <BarChart
              data={typeData.map((d) => ({ value: d.rate, label: d.name, frontColor: d.color }))}
              width={chartWidth}
              height={180}
              barWidth={Math.max(20, Math.min(36, chartWidth / (typeData.length * 2)))}
              spacing={Math.max(16, chartWidth / (typeData.length * 3))}
              maxValue={100}
              noOfSections={4}
              roundedTop
              yAxisThickness={0}
              xAxisThickness={1}
              xAxisColor={c.border}
              rulesColor={c.border}
              yAxisTextStyle={{ color: c.textMuted, fontSize: 10 }}
              xAxisLabelTextStyle={{ color: c.textMuted, fontSize: 9 }}
              yAxisLabelSuffix="%"
              isAnimated
            />
          </Card>

          {/* Tür dağılımı */}
          <Card style={{ marginBottom: spacing.lg }}>
            <SectionHeader icon={<BookOpen color={c.textMuted} size={16} />} title={t('typeDistribution')} sub={t('typeDistributionSub')} />
            <BarChart
              data={typeData.map((d) => ({ value: d.total, label: d.name, frontColor: d.color }))}
              horizontal
              width={chartWidth}
              height={Math.max(140, typeData.length * 34)}
              barWidth={16}
              spacing={22}
              roundedTop
              yAxisThickness={0}
              xAxisThickness={1}
              xAxisColor={c.border}
              rulesColor={c.border}
              yAxisTextStyle={{ color: c.textMuted, fontSize: 10 }}
              xAxisLabelTextStyle={{ color: c.textMuted, fontSize: 10 }}
              isAnimated
            />
          </Card>

          {/* Öğrenme hızı (ort. tekrar) */}
          <Card style={{ marginBottom: spacing.lg }}>
            <SectionHeader icon={<Gauge color={c.textMuted} size={16} />} title={t('learningSpeed')} sub={t('learningSpeedSub')} />
            <BarChart
              data={typeData.map((d) => ({ value: d.avgRep, label: d.name }))}
              frontColor={c.accent}
              width={chartWidth}
              height={180}
              barWidth={Math.max(20, Math.min(36, chartWidth / (typeData.length * 2)))}
              spacing={Math.max(16, chartWidth / (typeData.length * 3))}
              roundedTop
              yAxisThickness={0}
              xAxisThickness={1}
              xAxisColor={c.border}
              rulesColor={c.border}
              yAxisTextStyle={{ color: c.textMuted, fontSize: 10 }}
              xAxisLabelTextStyle={{ color: c.textMuted, fontSize: 9 }}
              isAnimated
            />
          </Card>
        </>
      )}

      {/* Son 30 gün eklenen trendi */}
      {trendData.length > 0 && (
        <Card style={{ marginBottom: spacing.lg }}>
          <SectionHeader icon={<TrendingUp color={c.textMuted} size={16} />} title={t('last30DaysTitle')} sub={t('last30DaysSub')} />
          <LineChart
            data={trendData}
            width={chartWidth}
            height={180}
            areaChart
            curved
            color={c.primary}
            startFillColor={c.primary}
            endFillColor={c.primary}
            startOpacity={0.35}
            endOpacity={0.02}
            thickness={2}
            hideDataPoints
            yAxisThickness={0}
            xAxisThickness={1}
            xAxisColor={c.border}
            rulesColor={c.border}
            yAxisTextStyle={{ color: c.textMuted, fontSize: 10 }}
            xAxisLabelTextStyle={{ color: c.textMuted, fontSize: 8 }}
            spacing={26}
            initialSpacing={8}
            noOfSections={4}
            scrollToEnd
            isAnimated
          />
        </Card>
      )}

      {/* Günlük tekrar aktivitesi */}
      {progressSlice.length > 0 && (
        <Card style={{ marginBottom: spacing.lg }}>
          <SectionHeader icon={<RefreshCw color={c.textMuted} size={16} />} title={t('studyActivity')} sub={t('studyActivitySub')} />
          <View style={{ flexDirection: 'row', gap: spacing.md, marginBottom: spacing.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.primary }} />
              <Text style={{ color: c.textMuted, fontSize: 11 }}>{t('addedLegend')}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.success }} />
              <Text style={{ color: c.textMuted, fontSize: 11 }}>{t('repeatLegend')}</Text>
            </View>
          </View>
          <BarChart
            stackData={progressSlice.map((d, i, arr) => ({
              label: i % 3 === 0 || i === arr.length - 1 ? shortDate(d.date) : '',
              stacks: [
                { value: d.words_added, color: c.primary },
                { value: d.words_reviewed, color: c.success },
              ],
            }))}
            width={chartWidth}
            height={180}
            barWidth={14}
            spacing={18}
            initialSpacing={8}
            yAxisThickness={0}
            xAxisThickness={1}
            xAxisColor={c.border}
            rulesColor={c.border}
            yAxisTextStyle={{ color: c.textMuted, fontSize: 10 }}
            xAxisLabelTextStyle={{ color: c.textMuted, fontSize: 8 }}
            isAnimated
          />
        </Card>
      )}
    </ScreenContainer>
  );
}
