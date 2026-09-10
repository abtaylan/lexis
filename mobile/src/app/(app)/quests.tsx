import React, { useEffect, useMemo, useRef } from 'react';
import { ActivityIndicator, Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  Map, Check, Lock, Star, Award, Gamepad2, Layers, BookOpen, FileQuestion, Timer, Swords, Flag, ChevronRight,
} from 'lucide-react-native';
import { questsApi } from '@/api/quests';
import type { QuestNodeItem } from '@/api/types';
import { QUESTS_STRINGS } from '@/i18n/questsStrings';
import { useLocale, type Locale } from '@/i18n';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useThemeMode } from '@/store/theme';
import { radius, spacing } from '@/constants/theme';
import { ScreenContainer } from '@/components/ui/ScreenContainer';

// ── Görev haritası v3 — web'deki app/(app)/quests/page.tsx'in mobil
// karşılığı (bkz. o dosyanın üst yorumu — aynı gerekçe, aynı content_type
// sözleşmesi, aynı WORLD_THEMES/ROW_H/AMPLITUDE sabitleri — görsel dil iki
// platformda TUTARLI olsun diye). Dikey düz liste yerine, her bölüm kendi
// react-native-svg şeridinde yılankavi (zigzag) bir patika üzerinde
// dizilir; "şu an buradasın" düğümü Animated.loop ile nabız alır. RN'de
// SVG stroke uzunluğunu güvenilir ölçmek zor olduğu için patika ÇİZİLEREK
// belirme animasyonu web'e göre basitleştirildi (statik render) — asıl
// görsel/renk/rozet sistemi birebir aynı.
function localizedTitle(node: QuestNodeItem, locale: Locale): string {
  return locale === 'tr' ? node.title_tr : node.title_en;
}
function localizedDescription(node: QuestNodeItem, locale: Locale): string | undefined {
  return (locale === 'tr' ? node.description_tr : node.description_en) ?? undefined;
}
function localizedWorldTitle(node: QuestNodeItem, locale: Locale): string | undefined {
  return (locale === 'tr' ? node.world_title_tr : node.world_title_en) ?? node.world_title_tr ?? undefined;
}
function localizedPartTitle(node: QuestNodeItem, locale: Locale): string | undefined {
  return (locale === 'tr' ? node.part_title_tr : node.part_title_en) ?? node.part_title_tr ?? undefined;
}

const CONTENT_ICONS: Record<string, typeof Star> = {
  aggregate: Star,
  game: Gamepad2,
  flashcard: Layers,
  grammar_topic: BookOpen,
  quiz: FileQuestion,
  question_practice: Timer,
  duel: Swords,
};

// content_type + content_ref -> route.push hedefi (bkz. web'deki resolveHref
// ile aynı sözleşme; her hedef zaten var olan bir derin-bağlantı parametresi
// kullanıyor — game.tsx'teki mode, exam-prep.tsx'teki examType/sessionMode).
function openNode(node: QuestNodeItem) {
  const ref = node.content_ref ?? {};
  switch (node.content_type) {
    case 'game':
      router.push({ pathname: '/(app)/game', params: typeof ref.game_mode === 'string' ? { mode: ref.game_mode as string } : {} });
      return;
    case 'flashcard':
      router.push('/(app)/flashcards');
      return;
    case 'grammar_topic':
      if (typeof ref.grammar_topic_slug === 'string') {
        router.push({ pathname: '/(app)/exam-grammar-detail', params: { slug: ref.grammar_topic_slug as string } });
      } else {
        router.push('/(app)/exam-grammar');
      }
      return;
    case 'quiz':
      router.push({
        pathname: '/(app)/exam-prep',
        params: typeof ref.exam_type === 'string' ? { examType: ref.exam_type as string, sessionMode: 'practice' } : {},
      });
      return;
    case 'question_practice':
      router.push({
        pathname: '/(app)/exam-prep',
        params: typeof ref.exam_type === 'string' ? { examType: ref.exam_type as string, sessionMode: 'timed_mock' } : {},
      });
      return;
    case 'duel':
      router.push('/(app)/duels');
      return;
    default:
      // 'aggregate' -- tıklanabilir bir hedefi yok
      return;
  }
}

function hasTarget(contentType: string): boolean {
  return contentType !== 'aggregate';
}

type WorldGroup = {
  key: string;
  title: string;
  parts: { key: string; title: string | undefined; nodes: QuestNodeItem[] }[];
};

