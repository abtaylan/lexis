import React, { useMemo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
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
import { radius, spacing } from '@/constants/theme';
import { ScreenContainer } from '@/components/ui/ScreenContainer';

// ── Görev haritası v2 — web'deki app/(app)/quests/page.tsx'in mobil
// karşılığı (bkz. o dosyanın üst yorumu — aynı gerekçe, aynı content_type
// sözleşmesi). Dikey "yol" görseli KORUNDU, üzerine dünya/bölüm başlıkları
// ve içerik-türü ikonları + content_type bazlı dokununca-git yönlendirmesi
// eklendi.
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

export default function QuestsScreen() {
  const { locale } = useLocale();
  const c = useThemeColors();
  const t = QUESTS_STRINGS[locale] ?? QUESTS_STRINGS.tr;

  const query = useQuery({ queryKey: ['quests-list'], queryFn: questsApi.list });
  const items = query.data?.items ?? [];
  const worlds = useMemo(() => groupByWorldAndPart(items, locale), [items, locale]);

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

      {worlds.map((world) => (
        <View key={world.key} style={{ marginTop: spacing.lg }}>
          {!!world.title && (
            <View style={styles.worldHeaderRow}>
              <View style={[styles.worldIcon, { backgroundColor: c.accentSoft }]}>
                <Flag color={c.accent} size={14} />
              </View>
              <Text style={{ color: c.text, fontSize: 14, fontWeight: '700' }}>{world.title}</Text>
            </View>
          )}

          {world.parts.map((part) => (
            <View key={part.key} style={{ marginTop: spacing.sm }}>
              {!!part.title && (
                <Text style={[styles.partLabel, { color: c.textMuted }]}>{part.title}</Text>
              )}

              {part.nodes.map((node, idx) => {
                const isLastOverall = world === worlds[worlds.length - 1]
                  && part === world.parts[world.parts.length - 1]
                  && idx === part.nodes.length - 1;
                const pct = node.requirement_count > 0
                  ? Math.min(100, Math.round((node.current_value / node.requirement_count) * 100))
                  : 0;
                const title = localizedTitle(node, locale);
                const description = localizedDescription(node, locale);
                const Icon = CONTENT_ICONS[node.content_type] ?? Star;
                const clickable = node.is_unlocked && !node.is_completed && hasTarget(node.content_type);

                const nodeCircleStyle = node.is_completed
                  ? { backgroundColor: c.success, borderColor: c.success }
                  : node.is_unlocked
                    ? { backgroundColor: c.surface, borderColor: c.accent }
                    : { backgroundColor: c.background, borderColor: c.border };

                return (
                  <View key={node.id} style={styles.itemRow}>
                    <View style={styles.trackCol}>
                      <View style={[styles.nodeCircle, nodeCircleStyle]}>
                        {node.is_completed ? (
                          <Check color="#fff" size={18} />
                        ) : node.is_unlocked ? (
                          <Icon color={c.accent} size={15} />
                        ) : (
                          <Lock color={c.textMuted} size={15} />
                        )}
                      </View>
                      {!isLastOverall && (
                        <View style={[styles.connector, { backgroundColor: node.is_completed ? c.success : c.border }]} />
                      )}
                    </View>

                    <Pressable
                      onPress={() => clickable && openNode(node)}
                      disabled={!clickable}
                      style={[
                        styles.card,
                        {
                          backgroundColor: node.is_unlocked ? c.surface : c.background,
                          borderColor: c.border,
                          opacity: node.is_unlocked ? 1 : 0.6,
                        },
                      ]}
                    >
                      <View style={styles.cardHeaderRow}>
                        <Text style={{ color: c.text, fontSize: 14, fontWeight: '700', flex: 1 }} numberOfLines={2}>
                          {title}
                        </Text>
                        {node.is_completed && (
                          <Text style={{ color: c.success, fontSize: 11, fontWeight: '700' }}>{t.completedLabel}</Text>
                        )}
                        {!node.is_unlocked && (
                          <Text style={{ color: c.textMuted, fontSize: 11, fontWeight: '700' }}>{t.lockedLabel}</Text>
                        )}
                        {clickable && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 1 }}>
                            <Text style={{ color: c.accent, fontSize: 11, fontWeight: '700' }}>
                              {node.current_value > 0 ? t.continueBtn : t.startBtn}
                            </Text>
                            <ChevronRight color={c.accent} size={13} />
                          </View>
                        )}
                      </View>

                      {description ? (
                        <Text style={{ color: c.textMuted, fontSize: 12, marginTop: 2 }}>{description}</Text>
                      ) : null}

                      {node.is_unlocked && (
                        <>
                          <View style={[styles.progressTrack, { backgroundColor: c.background }]}>
                            <View
                              style={[
                                styles.progressFill,
                                { backgroundColor: node.is_completed ? c.success : c.accent, width: `${node.is_completed ? 100 : pct}%` },
                              ]}
                            />
                          </View>
                          <Text style={{ color: c.textMuted, fontSize: 11, marginTop: 4 }}>
                            {Math.min(node.current_value, node.requirement_count)} / {node.requirement_count}
                          </Text>
                        </>
                      )}

                      {(node.reward_xp > 0 || node.reward_badge_code) && (
                        <View style={[styles.rewardRow, { borderTopColor: c.border }]}>
                          <Text style={{ color: c.textMuted, fontSize: 11 }}>{t.rewardLabel}:</Text>
                          {node.reward_xp > 0 && (
                            <Text style={{ color: c.amber, fontSize: 11, fontWeight: '700' }}>+{node.reward_xp} XP</Text>
                          )}
                          {node.reward_badge_code && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                              <Award color={c.primary} size={12} />
                              <Text style={{ color: c.primary, fontSize: 11, fontWeight: '700' }}>{t.badgeRewardLabel}</Text>
                            </View>
                          )}
                        </View>
                      )}
                    </Pressable>
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      ))}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  headerIcon: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  worldHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.sm },
  worldIcon: { width: 26, height: 26, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  partLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: spacing.xs, marginLeft: 2 },
  itemRow: { flexDirection: 'row', gap: spacing.sm },
  trackCol: { alignItems: 'center' },
  nodeCircle: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  connector: { width: 2, flex: 1, minHeight: 20, marginTop: 4 },
  card: { flex: 1, marginBottom: spacing.sm, borderRadius: radius.lg, borderWidth: 1, padding: spacing.md },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.xs },
  progressTrack: { height: 6, borderRadius: 3, overflow: 'hidden', marginTop: spacing.sm },
  progressFill: { height: '100%', borderRadius: 3 },
  rewardRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1 },
});
