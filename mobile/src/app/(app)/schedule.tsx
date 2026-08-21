import React, { useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocale } from '@/i18n';
import { scheduleApi } from '@/api/schedule';
import type { ScheduleItem } from '@/api/types';
import { useThemeColors } from '@/hooks/useThemeColors';
import { radius, spacing } from '@/constants/theme';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Card } from '@/components/ui/Card';
import { TextField } from '@/components/ui/TextField';
import { Button } from '@/components/ui/Button';
import { ChipSelect } from '@/components/ui/ChipSelect';
import { EmptyState } from '@/components/ui/EmptyState';

// Pazartesi'den başlayan görüntüleme sırası — day_of_week 0=Pazar..6=Cumartesi
// (bkz. web/src/lib/scheduleTemplates.ts yorumu ve backend study_schedule şeması).
const DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

export default function ScheduleScreen() {
  const { t } = useLocale();
  const c = useThemeColors();
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);

  const { data: items, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['schedule'],
    queryFn: scheduleApi.getAll,
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) => scheduleApi.update(id, { is_active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['schedule'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => scheduleApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['schedule'] }),
  });

  const weekdays = t('weekdayLabels').split(',');

  const grouped = useMemo(() => {
    const map = new Map<number, ScheduleItem[]>();
    for (const it of items ?? []) {
      const arr = map.get(it.day_of_week) ?? [];
      arr.push(it);
      map.set(it.day_of_week, arr);
    }
    for (const arr of map.values()) arr.sort((a, b) => a.time_slot.localeCompare(b.time_slot));
    return map;
  }, [items]);

  return (
    <ScreenContainer refreshing={isRefetching} onRefresh={refetch}>
      <View style={styles.headerRow}>
        <Text style={{ color: c.text, fontSize: 20, fontWeight: '700' }}>{t('scheduleTitle')}</Text>
        <Pressable onPress={() => setModalOpen(true)} style={[styles.addBtn, { backgroundColor: c.primary }]}>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>+ {t('addActivityBtn')}</Text>
        </Pressable>
      </View>

      {!isLoading && (!items || items.length === 0) && (
        <EmptyState title={t('noScheduleYet')} subtitle={t('noScheduleYetSub')} />
      )}

      {DISPLAY_ORDER.map((dayIdx) => {
        const dayItems = grouped.get(dayIdx);
        if (!dayItems || dayItems.length === 0) return null;
        return (
          <View key={dayIdx} style={{ marginBottom: spacing.lg }}>
            <Text style={{ color: c.textSecondary, fontWeight: '700', fontSize: 13, marginBottom: spacing.sm }}>
              {weekdays[dayIdx] ?? dayIdx}
            </Text>
            {dayItems.map((item) => (
              <Card key={item.id} style={[styles.itemCard, { opacity: item.is_active ? 1 : 0.5 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: c.text, fontWeight: '600', fontSize: 14 }}>{item.activity}</Text>
                  <Text style={{ color: c.textMuted, fontSize: 12, marginTop: 2 }}>
                    {item.time_slot} · {item.duration_min} dk
                  </Text>
                </View>
                <Switch
                  value={item.is_active}
                  onValueChange={(v) => toggleMutation.mutate({ id: item.id, is_active: v })}
                  trackColor={{ true: c.primary }}
                />
                <Pressable
                  onPress={() =>
                    Alert.alert(t('deleteScheduleConfirm'), '', [
                      { text: t('cancelBtn'), style: 'cancel' },
                      { text: t('saveBtn'), style: 'destructive', onPress: () => deleteMutation.mutate(item.id) },
                    ])
                  }
                  hitSlop={10}
                  style={{ marginLeft: spacing.sm }}
                >
                  <Text style={{ color: c.danger, fontSize: 15 }}>✕</Text>
                </Pressable>
              </Card>
            ))}
          </View>
        );
      })}

      <AddActivityModal visible={modalOpen} onClose={() => setModalOpen(false)} onCreated={() => { setModalOpen(false); qc.invalidateQueries({ queryKey: ['schedule'] }); }} weekdays={weekdays} />
    </ScreenContainer>
  );
}

function AddActivityModal({
  visible,
  onClose,
  onCreated,
  weekdays,
}: {
  visible: boolean;
  onClose: () => void;
  onCreated: () => void;
  weekdays: string[];
}) {
  const { t } = useLocale();
  const c = useThemeColors();
  const [dayOfWeek, setDayOfWeek] = useState('1');
  const [timeSlot, setTimeSlot] = useState('09:00');
  const [activity, setActivity] = useState('');
  const [duration, setDuration] = useState('30');
  const [error, setError] = useState('');

  const createMutation = useMutation({
    mutationFn: () =>
      scheduleApi.create({
        day_of_week: Number(dayOfWeek),
        time_slot: timeSlot,
        activity: activity.trim(),
        duration_min: Number(duration) || 30,
      }),
    onSuccess: () => {
      setActivity('');
      onCreated();
    },
    onError: () => setError(t('saveScheduleFailed')),
  });

  const dayOptions = DISPLAY_ORDER_FOR_FORM.map((d) => ({ value: String(d), label: weekdays[d] ?? String(d) }));

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <ScrollView style={[styles.modalCard, { backgroundColor: c.surface }]} contentContainerStyle={{ paddingBottom: spacing.xxl }}>
          <Text style={[styles.modalTitle, { color: c.text }]}>{t('addActivityModalTitle')}</Text>

          <Text style={{ color: c.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: spacing.sm }}>{t('dayLabel')}</Text>
          <ChipSelect options={dayOptions} value={dayOfWeek} onChange={setDayOfWeek} />

          <View style={{ height: spacing.md }} />
          <TextField label={t('timeLabel')} value={timeSlot} onChangeText={setTimeSlot} placeholder="09:00" />
          <TextField label={t('activityLabel')} value={activity} onChangeText={setActivity} />
          <TextField label={t('durationLabel')} value={duration} onChangeText={setDuration} keyboardType="number-pad" />

          {error ? <Text style={{ color: c.danger, fontSize: 12, marginBottom: spacing.sm }}>{error}</Text> : null}

          <View style={styles.modalActions}>
            <View style={{ flex: 1 }}>
              <Button title={t('cancelBtn')} variant="ghost" onPress={onClose} />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                title={t('saveBtn')}
                loading={createMutation.isPending}
                onPress={() => {
                  if (!activity.trim()) {
                    setError(t('activityRequired'));
                    return;
                  }
                  setError('');
                  createMutation.mutate();
                }}
              />
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const DISPLAY_ORDER_FOR_FORM = [1, 2, 3, 4, 5, 6, 0];

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg },
  addBtn: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.full },
  itemCard: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm, paddingVertical: spacing.md },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard: { borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg, maxHeight: '85%' },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: spacing.md },
  modalActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
});
