import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Sparkles, Star, Save, X, Trash2, Plus, Check,
  Flame, Zap, Coffee, Headphones, BookOpen, GraduationCap, User as UserIcon,
} from 'lucide-react-native';
import { useLocale } from '@/i18n';
import { scheduleApi } from '@/api/schedule';
import type { ScheduleCreate, ScheduleItem, ScheduleTemplate } from '@/api/types';
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

// ── Hazır program şablonları — web'deki app/(app)/schedule/page.tsx'teki
// TEMPLATES/TASK_LINKS ile birebir aynı veri (aktivite adları kasıtlı olarak
// çevrilmiyor, bkz. web'deki yorum: i18n sistemine dahil değiller). ──
const TASK_LINKS: Record<string, string> = {
  'Teknik Makale': 'https://medium.com/tag/english-learning',
  'Haber Okuma': 'https://www.bbc.co.uk/learningenglish',
  'LingoClip': 'https://lingoclip.com/',
  'Video Analizi': 'https://www.youtube.com/@TEDEd',
  'Genel Tekrar': 'https://quizlet.com/',
  'Kelime Tekrarı': '',
  'Dizi/Film': 'https://www.netflix.com/',
  'Podcast': 'https://www.bbc.co.uk/learningenglish/english/features/6-minute-english',
  'WordBox English': '',
  'News in Levels': 'https://www.newsinlevels.com/',
  'More to Read': '',
  'Max and Mia Podcast': 'https://learnenglish.britishcouncil.org/general-english/audio-series/max-and-mia',
  'YÖKDİL Sözlük Kitabı': '',
  'Voice of America': 'https://learningenglish.voanews.com/',
  "Luke's English Podcast": 'https://teacherluke.co.uk/',
};

function link(activity: string): string {
  return TASK_LINKS[activity] ?? '';
}

interface Template {
  id: string;
  name: string;
  desc: string;
  icon: React.ReactNode;
  accent: string;
  items: ScheduleCreate[];
}

