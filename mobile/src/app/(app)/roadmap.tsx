// src/app/(app)/roadmap.tsx — Canlı "Program Haritası" (15 Ekim 2026 kullanıcı
// isteği): "uygulama içinde tüm 20 haftayı kaydırarak gezebileceğin canlı bir
// ekran olması gerekiyor... bundan dolayı canlı ortamda 20 haftayı da
// görmeliyim." Web'deki app/(app)/roadmap/page.tsx ile aynı veriyi
// (GET /schedule/roadmap) kullanan mobil karşılığı — tek fark burada kendi
// ScrollView'imizi ref ile yönetiyoruz ki güncel hafta otomatik olarak
// kaydırılıp açılabilsin (ScreenContainer'ın kendi ScrollView'i ref vermiyor,
// bkz. schedule.tsx'teki "scroll={false}" deseni).
import React, { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  MapPin, ChevronDown, ChevronUp, Calendar, Clock, ExternalLink, Route as RouteIcon, AlertTriangle, RotateCw,
} from 'lucide-react-native';
import { scheduleApi } from '@/api/schedule';
import type { RoadmapWeek, ScheduleTemplateItem } from '@/api/types';
import { useThemeColors } from '@/hooks/useThemeColors';
import { radius, spacing } from '@/constants/theme';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { ScreenNavBar } from '@/components/ui/ScreenNavBar';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { getErrorMessage } from '@/utils/errors';

const PHASE_COLORS: Record<string, { soft: string; strong: string }> = {
  'Faz 1': { soft: '#E6F1FB', strong: '#185FA5' },
  'Faz 2': { soft: '#EEEDFE', strong: '#534AB7' },
  'Faz 3': { soft: '#FDEEEA', strong: '#9A3412' },
};

const LEVEL_LABELS: Record<string, string> = { a2: 'A2', b1: 'B1', b2: 'B2', c1: 'C1' };

const DAY_OFFSET_FROM_MONDAY: Record<number, number> = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 0: 6 };
const WEEKDAY_LABELS = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

function dateForDay(startDateIso: string, dayOfWeek: number): string {
  const start = new Date(startDateIso + 'T00:00:00');
  start.setDate(start.getDate() + (DAY_OFFSET_FROM_MONDAY[dayOfWeek] ?? 0));
  return start.toISOString().slice(0, 10);
}

function fmtDate(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
}

function fmtRange(start: string, end: string): string {
  const s = new Date(start + 'T00:00:00');
  const e = new Date(end + 'T00:00:00');
  if (s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()) {
    return `${s.getDate()}-${e.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}`;
  }
  return `${s.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })} - ${e.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}`;
}

function groupByDay(items: ScheduleTemplateItem[], startDate: string) {
  const byDay: Record<number, ScheduleTemplateItem[]> = {};
  for (const it of items) (byDay[it.day_of_week] ??= []).push(it);
  const order = [1, 2, 3, 4, 5, 6, 0];
  return order
    .map((d) => ({ day: d, date: dateForDay(startDate, d), items: (byDay[d] ?? []).sort((a, b) => a.time_slot.localeCompare(b.time_slot)) }))
    .filter((g) => g.items.length > 0);
}