function groupByWorldAndPart(items: QuestNodeItem[], locale: Locale): WorldGroup[] {
  const groups: WorldGroup[] = [];
  for (const node of items) {
    const worldKey = node.world_slug ?? '__default';
    const worldTitle = localizedWorldTitle(node, locale) ?? '';
    const partKey = `${worldKey}:${node.part_index ?? 0}`;
    const partTitle = localizedPartTitle(node, locale);

    let group = groups[groups.length - 1];
    if (!group || group.key !== worldKey) {
      group = { key: worldKey, title: worldTitle, parts: [] };
      groups.push(group);
    }
    let part = group.parts[group.parts.length - 1];
    if (!part || part.key !== partKey) {
      part = { key: partKey, title: partTitle, nodes: [] };
      group.parts.push(part);
    }
    part.nodes.push(node);
  }
  return groups;
}

// ── Görsel patika motoru (bkz. web/src/app/(app)/quests/page.tsx —
// aynı sabitler/formüller, iki platform arası görsel tutarlılık için). ──

type WorldTheme = { accent: string; accentDark: string; soft: string; softDark: string };

const WORLD_THEMES: WorldTheme[] = [
  { accent: '#10b981', accentDark: '#34d399', soft: '#ecfdf5', softDark: 'rgba(16,185,129,0.14)' },
  { accent: '#8b5cf6', accentDark: '#a78bfa', soft: '#f5f3ff', softDark: 'rgba(139,92,246,0.14)' },
  { accent: '#f59e0b', accentDark: '#fbbf24', soft: '#fffbeb', softDark: 'rgba(245,158,11,0.14)' },
  { accent: '#f43f5e', accentDark: '#fb7185', soft: '#fff1f2', softDark: 'rgba(244,63,94,0.14)' },
  { accent: '#0ea5e9', accentDark: '#38bdf8', soft: '#f0f9ff', softDark: 'rgba(14,165,233,0.14)' },
  { accent: '#6366f1', accentDark: '#818cf8', soft: '#eef2ff', softDark: 'rgba(99,102,241,0.14)' },
  { accent: '#14b8a6', accentDark: '#2dd4bf', soft: '#f0fdfa', softDark: 'rgba(20,184,166,0.14)' },
  { accent: '#d946ef', accentDark: '#e879f9', soft: '#fdf4ff', softDark: 'rgba(217,70,239,0.14)' },
];

const ROW_H = 118;
const WRAPPER_W = 300;
const CENTER_X = WRAPPER_W / 2;
const AMPLITUDE = 92;
const NODE_SIZE = 52;

function nodeOffsetX(globalIdx: number): number {
  const phase = globalIdx % 4;
  if (phase === 1) return AMPLITUDE;
  if (phase === 3) return -AMPLITUDE;
  return 0;
}

type Point = { x: number; y: number };

function buildSmoothPath(points: Point[]): string {
  if (points.length < 2) return '';
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const p0 = points[i - 1];
    const p1 = points[i];
    const midY = (p0.y + p1.y) / 2;
    d += ` C ${p0.x} ${midY}, ${p1.x} ${midY}, ${p1.x} ${p1.y}`;
  }
  return d;
}

function computeWorldLayout(world: WorldGroup): { partPoints: Point[][]; completed: number; total: number } {
  let idx = 0;
  let completed = 0;
  const partPoints: Point[][] = [];
  for (const part of world.parts) {
    const pts = part.nodes.map((node, i) => {
      const p: Point = { x: CENTER_X + nodeOffsetX(idx), y: i * ROW_H + ROW_H / 2 };
      idx += 1;
      if (node.is_completed) completed += 1;
      return p;
    });
    partPoints.push(pts);
  }
  const total = world.parts.reduce((acc, p) => acc + p.nodes.length, 0);
  return { partPoints, completed, total };
}

// "Şu an buradasın" düğümü için sonsuz nabız animasyonu.
function PulseRing({ color }: { color: string }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(anim, { toValue: 1, duration: 2200, easing: Easing.out(Easing.ease), useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);

  const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.55] });
  const opacity = anim.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.55, 0.35, 0] });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        { borderRadius: 999, backgroundColor: color, transform: [{ scale }], opacity },
      ]}
    />
  );
}