const TEMPLATES: Template[] = [
  {
    id: 'yogun',
    name: 'Yoğun',
    desc: 'Her gün, sabah + akşam · ~hızlı ilerleme',
    icon: <Flame color="#854F0B" size={20} />,
    accent: '#854F0B',
    items: [
      { day_of_week: 1, time_slot: '08:00', activity: 'Teknik Makale', duration_min: 30, link_url: link('Teknik Makale') },
      { day_of_week: 1, time_slot: '20:00', activity: 'LingoClip', duration_min: 20, link_url: link('LingoClip') },
      { day_of_week: 2, time_slot: '08:00', activity: 'Haber Okuma', duration_min: 30, link_url: link('Haber Okuma') },
      { day_of_week: 2, time_slot: '20:00', activity: 'Video Analizi', duration_min: 25, link_url: link('Video Analizi') },
      { day_of_week: 3, time_slot: '08:00', activity: 'Teknik Makale', duration_min: 30, link_url: link('Teknik Makale') },
      { day_of_week: 3, time_slot: '20:00', activity: 'Podcast', duration_min: 20, link_url: link('Podcast') },
      { day_of_week: 4, time_slot: '08:00', activity: 'Haber Okuma', duration_min: 30, link_url: link('Haber Okuma') },
      { day_of_week: 4, time_slot: '20:00', activity: 'Video Analizi', duration_min: 25, link_url: link('Video Analizi') },
      { day_of_week: 5, time_slot: '08:00', activity: 'Teknik Makale', duration_min: 30, link_url: link('Teknik Makale') },
      { day_of_week: 5, time_slot: '20:00', activity: 'LingoClip', duration_min: 20, link_url: link('LingoClip') },
      { day_of_week: 6, time_slot: '10:00', activity: 'Dizi/Film', duration_min: 45, link_url: link('Dizi/Film') },
      { day_of_week: 0, time_slot: '10:00', activity: 'Genel Tekrar', duration_min: 45, link_url: link('Genel Tekrar') },
    ],
  },
  {
    id: 'orta',
    name: 'Dengeli',
    desc: 'Hafta içi günde 1 oturum · sürdürülebilir',
    icon: <Zap color="#185FA5" size={20} />,
    accent: '#185FA5',
    items: [
      { day_of_week: 1, time_slot: '19:00', activity: 'Teknik Makale', duration_min: 30, link_url: link('Teknik Makale') },
      { day_of_week: 2, time_slot: '19:00', activity: 'Haber Okuma', duration_min: 30, link_url: link('Haber Okuma') },
      { day_of_week: 3, time_slot: '19:00', activity: 'Video Analizi', duration_min: 25, link_url: link('Video Analizi') },
      { day_of_week: 4, time_slot: '19:00', activity: 'LingoClip', duration_min: 20, link_url: link('LingoClip') },
      { day_of_week: 5, time_slot: '19:00', activity: 'Genel Tekrar', duration_min: 30, link_url: link('Genel Tekrar') },
    ],
  },
  {
    id: 'hafif',
    name: 'Hafif',
    desc: 'Haftada 3 gün · yoğun programa alternatif',
    icon: <Coffee color="#3B6D11" size={20} />,
    accent: '#3B6D11',
    items: [
      { day_of_week: 1, time_slot: '20:00', activity: 'Kelime Tekrarı', duration_min: 20, link_url: '' },
      { day_of_week: 3, time_slot: '20:00', activity: 'Video Analizi', duration_min: 25, link_url: link('Video Analizi') },
      { day_of_week: 6, time_slot: '11:00', activity: 'Genel Tekrar', duration_min: 40, link_url: link('Genel Tekrar') },
    ],
  },
  {
    id: 'podcast',
    name: 'Podcast Ağırlıklı',
    desc: 'Dinleme becerisine odaklı · haftada 4 oturum',
    icon: <Headphones color="#B7451B" size={20} />,
    accent: '#B7451B',
    items: [
      { day_of_week: 1, time_slot: '20:00', activity: 'Voice of America', duration_min: 20, link_url: link('Voice of America') },
      { day_of_week: 2, time_slot: '20:00', activity: "Luke's English Podcast", duration_min: 30, link_url: link("Luke's English Podcast") },
      { day_of_week: 4, time_slot: '20:00', activity: 'Max and Mia Podcast', duration_min: 15, link_url: link('Max and Mia Podcast') },
      { day_of_week: 6, time_slot: '11:00', activity: 'LingoClip', duration_min: 20, link_url: link('LingoClip') },
    ],
  },
  {
    id: 'okuma',
    name: 'Okuma Ağırlıklı',
    desc: 'Okuma-kelime dağarcığı odaklı · haftada 4 oturum',
    icon: <BookOpen color="#0F6E56" size={20} />,
    accent: '#0F6E56',
    items: [
      { day_of_week: 1, time_slot: '19:30', activity: 'News in Levels', duration_min: 20, link_url: link('News in Levels') },
      { day_of_week: 3, time_slot: '19:30', activity: 'More to Read', duration_min: 25, link_url: link('More to Read') },
      { day_of_week: 5, time_slot: '19:30', activity: 'Teknik Makale', duration_min: 25, link_url: link('Teknik Makale') },
      { day_of_week: 0, time_slot: '11:00', activity: 'WordBox English', duration_min: 20, link_url: link('WordBox English') },
    ],
  },
  {
    id: 'yokdil',
    name: 'YÖKDİL Hazırlık',
    desc: 'Sınav odaklı · yoğun kelime + okuma',
    icon: <GraduationCap color="#6D1B7B" size={20} />,
    accent: '#6D1B7B',
    items: [
      { day_of_week: 1, time_slot: '08:00', activity: 'YÖKDİL Sözlük Kitabı', duration_min: 30, link_url: link('YÖKDİL Sözlük Kitabı') },
      { day_of_week: 2, time_slot: '08:00', activity: 'Teknik Makale', duration_min: 25, link_url: link('Teknik Makale') },
      { day_of_week: 3, time_slot: '08:00', activity: 'YÖKDİL Sözlük Kitabı', duration_min: 30, link_url: link('YÖKDİL Sözlük Kitabı') },
      { day_of_week: 4, time_slot: '08:00', activity: 'News in Levels', duration_min: 20, link_url: link('News in Levels') },
      { day_of_week: 5, time_slot: '08:00', activity: 'YÖKDİL Sözlük Kitabı', duration_min: 30, link_url: link('YÖKDİL Sözlük Kitabı') },
      { day_of_week: 6, time_slot: '10:00', activity: 'Genel Tekrar', duration_min: 45, link_url: link('Genel Tekrar') },
    ],
  },
];