function WeekCard({
  week,
  isCurrent,
  expanded,
  onToggle,
  todayIso,
  onLayoutY,
}: {
  week: RoadmapWeek;
  isCurrent: boolean;
  expanded: boolean;
  onToggle: () => void;
  todayIso: string;
  onLayoutY?: (y: number) => void;
}) {
  const c = useThemeColors();
  const colors = PHASE_COLORS[week.phase_label] ?? PHASE_COLORS['Faz 1'];
  const grouped = groupByDay(week.schedule_items, week.start_date);

  return (
    <View onLayout={onLayoutY ? (e) => onLayoutY(e.nativeEvent.layout.y) : undefined}>
      <Card
        style={{
          marginBottom: spacing.sm,
          borderColor: isCurrent ? c.primary : c.border,
          borderWidth: isCurrent ? 2 : 1,
          padding: 0,
          overflow: 'hidden',
        }}
      >
        <Pressable onPress={onToggle} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md, gap: spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 }}>
            <View style={{ width: 36, height: 36, borderRadius: radius.md, backgroundColor: colors.soft, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: colors.strong, fontWeight: '700', fontSize: 13 }}>{week.week_number}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <View style={{ backgroundColor: colors.soft, borderRadius: radius.full, paddingHorizontal: 8, paddingVertical: 2 }}>
                  <Text style={{ color: colors.strong, fontWeight: '700', fontSize: 10 }}>{week.phase_label}</Text>
                </View>
                {isCurrent && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#E1F5EE', borderRadius: radius.full, paddingHorizontal: 8, paddingVertical: 2 }}>
                    <MapPin color="#0F6E56" size={10} />
                    <Text style={{ color: '#0F6E56', fontWeight: '700', fontSize: 10 }}>Şu Anki Hafta</Text>
                  </View>
                )}
                {week.level && (
                  <View style={{ backgroundColor: c.background, borderRadius: radius.full, paddingHorizontal: 8, paddingVertical: 2 }}>
                    <Text style={{ color: c.textMuted, fontWeight: '600', fontSize: 10 }}>{LEVEL_LABELS[week.level] ?? week.level.toUpperCase()}</Text>
                  </View>
                )}
              </View>
              <Text style={{ color: c.text, fontWeight: '700', fontSize: 13, marginTop: 4 }} numberOfLines={2}>
                {week.topic_title_tr ?? week.focus_note ?? `Hafta ${week.week_number}`}
              </Text>
              <Text style={{ color: c.textMuted, fontSize: 11, marginTop: 2 }}>{fmtRange(week.start_date, week.end_date)}</Text>
            </View>
          </View>
          {expanded ? <ChevronUp color={c.textMuted} size={16} /> : <ChevronDown color={c.textMuted} size={16} />}
        </Pressable>

        {expanded && (
          <View style={{ borderTopWidth: 1, borderTopColor: c.border, padding: spacing.md, paddingTop: spacing.sm, gap: spacing.sm }}>
            {grouped.map(({ day, date, items }) => {
              const isToday = date === todayIso;
              return (
                <View key={day} style={{ backgroundColor: isToday ? '#FEF9E7' : c.background, borderRadius: radius.md, padding: spacing.sm }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <Calendar color={c.textMuted} size={12} />
                    <Text style={{ color: c.textSecondary, fontWeight: '700', fontSize: 11 }}>{WEEKDAY_LABELS[day]}</Text>
                    <Text style={{ color: c.textMuted, fontSize: 11 }}>{fmtDate(date)}</Text>
                    {isToday && (
                      <View style={{ backgroundColor: '#D4A017', borderRadius: radius.full, paddingHorizontal: 6, paddingVertical: 1 }}>
                        <Text style={{ color: '#FFFFFF', fontSize: 9, fontWeight: '700' }}>Bugün</Text>
                      </View>
                    )}
                  </View>
                  <View style={{ gap: 6 }}>
                    {items.map((it, idx) => (
                      <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Clock color={c.textMuted} size={10} />
                        <Text style={{ color: c.textMuted, fontSize: 11, fontWeight: '600' }}>{it.time_slot}</Text>
                        {it.link_url ? (
                          <Link href={it.link_url as any} asChild>
                            <Pressable style={{ flexDirection: 'row', alignItems: 'center', gap: 3, flex: 1 }}>
                              <Text style={{ color: c.primary, fontSize: 11, flexShrink: 1 }} numberOfLines={1}>{it.activity}</Text>
                              <ExternalLink color={c.primary} size={10} />
                            </Pressable>
                          </Link>
                        ) : (
                          <Text style={{ color: c.textSecondary, fontSize: 11, flex: 1 }} numberOfLines={1}>{it.activity}</Text>
                        )}
                      </View>
                    ))}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </Card>
    </View>
  );
}

export default function RoadmapScreen() {
  const c = useThemeColors();
  const scrollRef = useRef<ScrollView>(null);
  const scrolledRef = useRef(false);
  const [expandedWeek, setExpandedWeek] = useState<number | null>(null);
  const [expandedInit, setExpandedInit] = useState(false);

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['roadmap'],
    queryFn: scheduleApi.getRoadmap,
  });

  const weeks = data?.weeks ?? [];
  const todayIso = data?.today ?? '';
  const currentWeekNumber = data?.current_week_number ?? null;

  if (!expandedInit && currentWeekNumber != null) {
    setExpandedWeek(currentWeekNumber);
    setExpandedInit(true);
  }

  return (
    <ScreenContainer scroll={false} padded={false}>
      <ScreenNavBar />
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <View style={{ width: 36, height: 36, borderRadius: radius.md, backgroundColor: c.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
            <RouteIcon color={c.accent} size={18} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: c.text, fontSize: 18, fontWeight: '800' }}>Program Haritası</Text>
            <Text style={{ color: c.textMuted, fontSize: 11 }}>20 haftalık YÖKDİL programının tamamı, Gramer Rehberi sırasına göre</Text>
          </View>
        </View>
      </View>

      {isLoading ? (
        <View style={{ paddingTop: spacing.xxl, alignItems: 'center' }}>
          <ActivityIndicator color={c.primary} />
        </View>
      ) : isError ? (
        <View style={{ padding: spacing.lg, alignItems: 'center', paddingTop: spacing.xxl }}>
          <AlertTriangle color={c.danger ?? '#9A3412'} size={28} />
          <Text style={{ color: c.text, fontSize: 14, fontWeight: '700', marginTop: spacing.sm, textAlign: 'center' }}>
            Yol haritası yüklenemedi
          </Text>
          <Text style={{ color: c.textMuted, fontSize: 12, marginTop: 4, textAlign: 'center', maxWidth: 280 }}>
            {getErrorMessage(error, 'Sunucuya bağlanırken bir sorun oluştu.')}
          </Text>
          <Pressable
            onPress={() => refetch()}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.lg, backgroundColor: c.primary, borderRadius: radius.md, paddingHorizontal: 16, paddingVertical: 10 }}
          >
            <RotateCw color="#FFFFFF" size={14} />
            <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 13 }}>Tekrar Dene</Text>
          </Pressable>
        </View>
      ) : weeks.length === 0 ? (
        <View style={{ padding: spacing.lg }}>
          <EmptyState title="Henüz bir yol haritan yok" subtitle="Programını oluşturduğunda 20 haftalık yol haritan burada görünecek." />
        </View>
      ) : (
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{ padding: spacing.lg, paddingTop: spacing.xs }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
          showsVerticalScrollIndicator={false}
        >
          {weeks.map((week) => (
            <WeekCard
              key={week.id}
              week={week}
              isCurrent={week.week_number === currentWeekNumber}
              expanded={expandedWeek === week.week_number}
              onToggle={() => setExpandedWeek((prev) => (prev === week.week_number ? null : week.week_number))}
              todayIso={todayIso}
              onLayoutY={
                week.week_number === currentWeekNumber
                  ? (y) => {
                      if (scrolledRef.current) return;
                      scrolledRef.current = true;
                      requestAnimationFrame(() => scrollRef.current?.scrollTo({ y: Math.max(y - 12, 0), animated: true }));
                    }
                  : undefined
              }
            />
          ))}
        </ScrollView>
      )}
    </ScreenContainer>
  );
}