export default function QuestsScreen() {
  const { locale } = useLocale();
  const c = useThemeColors();
  const { scheme } = useThemeMode();
  const t = QUESTS_STRINGS[locale] ?? QUESTS_STRINGS.tr;

  const query = useQuery({ queryKey: ['quests-list'], queryFn: questsApi.list });
  const items = query.data?.items ?? [];
  const worlds = useMemo(() => groupByWorldAndPart(items, locale), [items, locale]);

  const worldsWithLayout = useMemo(
    () => worlds.map((world, i) => ({
      world,
      layout: computeWorldLayout(world),
      theme: WORLD_THEMES[i % WORLD_THEMES.length],
    })),
    [worlds],
  );

  const currentNodeId = useMemo(() => {
    for (const world of worlds) {
      for (const part of world.parts) {
        for (const node of part.nodes) {
          if (node.is_unlocked && !node.is_completed) return node.id;
        }
      }
    }
    return null;
  }, [worlds]);

  return (
    <ScreenContainer refreshing={query.isRefetching} onRefresh={query.refetch}>
      <View style={styles.headerRow}>
        <View style={[styles.headerIcon, { backgroundColor: c.accentSoft }]}>
          <Map color={c.accent} size={20} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: c.text, fontSize: 18, fontWeight: '700' }}>{t.title}</Text>
          <Text style={{ color: c.textMuted, fontSize: 12, marginTop: 1 }}>{t.subtitle}</Text>
        </View>
      </View>

      {query.isLoading && (
        <View style={{ alignItems: 'center', paddingVertical: spacing.xl }}>
          <ActivityIndicator color={c.accent} />
        </View>
      )}
      {query.isError && (
        <Text style={{ color: c.danger, fontSize: 13, textAlign: 'center', paddingVertical: spacing.lg }}>{t.error}</Text>
      )}
      {!query.isLoading && !query.isError && items.length === 0 && (
        <Text style={{ color: c.textMuted, fontSize: 13, textAlign: 'center', paddingVertical: spacing.lg }}>{t.empty}</Text>
      )}

      {worldsWithLayout.map(({ world, layout, theme }) => {
        const accent = scheme === 'dark' ? theme.accentDark : theme.accent;
        const soft = scheme === 'dark' ? theme.softDark : theme.soft;

        return (
          <View key={world.key} style={[styles.worldPanel, { backgroundColor: soft, marginTop: spacing.lg }]}>
            <View style={styles.worldHeaderRow}>
              <View style={[styles.worldIcon, { backgroundColor: accent }]}>
                <Flag color="#fff" size={14} />
              </View>
              <Text style={{ color: c.text, fontSize: 14, fontWeight: '700', flex: 1 }}>{world.title}</Text>
              {layout.total > 0 && (
                <Text style={{ color: accent, fontSize: 11, fontWeight: '700' }}>{layout.completed}/{layout.total}</Text>
              )}
            </View>

            {world.parts.map((part, partIdx) => {
              const pts = layout.partPoints[partIdx];
              const lastCompletedIdx = part.nodes.reduce((acc, n, i) => (n.is_completed ? i : acc), -1);
              const greyD = buildSmoothPath(pts);
              const coloredD = lastCompletedIdx >= 0 ? buildSmoothPath(pts.slice(0, lastCompletedIdx + 1)) : '';
              const partHeight = part.nodes.length * ROW_H;

              return (
                <View key={part.key} style={{ marginTop: spacing.xs }}>
                  {!!part.title && (
                    <View style={styles.partLabelWrap}>
                      <View style={[styles.partLabelPill, { borderColor: accent, backgroundColor: c.surface }]}>
                        <Text style={[styles.partLabel, { color: accent }]}>{part.title}</Text>
                      </View>
                    </View>
                  )}

                  <View style={{ width: WRAPPER_W, height: partHeight, alignSelf: 'center' }}>
                    {pts.length > 1 && (
                      <Svg width={WRAPPER_W} height={partHeight} style={StyleSheet.absoluteFill}>
                        {!!greyD && <Path d={greyD} fill="none" stroke={c.border} strokeWidth={5} strokeLinecap="round" strokeDasharray="1 13" />}
                        {!!coloredD && <Path d={coloredD} fill="none" stroke={accent} strokeWidth={5} strokeLinecap="round" />}
                      </Svg>
                    )}

                    {part.nodes.map((node, i) => {
                      const { x, y } = pts[i];
                      const title = localizedTitle(node, locale);
                      const description = localizedDescription(node, locale);
                      const Icon = CONTENT_ICONS[node.content_type] ?? Star;
                      const clickable = node.is_unlocked && !node.is_completed && hasTarget(node.content_type);
                      const isCurrent = node.id === currentNodeId;

                      const nodeCircleStyle = node.is_completed
                        ? { backgroundColor: accent, borderColor: accent }
                        : node.is_unlocked
                          ? { backgroundColor: c.surface, borderColor: accent }
                          : { backgroundColor: c.background, borderColor: c.border };

                      return (
                        <View key={node.id} style={{ position: 'absolute', left: x - NODE_SIZE / 2, top: y - NODE_SIZE / 2 }}>
                          {isCurrent && <PulseRing color={accent} />}
                          <Pressable
                            onPress={() => clickable && openNode(node)}
                            disabled={!clickable}
                            style={[styles.nodeCircle, nodeCircleStyle, { width: NODE_SIZE, height: NODE_SIZE, borderRadius: NODE_SIZE / 2 }]}
                          >
                            {node.is_completed ? (
                              <Check color="#fff" size={22} />
                            ) : node.is_unlocked ? (
                              <Icon color={accent} size={19} />
                            ) : (
                              <Lock color={c.textMuted} size={16} />
                            )}
                            {!!node.reward_badge_code && (
                              <View style={[styles.badgeRibbon, { borderColor: c.surface }]}>
                                <Award color="#fff" size={9} />
                              </View>
                            )}
                          </Pressable>

                          <View style={{ width: 136, marginLeft: (NODE_SIZE - 136) / 2, marginTop: spacing.xs, alignItems: 'center' }}>
                            <Text
                              numberOfLines={1}
                              style={{ color: node.is_unlocked ? c.text : c.textMuted, fontSize: 11, fontWeight: '700', textAlign: 'center' }}
                            >
                              {title}
                            </Text>
                            {node.is_unlocked && !!description && (
                              <Text numberOfLines={1} style={{ color: c.textMuted, fontSize: 10, textAlign: 'center', marginTop: 1 }}>
                                {description}
                              </Text>
                            )}
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
                              {node.is_completed && (
                                <Text style={{ color: c.success, fontSize: 10, fontWeight: '700' }}>{t.completedLabel}</Text>
                              )}
                              {!node.is_unlocked && (
                                <Text style={{ color: c.textMuted, fontSize: 10, fontWeight: '700' }}>{t.lockedLabel}</Text>
                              )}
                              {clickable && (
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 1 }}>
                                  <Text style={{ color: accent, fontSize: 10, fontWeight: '700' }}>
                                    {node.current_value > 0 ? t.continueBtn : t.startBtn}
                                  </Text>
                                  <ChevronRight color={accent} size={11} />
                                  {node.requirement_count > 1 && (
                                    <Text style={{ color: c.textMuted, fontSize: 10 }}>
                                      ({Math.min(node.current_value, node.requirement_count)}/{node.requirement_count})
                                    </Text>
                                  )}
                                </View>
                              )}
                            </View>
                            {(node.reward_xp > 0 || !!node.reward_badge_code) && (
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 1 }}>
                                {node.reward_xp > 0 && (
                                  <Text style={{ color: c.amber, fontSize: 9.5, fontWeight: '700' }}>+{node.reward_xp} XP</Text>
                                )}
                                {!!node.reward_badge_code && (
                                  <Text style={{ color: c.primary, fontSize: 9.5, fontWeight: '700' }}>{t.badgeRewardLabel}</Text>
                                )}
                              </View>
                            )}
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </View>
              );
            })}
          </View>
        );
      })}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  headerIcon: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  worldPanel: { borderRadius: 24, padding: spacing.md, paddingBottom: spacing.lg },
  worldHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.xs },
  worldIcon: { width: 26, height: 26, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  partLabelWrap: { alignItems: 'center', marginVertical: spacing.sm },
  partLabelPill: { borderWidth: 1, borderRadius: 999, paddingHorizontal: spacing.sm, paddingVertical: 3 },
  partLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },
  nodeCircle: { borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  badgeRibbon: {
    position: 'absolute', top: -2, right: -2, width: 18, height: 18, borderRadius: 9,
    backgroundColor: '#f59e0b', alignItems: 'center', justifyContent: 'center', borderWidth: 2,
  },
});
