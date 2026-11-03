// src/components/LevelGoalCard.tsx
//
// Kullanıcı isteği (3 Kasım 2026): Ana sayfada "ana seviye durumumuz ->
// ulaşmak istediğimiz seviye" arasında yüzdesel bir ilerleme göstergesi.
// Veri: GET/PATCH /me/level-goal (bkz. backend/app/services/
// level_goal_service.py). StudyProgramCard ile AYNI görsel dil
// (Card/Bar/pillBtn deseni, bkz. o dosya) — web/src/components/study/
// LevelGoalCard.tsx ile aynı mantık, RN'e uyarlanmış.
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Locale } from '@/i18n/locales';
import type { LevelGoal } from '@/api/levelGoal';
import { useThemeColors } from '@/hooks/useThemeColors';
import { radius, spacing } from '@/constants/theme';
import { Card } from '@/components/ui/Card';
import { Bar } from '@/components/StudyProgramCard';

type ThemeColors = ReturnType<typeof useThemeColors>;

const CEFR_ORDER = ['a1', 'a2', 'b1', 'b2', 'c1', 'c2'];

type Strings = {
  title: string;
  subtitle: string;
  stepsTpl: string;
  examLabel: string;
  gameLabel: string;
  programLabel: string;
  changeTarget: string;
  needsTargetTitle: string;
  needsTargetDesc: string;
  setCta: string;
  saving: string;
  reachedTpl: string;
};

const STRINGS: Partial<Record<Locale, Strings>> = {
  tr: {
    title: 'Hedefine Giden Yol',
    subtitle: 'Haftalık sınavlar, oyun puanları ve çalışma programına göre',
    stepsTpl: '{done}/{total} kademe geçildi',
    examLabel: 'Seviye sınavı',
    gameLabel: 'Oyun puanları',
    programLabel: 'Çalışma programı',
    changeTarget: 'Hedefi değiştir',
    needsTargetTitle: 'Bir hedef seviye belirle',
    needsTargetDesc: 'Ulaşmak istediğin seviyeyi seç, ilerlemeni yüzdesel olarak takip edelim.',
    setCta: 'Hedefi Belirle',
    saving: 'Kaydediliyor…',
    reachedTpl: 'Hedefine ulaştın! 🎉',
  },
  en: {
    title: 'Road to Your Goal',
    subtitle: 'Based on weekly exams, game scores and your study program',
    stepsTpl: '{done}/{total} levels climbed',
    examLabel: 'Level exam',
    gameLabel: 'Game scores',
    programLabel: 'Study program',
    changeTarget: 'Change goal',
    needsTargetTitle: 'Set a goal level',
    needsTargetDesc: 'Pick the level you want to reach and we’ll track your progress as a percentage.',
    setCta: 'Set Goal',
    saving: 'Saving…',
    reachedTpl: 'You reached your goal! 🎉',
  },
};

const CEFR_NAMES: Partial<Record<Locale, Record<string, string>>> = {
  tr: { a1: 'Başlangıç', a2: 'Temel', b1: 'Orta', b2: 'Orta-Üstü', c1: 'İleri', c2: 'Uzman' },
  en: { a1: 'Beginner', a2: 'Elementary', b1: 'Intermediate', b2: 'Upper-Int.', c1: 'Advanced', c2: 'Proficient' },
};

function fill(tpl: string, vars: Record<string, string | number>): string {
  return Object.entries(vars).reduce((acc, [k, v]) => acc.replace(`{${k}}`, String(v)), tpl);
}