export default function ScheduleScreen() {
  const { t } = useLocale();
  const c = useThemeColors();
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);

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

  const applyTemplateMutation = useMutation({
    mutationFn: async ({ templateItems, replace }: { templateItems: ScheduleCreate[]; replace: boolean }) => {
      if (replace && items && items.length > 0) {
        await Promise.all(items.map((it) => scheduleApi.delete(it.id).catch(() => {})));
      }
      for (const it of templateItems) {
        await scheduleApi.create(it).catch(() => {});
      }
    },
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

  const totalItems = (items ?? []).filter((it) => it.is_active !== false).length;
  const activeDays = Array.from(grouped.values()).filter((arr) => arr.length > 0).length;
  const hasItems = !!items && items.length > 0;

  return (
    <ScreenContainer refreshing={isRefetching} onRefresh={refetch}>
      <View style={{ marginBottom: spacing.lg }}>
        <Text style={{ color: c.text, fontSize: 20, fontWeight: '700' }}>{t('scheduleTitle')}</Text>
        {hasItems ? (
          <Text style={{ color: c.textMuted, fontSize: 12, marginTop: 2 }}>
            {t('activeDaysStatsTpl', { days: String(activeDays), items: String(totalItems) })}
          </Text>
        ) : null}

        <View style={styles.actionsRow}>
          {hasItems && (
            <Pressable onPress={() => setSaveTemplateOpen(true)} style={[styles.pillBtn, { backgroundColor: c.warningSoft }]}>
              <Save color={c.warning} size={14} />
              <Text style={{ color: c.warning, fontWeight: '700', fontSize: 12 }}>{t('saveAsTemplateBtn')}</Text>
            </Pressable>
          )}
          <Pressable onPress={() => setTemplatesOpen(true)} style={[styles.pillBtn, { backgroundColor: c.accentSoft }]}>
            <Sparkles color={c.accent} size={14} />
            <Text style={{ color: c.accent, fontWeight: '700', fontSize: 12 }}>{t('templatesBtn')}</Text>
          </Pressable>
          <Pressable onPress={() => setModalOpen(true)} style={[styles.pillBtn, { backgroundColor: c.primary }]}>
            <Plus color="#fff" size={14} />
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>{t('addActivityBtn')}</Text>
          </Pressable>
        </View>
      </View>

      {!isLoading && !hasItems && (
        <View>
          <EmptyState title={t('noScheduleYet')} subtitle={t('noScheduleYetSub')} />
          <View style={[styles.actionsRow, { justifyContent: 'center', marginTop: -spacing.md }]}>
            <Pressable onPress={() => setTemplatesOpen(true)} style={[styles.pillBtn, { backgroundColor: c.accent }]}>
              <Sparkles color="#fff" size={14} />
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>{t('chooseTemplateBtn')}</Text>
            </Pressable>
            <Pressable onPress={() => setModalOpen(true)} style={[styles.pillBtn, styles.pillBtnOutline, { borderColor: c.border }]}>
              <Plus color={c.textSecondary} size={14} />
              <Text style={{ color: c.textSecondary, fontWeight: '700', fontSize: 12 }}>{t('manualAddBtn')}</Text>
            </Pressable>
          </View>
        </View>
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

      <TemplateModal
        visible={templatesOpen}
        hasExisting={hasItems}
        applying={applyTemplateMutation.isPending}
        onApply={(templateItems, replace) => {
          applyTemplateMutation.mutate(
            { templateItems, replace },
            { onSuccess: () => setTemplatesOpen(false) }
          );
        }}
        onClose={() => setTemplatesOpen(false)}
      />

      <SaveTemplateModal
        visible={saveTemplateOpen}
        items={items ?? []}
        onSaved={() => setSaveTemplateOpen(false)}
        onClose={() => setSaveTemplateOpen(false)}
      />
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

// ── Hazır şablon seçici — web'deki TemplateModal'ın mobil karşılığı ──
function TemplateModal({
  visible,
  hasExisting,
  applying,
  onApply,
  onClose,
}: {
  visible: boolean;
  hasExisting: boolean;
  applying: boolean;
  onApply: (items: ScheduleCreate[], replace: boolean) => void;
  onClose: () => void;
}) {
  const { t } = useLocale();
  const c = useThemeColors();
  const [replace, setReplace] = useState(true);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [customTemplates, setCustomTemplates] = useState<ScheduleTemplate[]>([]);
  const [loadingCustom, setLoadingCustom] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setLoadingCustom(true);
    scheduleApi
      .getTemplates()
      .then(setCustomTemplates)
      .catch(() => setCustomTemplates([]))
      .finally(() => setLoadingCustom(false));
  }, [visible]);

  const apply = (id: string, items: ScheduleCreate[]) => {
    setApplyingId(id);
    onApply(items, replace);
  };

  useEffect(() => {
    if (!applying) setApplyingId(null);
  }, [applying]);

  const removeCustom = (tpl: ScheduleTemplate) => {
    Alert.alert(t('deleteTemplateConfirm'), '', [
      { text: t('cancelBtn'), style: 'cancel' },
      {
        text: t('saveBtn'),
        style: 'destructive',
        onPress: async () => {
          setDeletingId(tpl.id);
          try {
            await scheduleApi.deleteTemplate(tpl.id);
            setCustomTemplates((prev) => prev.filter((x) => x.id !== tpl.id));
          } finally {
            setDeletingId(null);
          }
        },
      },
    ]);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <ScrollView style={[styles.modalCard, { backgroundColor: c.surface }]} contentContainerStyle={{ paddingBottom: spacing.xxl }}>
          <View style={styles.templateHeader}>
            <View style={styles.templateHeaderLeft}>
              <View style={[styles.iconBadgeSm, { backgroundColor: c.accentSoft }]}>
                <Sparkles color={c.accent} size={16} />
              </View>
              <Text style={[styles.modalTitle, { color: c.text, marginBottom: 0 }]}>{t('templatesModalTitle')}</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={10}>
              <X color={c.textMuted} size={20} />
            </Pressable>
          </View>

          <Text style={{ color: c.textMuted, fontSize: 13, marginTop: spacing.sm, marginBottom: spacing.md }}>
            {t('templatesModalDesc')}
          </Text>

          {hasExisting && (
            <View style={[styles.replaceRow, { backgroundColor: c.warningSoft, borderColor: c.warningSoft }]}>
              <Switch value={replace} onValueChange={setReplace} trackColor={{ true: c.warning }} />
              <Text style={{ color: c.textSecondary, fontSize: 12, flex: 1 }}>{t('replaceExistingLabel')}</Text>
            </View>
          )}

          {TEMPLATES.map((tpl) => (
            <View key={tpl.id} style={[styles.templateCard, { borderColor: c.border }]}>
              <View style={styles.templateCardRow}>
                <View style={styles.templateCardLeft}>
                  <View style={[styles.iconBadge, { backgroundColor: `${tpl.accent}1a` }]}>{tpl.icon}</View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: c.text, fontWeight: '700', fontSize: 14 }}>{tpl.name}</Text>
                    <Text style={{ color: c.textMuted, fontSize: 11, marginTop: 2 }}>{tpl.desc}</Text>
                    <Text style={{ color: c.textMuted, fontSize: 11, marginTop: 2, opacity: 0.8 }}>
                      {t('perWeekTpl', { n: String(tpl.items.length) })}
                    </Text>
                  </View>
                </View>
                <Pressable
                  disabled={applyingId !== null}
                  onPress={() => apply(tpl.id, tpl.items)}
                  style={[styles.applyBtn, { backgroundColor: tpl.accent, opacity: applyingId !== null ? 0.6 : 1 }]}
                >
                  <Check color="#fff" size={14} />
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>{t('applyBtn')}</Text>
                </Pressable>
              </View>
            </View>
          ))}

          <View style={{ marginTop: spacing.md }}>
            <View style={styles.customHeader}>
              <UserIcon color={c.textMuted} size={14} />
              <Text style={{ color: c.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 }}>
                {t('myTemplatesLabel')}
              </Text>
            </View>

            {loadingCustom ? (
              <Text style={{ color: c.textMuted, fontSize: 13, paddingVertical: spacing.sm }}>{t('loading')}</Text>
            ) : customTemplates.length === 0 ? (
              <Text style={{ color: c.textMuted, fontSize: 12, paddingVertical: spacing.sm }}>{t('noCustomTemplates')}</Text>
            ) : (
              customTemplates.map((tpl) => (
                <View key={tpl.id} style={[styles.templateCard, { borderColor: c.border }]}>
                  <View style={styles.templateCardRow}>
                    <View style={styles.templateCardLeft}>
                      <View style={[styles.iconBadge, { backgroundColor: c.warningSoft }]}>
                        <Star color={c.warning} size={18} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: c.text, fontWeight: '700', fontSize: 14 }}>{tpl.name}</Text>
                        <Text style={{ color: c.textMuted, fontSize: 11, marginTop: 2 }}>
                          {t('perWeekTpl', { n: String(tpl.items.length) })}
                        </Text>
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                      <Pressable
                        disabled={deletingId === tpl.id}
                        onPress={() => removeCustom(tpl)}
                        style={[styles.iconBtnSm, { backgroundColor: c.dangerSoft, opacity: deletingId === tpl.id ? 0.5 : 1 }]}
                      >
                        <Trash2 color={c.danger} size={14} />
                      </Pressable>
                      <Pressable
                        disabled={applyingId !== null}
                        onPress={() => apply(tpl.id, tpl.items)}
                        style={[styles.applyBtn, { backgroundColor: c.warning, opacity: applyingId !== null ? 0.6 : 1 }]}
                      >
                        <Check color="#fff" size={14} />
                        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>{t('applyBtn')}</Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

// ── Şu anki programı şablon olarak kaydet — web'deki SaveTemplateModal'ın
// mobil karşılığı. ──
function SaveTemplateModal({
  visible,
  items,
  onSaved,
  onClose,
}: {
  visible: boolean;
  items: ScheduleItem[];
  onSaved: () => void;
  onClose: () => void;
}) {
  const { t } = useLocale();
  const c = useThemeColors();
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const saveMutation = useMutation({
    mutationFn: () =>
      scheduleApi.createTemplate({
        name: name.trim(),
        items: items
          .filter((it) => it.is_active !== false)
          .map((it) => ({
            day_of_week: it.day_of_week,
            time_slot: it.time_slot,
            activity: it.activity,
            duration_min: it.duration_min,
            link_url: it.link_url,
          })),
      }),
    onSuccess: () => {
      setName('');
      onSaved();
    },
    onError: () => setError(t('saveTemplateFailed')),
  });

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <ScrollView style={[styles.modalCard, { backgroundColor: c.surface }]} contentContainerStyle={{ paddingBottom: spacing.xxl }}>
          <View style={styles.templateHeader}>
            <View style={styles.templateHeaderLeft}>
              <View style={[styles.iconBadgeSm, { backgroundColor: c.warningSoft }]}>
                <Star color={c.warning} size={16} />
              </View>
              <Text style={[styles.modalTitle, { color: c.text, marginBottom: 0 }]}>{t('saveTemplateModalTitle')}</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={10}>
              <X color={c.textMuted} size={20} />
            </Pressable>
          </View>

          <Text style={{ color: c.textMuted, fontSize: 12, marginTop: spacing.sm, marginBottom: spacing.md }}>
            {t('saveTemplateDesc')}
          </Text>

          <TextField
            label={t('templateNameLabel')}
            value={name}
            onChangeText={setName}
            placeholder="örn. Benim Sınav Programım"
            autoFocus
          />

          {error ? <Text style={{ color: c.danger, fontSize: 12, marginBottom: spacing.sm }}>{error}</Text> : null}

          <View style={styles.modalActions}>
            <View style={{ flex: 1 }}>
              <Button title={t('cancelBtn')} variant="ghost" onPress={onClose} />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                title={t('saveBtn')}
                icon={<Save color="#fff" size={16} />}
                loading={saveMutation.isPending}
                onPress={() => {
                  if (!name.trim()) {
                    setError(t('templateNameRequired'));
                    return;
                  }
                  setError('');
                  saveMutation.mutate();
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
  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  pillBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.full },
  pillBtnOutline: { borderWidth: 1.5, backgroundColor: 'transparent' },
  itemCard: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm, paddingVertical: spacing.md },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard: { borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg, maxHeight: '85%' },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: spacing.md },
  modalActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  templateHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  templateHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconBadgeSm: { width: 32, height: 32, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  iconBadge: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  iconBtnSm: { width: 32, height: 32, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  replaceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderRadius: radius.lg, borderWidth: 1, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, marginBottom: spacing.md },
  templateCard: { borderWidth: 1, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm },
  templateCardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  templateCardLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  applyBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.sm, paddingVertical: spacing.sm, borderRadius: radius.md },
  customHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.sm },
});
