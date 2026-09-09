// src/app/(app)/exam-grammar.tsx — Sınav Hazırlık: Gramer Rehberi liste ekranı.
// Sınav Hazırlık İstatistik & İçerik Motoru, madde #2'nin bir parçası olarak
// eklendi (bkz. supabase/migrations/027_grammar_reference.sql,
// backend/app/api/routes/grammar.py). Kategorilere göre gruplanmış konu
// listesi; her satır exam-grammar-detail.tsx'e slug parametresiyle gider
// (bkz. user-profile.tsx'teki useLocalSearchParams deseni).
import React from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ChevronRight } from 'lucide-react-native';
import { useLocale } from '@/i18n';
import { grammarApi } from '@/api/grammar';
import type { GrammarCategory, GrammarTopicSummary } from '@/api/types';
import { useThemeColors } from '@/hooks/useThemeColors';
import { spacing } from '@/constants/theme';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Card } from '@/components/ui/Card';

export default function ExamGrammarScreen() {
  const { et } = useLocale();
  const c = useThemeColors();

  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ['grammar-categories'],
    queryFn: grammarApi.listCategories,
  });
  const { data: topics, isLoading: topicsLoading } = useQuery({
    queryKey: ['grammar-topics'],
    queryFn: grammarApi.listTopics,
  });

  const loading = categoriesLoading || topicsLoading;

  const topicsByCategory: Record<string, GrammarTopicSummary[]> = {};
  (topics ?? []).forEach((topic) => {
    if (!topicsByCategory[topic.category_id]) topicsByCategory[topic.category_id] = [];
    topicsByCategory[topic.category_id].push(topic);
  });

  const orderedCategories: GrammarCategory[] = [...(categories ?? [])].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <ScreenContainer>
      <Pressable onPress={() => router.back()} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}>
        <ArrowLeft color={c.textSecondary} size={18} />
        <Text style={{ color: c.textSecondary, marginLeft: spacing.xs, fontSize: 14, fontWeight: '600' }}>{et.backBtn}</Text>
      </Pressable>

      <Text style={{ fontSize: 20, fontWeight: '700', color: c.text }}>{et.grammarListTitle}</Text>
      <Text style={{ fontSize: 14, marginTop: spacing.xs, lineHeight: 20, color: c.textSecondary }}>
        {et.grammarListSubtitle}
      </Text>

      {loading ? (
        <View style={{ marginTop: spacing.xxl, alignItems: 'center' }}>
          <ActivityIndicator color={c.primary} />
        </View>
      ) : (
        <View style={{ marginTop: spacing.lg, gap: spacing.lg }}>
          {orderedCategories.map((category) => {
            const categoryTopics = (topicsByCategory[category.id] ?? []).sort((a, b) => a.sort_order - b.sort_order);
            return (
              <View key={category.id}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: c.textSecondary, marginBottom: spacing.sm, textTransform: 'uppercase' }}>
                  {category.name_tr}
                </Text>
                {categoryTopics.length === 0 ? (
                  <Card>
                    <Text style={{ color: c.textMuted, fontSize: 13 }}>{et.grammarEmptyState}</Text>
                  </Card>
                ) : (
                  <View style={{ gap: spacing.sm }}>
                    {categoryTopics.map((topic) => (
                      <Pressable
                        key={topic.id}
                        onPress={() => router.push({ pathname: '/(app)/exam-grammar-detail', params: { slug: topic.slug } })}
                      >
                        <Card style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md }}>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 15, fontWeight: '600', color: c.text }}>{topic.title_tr}</Text>
                            <Text style={{ fontSize: 13, marginTop: 2, color: c.textSecondary }} numberOfLines={2}>
                              {topic.summary_tr}
                            </Text>
                          </View>
                          <ChevronRight color={c.textMuted} size={18} />
                        </Card>
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>
            );
          })}
        </View>
      )}
    </ScreenContainer>
  );
}