function MiniRow({ label, pct, color, c }: { label: string; pct: number; color: string; c: ThemeColors }) {
  return (
    <View style={{ marginTop: spacing.xs }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
        <Text style={{ fontSize: 11, color: c.textMuted }}>{label}</Text>
        <Text style={{ fontSize: 11, color: c.textMuted }}>%{pct}</Text>
      </View>
      <Bar value={pct} max={100} color={color} c={c} />
    </View>
  );
}

export function LevelGoalCard({
  goal,
  locale,
  onSetTarget,
  settingTarget,
}: {
  goal: LevelGoal;
  locale: Locale;
  onSetTarget: (targetLevel: string) => void;
  settingTarget?: boolean;
}) {
  const c = useThemeColors();
  const s = STRINGS[locale] ?? STRINGS.tr!;
  const names = CEFR_NAMES[locale] ?? CEFR_NAMES.tr!;
  const currentIdx = goal.current_level ? CEFR_ORDER.indexOf(goal.current_level) : -1;
  const [picked, setPicked] = useState(goal.target_level ?? goal.suggested_target_level ?? '');
  const [showPicker, setShowPicker] = useState(false);

  if (!goal.available) return null;

  if (goal.needs_target || showPicker) {
    const options = CEFR_ORDER.filter((_, i) => i > currentIdx);
    return (
      <Card style={{ marginTop: spacing.sm }}>
        <Text style={{ fontSize: 15, fontWeight: '700', color: c.text }}>{s.needsTargetTitle}</Text>
        <Text style={{ fontSize: 12, color: c.textMuted, marginTop: 2 }}>{s.needsTargetDesc}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.sm }}>
          {options.map((lvl) => (
            <Pressable
              key={lvl}
              onPress={() => setPicked(lvl)}
              style={[
                styles.levelChip,
                { borderColor: picked === lvl ? c.primary : c.border, backgroundColor: picked === lvl ? c.primarySoft : 'transparent' },
              ]}
            >
              <Text style={{ fontSize: 12, fontWeight: '700', color: picked === lvl ? c.primary : c.text }}>
                {lvl.toUpperCase()} · {names[lvl]}
              </Text>
            </Pressable>
          ))}
        </View>
        <Pressable
          disabled={!picked || settingTarget}
          onPress={() => {
            if (picked) {
              onSetTarget(picked);
              setShowPicker(false);
            }
          }}
          style={[styles.setCta, { backgroundColor: c.primary, opacity: !picked || settingTarget ? 0.5 : 1 }]}
        >
          <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>{settingTarget ? s.saving : s.setCta}</Text>
        </Pressable>
      </Card>
    );
  }

  const percent = goal.percent ?? 0;
  const reached = percent >= 100;
  const b = goal.breakdown;

  return (
    <Card style={{ marginTop: spacing.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: c.text }}>{s.title}</Text>
          <Text style={{ fontSize: 12, color: c.textMuted, marginTop: 2 }}>{s.subtitle}</Text>
        </View>
        <Text style={{ fontSize: 20, fontWeight: '800', color: reached ? c.success : c.primary }}>%{percent}</Text>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm }}>
        <View style={[styles.levelBadge, { backgroundColor: c.primarySoft }]}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: c.primary }}>{goal.current_level?.toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Bar value={percent} max={100} color={reached ? c.success : c.primary} c={c} />
        </View>
        <View style={[styles.levelBadge, { backgroundColor: c.warningSoft }]}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: c.warning }}>{goal.target_level?.toUpperCase()}</Text>
        </View>
      </View>
      <Text style={{ fontSize: 12, color: c.textMuted, marginTop: 6 }}>
        {reached ? s.reachedTpl : fill(s.stepsTpl, { done: goal.completed_steps ?? 0, total: goal.total_steps ?? 1 })}
      </Text>

      {!!b && !reached && (
        <View style={{ marginTop: spacing.xs }}>
          <MiniRow label={s.examLabel} pct={b.exam_accuracy_pct} color={c.primary} c={c} />
          <MiniRow label={s.gameLabel} pct={b.game_score_pct} color={c.warning} c={c} />
          <MiniRow label={s.programLabel} pct={b.study_program_pct} color={c.success} c={c} />
        </View>
      )}

      <Pressable onPress={() => setShowPicker(true)} style={{ marginTop: spacing.sm }}>
        <Text style={{ fontSize: 11, fontWeight: '600', color: c.textMuted }}>{s.changeTarget}</Text>
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  levelBadge: { borderRadius: 999, paddingHorizontal: spacing.sm, paddingVertical: 4 },
  levelChip: { borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 6 },
  setCta: { marginTop: spacing.sm, borderRadius: radius.md, paddingVertical: 10, alignItems: 'center' },
});
