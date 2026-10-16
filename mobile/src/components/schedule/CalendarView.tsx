// components/schedule/CalendarView.tsx — Çalışma Programı için Takvim
// gösterim modu (15 Ekim 2026 kullanıcı isteği): "genel yıllık, aylık,
// haftalık seçenekleri olsun, Program haritası dışında buradan da istediğim
// tarih aralığında ne var görebileyim".
//
// 15 Ekim 2026 — ikinci geri bildirim turu: "takvim modunda tarihler değişse
// bile hep aynı ders içeriği yazılı gözüküyor, burası hatalı olmuş" — ESKİ
// kod sadece study_schedule'ı (tek bir haftalık TEKRARLI şablon) day_of_week'e
// göre gösteriyordu, bu yüzden HANGİ tarihe tıklanırsa tıklansın aynı hafta
// içeriği çıkıyordu. Artık GET /schedule/roadmap'ten (study_roadmap_weeks)
// 20 haftanın TAMAMI çekiliyor ve her maddenin kendi GERÇEK tarihine
// (item.date) göre bir Map<tarih, maddeler> kuruluyor — böylece her tarih
// kendi haftasının gerçek konusunu gösterir. Roadmap'in kapsadığı tarih
// aralığı dışındaki günler eski haftalık-tekrarlı study_schedule mantığına
// düşer (geriye dönük uyumluluk) — web/src/components/schedule/CalendarView.tsx
// ile aynı mantık, RN ile.
//
// Ayrıca kullanıcı isteği: gün kutuları kare/dikdörtgen olsun ve
// yeşil/turuncu/kırmızı/sarı (soft tonlar) ile renklendirilsin + gün detay
// panelinde bir "Yapıldı" anahtarı olsun (bkz. backend
// schedule_day_completions + /schedule/day-completion(s)).
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { ChevronLeft, ChevronRight, Clock, X, Check, ExternalLink } from 'lucide-react-native';
import { router } from 'expo-router';
import { useThemeColors } from '@/hooks/useThemeColors';
import { radius, spacing } from '@/constants/theme';
import { Card } from '@/components/ui/Card';
import { scheduleApi } from '@/api/schedule';
import type { ScheduleItem, ScheduleTemplateItem, RoadmapWeek, RelatedTopic } from '@/api/types';

type CalendarMode = 'week' | 'month' | 'year';
type DayStatus = 'done' | 'scheduled' | 'missed' | 'none';

const WEEKDAY_SHORT_TR = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
const MONTH_NAMES_TR = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];

// Soft tonlar — web/src/components/schedule/CalendarView.tsx ile birebir aynı
// hex değerleri (platformlar arası tutarlılık için).
const STATUS_STYLES: Record<DayStatus, { bg: string; text: string }> = {
  done: { bg: '#E1F5EE', text: '#0F6E56' },
  scheduled: { bg: '#FEF3E7', text: '#B7791F' },
  missed: { bg: '#FDEEEA', text: '#9A3412' },
  none: { bg: '#FEF9E7', text: '#D4A017' },
};

const STATUS_LABEL: Record<DayStatus, string> = {
  done: 'Yapıldı',
  scheduled: 'Çalışılacak',
  missed: 'Çalışılmadı',
  none: 'Program yok',
};

type DisplayItem = {
  key: string;
  time_slot: string;
  activity: string;
  link_url?: string;
  related_topics?: RelatedTopic[];
  topic_number?: number | null;
};

