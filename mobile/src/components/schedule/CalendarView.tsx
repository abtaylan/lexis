// components/schedule/CalendarView.tsx — Çalışma Programı için Takvim
// gösterim modu (15 Ekim 2026 kullanıcı isteği): "genel yıllık, aylık,
// haftalık seçenekleri olsun, Program haritası dışında buradan da istediğim
// tarih aralığında ne var görebileyim". study_schedule HAFTANIN GÜNÜNE göre
// tekrar eden bir program olduğundan (tarihe özel değil), herhangi bir
// takvim tarihi için o günün haftanın hangi günü olduğuna (date.getDay())
// bakılarak o gün için planlanan maddeler gösterilir — ScheduleItem.day_of_week
// JS Date.getDay() ile aynı 0=Pazar..6=Cumartesi sözleşimini kullanıyor.
// web/src/components/schedule/CalendarView.tsx ile aynı mantık, RN ile.
import React, { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useThemeColors } from '@/hooks/useThemeColors';
import { radius, spacing } from '@/constants/theme';
import { Card } from '@/components/ui/Card';
import type { ScheduleItem } from '@/api/types';

type CalendarMode = 'week' | 'month' | 'year';

const WEEKDAY_SHORT_TR = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
const MONTH_NAMES_TR = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];

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

  const itemsByDow = useMemo(() => {
    const map: Record<number, ScheduleItem[]> = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
    for (const it of items) {
      if (!it.is_active) continue;
      (map[it.day_of_week] ??= []).push(it);
    }
    for (const dow of Object.keys(map)) {
      map[Number(dow)].sort((a, b) => a.time_slot.localeCompare(b.time_slot));
    }
    return map;
  }, [items]);

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

      {mode === 'week' && <WeekGrid anchor={anchor} itemsByDow={itemsByDow} today={today} onPickDate={setSelectedDate} />}
      {mode === 'month' && <MonthGrid anchor={anchor} itemsByDow={itemsByDow} today={today} onPickDate={setSelectedDate} />}
      {mode === 'year' && <YearGrid anchor={anchor} itemsByDow={itemsByDow} today={today} onPickMonth={(d) => { setAnchor(d); setMode('month'); }} />}

      {selectedDate && (
        <DayDetailPanel date={selectedDate} items={itemsByDow[selectedDate.getDay()] ?? []} onClose={() => setSelectedDate(null)} />
      )}
    </View>
  );
}

function DayDetailPanel({ date, items, onClose }: { date: Date; items: ScheduleItem[]; onClose: () => void }) {
  const c = useThemeColors();
  return (
    <Card style={{ marginTop: spacing.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm }}>
        <Text style={{ fontSize: 14, fontWeight: '700', color: c.text }}>
          {date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' })}
        </Text>
        <Pressable onPress={onClose} hitSlop={8}>
          <Text style={{ color: c.textMuted, fontSize: 16 }}>✕</Text>
        </Pressable>
      </View>
      {items.length === 0 ? (
        <Text style={{ fontSize: 13, color: c.textMuted }}>Bu gün için planlanmış bir etkinlik yok.</Text>
      ) : (
        <View style={{ gap: 6 }}>
          {items.map((it) => (
            <View key={it.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 11, color: c.textMuted, fontWeight: '700' }}>{it.time_slot}</Text>
              <Text style={{ fontSize: 13, color: c.text, flex: 1 }}>{it.activity}</Text>
            </View>
          ))}
        </View>
      )}
    </Card>
  );
}

function WeekGrid({
  anchor, itemsByDow, today, onPickDate,
}: { anchor: Date; itemsByDow: Record<number, ScheduleItem[]>; today: Date; onPickDate: (d: Date) => void }) {
  const c = useThemeColors();
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
        const dayItems = itemsByDow[dow] ?? [];
        const isToday = sameDay(d, today);
        return (
          <Pressable
            key={d.toISOString()}
            onPress={() => onPickDate(d)}
            style={{
              width: '13%', minWidth: 42, borderRadius: radius.md, padding: 6,
              backgroundColor: isToday ? c.primary : c.background,
              alignItems: 'center', gap: 2,
            }}
          >
            <Text style={{ fontSize: 9, fontWeight: '700', color: isToday ? '#FFFFFFCC' : c.textMuted }}>
              {WEEKDAY_SHORT_TR[dow]}
            </Text>
            <Text style={{ fontSize: 14, fontWeight: '800', color: isToday ? '#FFFFFF' : c.text }}>{d.getDate()}</Text>
            {dayItems.length > 0 && (
              <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: isToday ? '#FFFFFF' : c.primary }} />
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

function MonthGrid({
  anchor, itemsByDow, today, onPickDate,
}: { anchor: Date; itemsByDow: Record<number, ScheduleItem[]>; today: Date; onPickDate: (d: Date) => void }) {
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
          const dow = d.getDay();
          const dayItems = itemsByDow[dow] ?? [];
          const isToday = sameDay(d, today);
          return (
            <Pressable
              key={d.toISOString()}
              onPress={() => onPickDate(d)}
              style={{
                width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', gap: 2,
                backgroundColor: isToday ? c.primary : 'transparent',
                borderRadius: radius.sm,
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '600', color: isToday ? '#FFFFFF' : inMonth ? c.text : c.textMuted }}>
                {d.getDate()}
              </Text>
              {dayItems.length > 0 && (
                <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: isToday ? '#FFFFFF' : c.primary }} />
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function YearGrid({
  anchor, itemsByDow, today, onPickMonth,
}: { anchor: Date; itemsByDow: Record<number, ScheduleItem[]>; today: Date; onPickMonth: (d: Date) => void }) {
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
              style={{ width: '31%', backgroundColor: c.background, borderRadius: radius.md, padding: 6 }}
            >
              <Text style={{ fontSize: 11, fontWeight: '700', color: c.text, marginBottom: 4 }}>{MONTH_NAMES_TR[month]}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {cells.map((d) => {
                  const inMonth = d.getMonth() === month;
                  const dow = d.getDay();
                  const hasItems = (itemsByDow[dow] ?? []).length > 0;
                  const isToday = sameDay(d, today);
                  return (
                    <View
                      key={d.toISOString()}
                      style={{
                        width: '14.28%', alignItems: 'center', justifyContent: 'center', paddingVertical: 1,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 7,
                          fontWeight: isToday ? '800' : hasItems ? '700' : '400',
                          color: isToday ? c.primary : !inMonth ? c.border : hasItems ? c.primary : c.textMuted,
                        }}
                      >
                        {d.getDate()}
                      </Text>
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