function isoOf(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function startOfWeek(d: Date): Date {
  const r = new Date(d);
  r.setDate(r.getDate() - r.getDay());
  r.setHours(0, 0, 0, 0);
  return r;
}

export function CalendarView({ items }: { items: ScheduleItem[] }) {
  const c = useThemeColors();
  const [mode, setMode] = useState<CalendarMode>('month');
  const [anchor, setAnchor] = useState<Date>(() => new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [roadmapWeeks, setRoadmapWeeks] = useState<RoadmapWeek[]>([]);
  const [completions, setCompletions] = useState<Record<string, boolean>>({});
  const [savingCompletion, setSavingCompletion] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [roadmap, comps] = await Promise.all([
        scheduleApi.getRoadmap().catch(() => null),
        scheduleApi.getDayCompletions().catch(() => []),
      ]);
      if (!alive) return;
      if (roadmap) setRoadmapWeeks(roadmap.weeks);
      setCompletions(Object.fromEntries((comps ?? []).map((item) => [item.date, item.is_done])));
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Her maddenin GERÇEK tarihine (item.date) göre kurulmuş harita — her
  // tarih kendi haftasının gerçek konusunu gösterir (bkz. dosya başı notu).
  const itemsByDate = useMemo(() => {
    const map: Record<string, DisplayItem[]> = {};
    for (const w of roadmapWeeks) {
      for (const it of w.schedule_items) {
        if (!it.date) continue;
        (map[it.date] ??= []).push({
          key: `${w.id}-${it.date}-${it.time_slot}-${it.activity_key ?? it.activity}`,
          time_slot: it.time_slot,
          activity: it.activity,
          link_url: it.link_url,
          related_topics: it.related_topics,
          topic_number: it.topic_number,
        });
      }
    }
    for (const d of Object.keys(map)) map[d].sort((a, b) => a.time_slot.localeCompare(b.time_slot));
    return map;
  }, [roadmapWeeks]);

  const roadmapRange = useMemo(() => {
    if (roadmapWeeks.length === 0) return null;
    return { start: roadmapWeeks[0].start_date, end: roadmapWeeks[roadmapWeeks.length - 1].end_date };
  }, [roadmapWeeks]);

  // Geriye dönük uyumluluk: roadmap tarih aralığının DIŞINDaki günler için
  // eski haftalık-tekrarlı study_schedule mantığına düş.
  const itemsByDow = useMemo(() => {
    const map: Record<number, DisplayItem[]> = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
    for (const it of items) {
      if (!it.is_active) continue;
      (map[it.day_of_week] ??= []).push({
        key: it.id,
        time_slot: it.time_slot,
        activity: it.activity,
        link_url: it.resolved_link_url || it.link_url,
        related_topics: it.related_topics,
        topic_number: it.topic_number,
      });
    }
    for (const dow of Object.keys(map)) {
      map[Number(dow)].sort((a, b) => a.time_slot.localeCompare(b.time_slot));
    }
    return map;
  }, [items]);

  function itemsForDate(d: Date): DisplayItem[] {
    const iso = isoOf(d);
    if (roadmapRange && iso >= roadmapRange.start && iso <= roadmapRange.end) {
      return itemsByDate[iso] ?? [];
    }
    return itemsByDow[d.getDay()] ?? [];
  }

  const todayIso = isoOf(new Date());

  function statusForDate(d: Date): DayStatus {
    const iso = isoOf(d);
    const dayItems = itemsForDate(d);
    if (dayItems.length === 0) return 'none';
    if (completions[iso]) return 'done';
    return iso < todayIso ? 'missed' : 'scheduled';
  }

  async function toggleDone(d: Date, done: boolean) {
    const iso = isoOf(d);
    setSavingCompletion(true);
    setCompletions((prev) => ({ ...prev, [iso]: done }));
    try {
      await scheduleApi.setDayCompletion(iso, done);
    } catch {
      setCompletions((prev) => ({ ...prev, [iso]: !done }));
    } finally {
      setSavingCompletion(false);
    }
  }

  function go(delta: number) {
    const d = new Date(anchor);
    if (mode === 'week') d.setDate(d.getDate() + delta * 7);
    else if (mode === 'month') d.setMonth(d.getMonth() + delta);
    else d.setFullYear(d.getFullYear() + delta);
    setAnchor(d);
  }

  const today = new Date();

  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm, flexWrap: 'wrap', gap: spacing.sm }}>
        <View style={{ flexDirection: 'row', backgroundColor: c.background, borderRadius: radius.full, padding: 3 }}>
          {(['week', 'month', 'year'] as CalendarMode[]).map((m) => (
            <Pressable
              key={m}
              onPress={() => { setMode(m); setSelectedDate(null); }}
              style={{
                paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.full,
                backgroundColor: mode === m ? c.surface : 'transparent',
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '700', color: mode === m ? c.text : c.textMuted }}>
                {m === 'week' ? 'Haftalık' : m === 'month' ? 'Aylık' : 'Yıllık'}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Pressable onPress={() => go(-1)} hitSlop={8} style={{ padding: 6 }}>
            <ChevronLeft color={c.textMuted} size={16} />
          </Pressable>
          <Pressable onPress={() => { setAnchor(new Date()); setSelectedDate(null); }} hitSlop={8} style={{ paddingHorizontal: 8, paddingVertical: 4 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: c.textSecondary }}>Bugün</Text>
          </Pressable>
          <Pressable onPress={() => go(1)} hitSlop={8} style={{ padding: 6 }}>
            <ChevronRight color={c.textMuted} size={16} />
          </Pressable>
        </View>
      </View>

      {/* Renk lejandı */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: spacing.sm }}>
        {(['done', 'scheduled', 'missed', 'none'] as DayStatus[]).map((s) => (
          <View key={s} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <View style={{ width: 9, height: 9, borderRadius: 2, backgroundColor: STATUS_STYLES[s].text }} />
            <Text style={{ fontSize: 10, color: c.textMuted }}>{STATUS_LABEL[s]}</Text>
          </View>
        ))}
      </View>

      {mode === 'week' && (
        <WeekGrid anchor={anchor} statusForDate={statusForDate} itemCountForDate={(d) => itemsForDate(d).length} today={today} onPickDate={setSelectedDate} />
      )}
      {mode === 'month' && <MonthGrid anchor={anchor} statusForDate={statusForDate} today={today} onPickDate={setSelectedDate} />}
      {mode === 'year' && <YearGrid anchor={anchor} statusForDate={statusForDate} today={today} onPickMonth={(d) => { setAnchor(d); setMode('month'); }} />}

      {selectedDate && (
        <DayDetailPanel
          date={selectedDate}
          items={itemsForDate(selectedDate)}
          status={statusForDate(selectedDate)}
          isDone={!!completions[isoOf(selectedDate)]}
          saving={savingCompletion}
          onToggleDone={(done) => toggleDone(selectedDate, done)}
          onClose={() => setSelectedDate(null)}
        />
      )}
    </View>
  );
}

function DayDetailPanel({
  date, items, status, isDone, saving, onToggleDone, onClose,
}: {
  date: Date;
  items: DisplayItem[];
  status: DayStatus;
  isDone: boolean;
  saving: boolean;
  onToggleDone: (done: boolean) => void;
  onClose: () => void;
}) {
  const c = useThemeColors();
  const style = STATUS_STYLES[status];
  return (
    <Card style={{ marginTop: spacing.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: c.text, flexShrink: 1 }} numberOfLines={1}>
            {date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' })}
          </Text>
          <View style={{ backgroundColor: style.bg, borderRadius: radius.full, paddingHorizontal: 7, paddingVertical: 2 }}>
            <Text style={{ fontSize: 9, fontWeight: '700', color: style.text }}>{STATUS_LABEL[status]}</Text>
          </View>
        </View>
        <Pressable onPress={onClose} hitSlop={8}>
          <X color={c.textMuted} size={18} />
        </Pressable>
      </View>
      {items.length === 0 ? (
        <Text style={{ fontSize: 13, color: c.textMuted }}>Bu gün için planlanmış bir etkinlik yok.</Text>
      ) : (
        <View style={{ gap: 2 }}>
          <View style={{ gap: 8 }}>
            {items.map((it) => (
              <View key={it.key}>
                <Pressable
                  onPress={() => it.link_url && router.push(it.link_url as any)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
                >
                  <Clock color={c.textMuted} size={12} />
                  <Text style={{ fontSize: 11, color: c.textMuted, fontWeight: '700' }}>{it.time_slot}</Text>
                  <Text style={{ fontSize: 13, color: c.text, flex: 1 }} numberOfLines={2}>
                    {it.topic_number ? `${it.topic_number}. ` : ''}{it.activity}
                  </Text>
                  {!!it.link_url && <ExternalLink color={c.border} size={12} />}
                </Pressable>
                {it.related_topics && it.related_topics.length > 0 && (
                  <View style={{ marginTop: 4, marginLeft: 20 }}>
                    {/* 16 Ekim 2026, kullanıcı isteği -- bunların sadece
                        referans değil, GERÇEK ek müfredat konusu olduğu
                        açıkça belirtiliyor. */}
                    <Text style={{ color: c.textMuted, fontSize: 9, fontWeight: '700', marginBottom: 2 }}>
                      Bu hafta bunları da çalışmalısın:
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
                      {it.related_topics.map((rt) => (
                        <Pressable
                          key={rt.slug}
                          onPress={() => router.push(rt.link_url as any)}
                          style={{ backgroundColor: c.background, borderRadius: radius.sm, paddingHorizontal: 6, paddingVertical: 2 }}
                        >
                          <Text style={{ color: c.textMuted, fontSize: 10, fontWeight: '600' }} numberOfLines={1}>
                            {rt.topic_number ? `${rt.topic_number}. ` : ''}{rt.title}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            ))}
          </View>

          {/* 15 Ekim 2026 kullanıcı isteği — "yapıldı seçeneği olsun" */}
          <Pressable
            onPress={() => onToggleDone(!isDone)}
            disabled={saving}
            style={{
              marginTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
              borderRadius: radius.lg, paddingVertical: 11, opacity: saving ? 0.6 : 1,
              backgroundColor: isDone ? STATUS_STYLES.done.bg : c.background,
            }}
          >
            <Check color={isDone ? STATUS_STYLES.done.text : c.textSecondary} size={15} />
            <Text style={{ fontSize: 13, fontWeight: '700', color: isDone ? STATUS_STYLES.done.text : c.textSecondary }}>
              {isDone ? 'Yapıldı olarak işaretlendi' : 'Yapıldı olarak işaretle'}
            </Text>
          </Pressable>
        </View>
      )}
    </Card>
  );
}

function StatusCell({
  isToday, status, children, onPress, style,
}: {
  isToday: boolean;
  status: DayStatus;
  children: React.ReactNode;
  onPress: () => void;
  style?: any;
}) {
  const c = useThemeColors();
  const s = STATUS_STYLES[status];
  return (
    <Pressable
      onPress={onPress}
      style={[
        {
          backgroundColor: s.bg, borderRadius: radius.sm,
          borderWidth: isToday ? 1.5 : 0, borderColor: isToday ? c.primary : 'transparent',
        },
        style,
      ]}
    >
      {children}
    </Pressable>
  );
}

function WeekGrid({
  anchor, statusForDate, itemCountForDate, today, onPickDate,
}: {
  anchor: Date;
  statusForDate: (d: Date) => DayStatus;
  itemCountForDate: (d: Date) => number;
  today: Date;
  onPickDate: (d: Date) => void;
}) {
  const start = startOfWeek(anchor);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
      {days.map((d) => {
        const dow = d.getDay();
        const status = statusForDate(d);
        const s = STATUS_STYLES[status];
        const isToday = sameDay(d, today);
        const count = itemCountForDate(d);
        return (
          <StatusCell
            key={d.toISOString()}
            isToday={isToday}
            status={status}
            onPress={() => onPickDate(d)}
            style={{ width: '13%', minWidth: 42, minHeight: 58, padding: 6, alignItems: 'center', justifyContent: 'center', gap: 2 }}
          >
            <Text style={{ fontSize: 9, fontWeight: '700', color: s.text }}>{WEEKDAY_SHORT_TR[dow]}</Text>
            <Text style={{ fontSize: 14, fontWeight: '800', color: s.text }}>{d.getDate()}</Text>
            {count > 0 && <Text style={{ fontSize: 8, color: s.text }}>{count} madde</Text>}
          </StatusCell>
        );
      })}
    </View>
  );
}

function MonthGrid({
  anchor, statusForDate, today, onPickDate,
}: {
  anchor: Date;
  statusForDate: (d: Date) => DayStatus;
  today: Date;
  onPickDate: (d: Date) => void;
}) {
  const c = useThemeColors();
  const year = anchor.getFullYear();
  const month = anchor.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const gridStart = startOfWeek(firstOfMonth);
  const cells = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    return d;
  });

  return (
    <View>
      <Text style={{ fontSize: 14, fontWeight: '700', color: c.text, marginBottom: spacing.xs }}>
        {MONTH_NAMES_TR[month]} {year}
      </Text>
      <View style={{ flexDirection: 'row', marginBottom: 2 }}>
        {WEEKDAY_SHORT_TR.map((w) => (
          <Text key={w} style={{ width: '14.28%', textAlign: 'center', fontSize: 9, fontWeight: '700', color: c.textMuted }}>{w}</Text>
        ))}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {cells.map((d) => {
          const inMonth = d.getMonth() === month;
          const status = statusForDate(d);
          const s = STATUS_STYLES[status];
          const isToday = sameDay(d, today);
          return (
            <View key={d.toISOString()} style={{ width: '14.28%', padding: 2 }}>
              <StatusCell
                isToday={isToday}
                status={status}
                onPress={() => onPickDate(d)}
                style={{ aspectRatio: 1, alignItems: 'center', justifyContent: 'center', opacity: inMonth ? 1 : 0.35 }}
              >
                <Text style={{ fontSize: 12, fontWeight: '700', color: s.text }}>{d.getDate()}</Text>
              </StatusCell>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function YearGrid({
  anchor, statusForDate, today, onPickMonth,
}: {
  anchor: Date;
  statusForDate: (d: Date) => DayStatus;
  today: Date;
  onPickMonth: (d: Date) => void;
}) {
  const c = useThemeColors();
  const year = anchor.getFullYear();

  return (
    <View>
      <Text style={{ fontSize: 14, fontWeight: '700', color: c.text, marginBottom: spacing.xs }}>{year}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {Array.from({ length: 12 }, (_, month) => {
          const firstOfMonth = new Date(year, month, 1);
          const gridStart = startOfWeek(firstOfMonth);
          const cells = Array.from({ length: 42 }, (_, i) => {
            const d = new Date(gridStart);
            d.setDate(gridStart.getDate() + i);
            return d;
          });
          return (
            <Pressable
              key={month}
              onPress={() => onPickMonth(firstOfMonth)}
              style={{ width: '31%', backgroundColor: c.surface, borderRadius: radius.md, padding: 6, borderWidth: 1, borderColor: c.border }}
            >
              <Text style={{ fontSize: 11, fontWeight: '700', color: c.text, marginBottom: 4 }}>{MONTH_NAMES_TR[month]}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {cells.map((d) => {
                  const inMonth = d.getMonth() === month;
                  const isToday = sameDay(d, today);
                  const status = statusForDate(d);
                  const s = STATUS_STYLES[status];
                  return (
                    <View
                      key={d.toISOString()}
                      style={{
                        width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center',
                        backgroundColor: s.bg, opacity: inMonth ? 1 : 0.25,
                        borderWidth: isToday ? 1 : 0, borderColor: c.primary,
                      }}
                    >
                      <Text style={{ fontSize: 6, fontWeight: '700', color: s.text }}>{d.getDate()}</Text>
                    </View>
                  );
                })}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
