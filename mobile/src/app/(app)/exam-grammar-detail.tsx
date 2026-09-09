// src/app/(app)/exam-grammar-detail.tsx — Sınav Hazırlık: Gramer Rehberi konu detayı.
// Kural açıklaması + örnek cümleler + Türkçe konuşanlara özgü sık hatalar.
// slug parametresi router.push({ params: { slug } }) ile geliyor (bkz.
// exam-grammar.tsx ve user-profile.tsx'teki useLocalSearchParams deseni).
import React from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle2, XCircle } from 'lucide-react-native';
import { useLocale } from '@/i18n';
import { grammarApi } from '@/api/grammar';
import { useThemeColors } from '@/hooks/useThemeColors';
import { radius, spacing } from '@/constants/theme';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function ExamGrammarDetailScreen() {
  const { slug: slugParam } = useLocalSearchParams<{ slug: string }>();
  const slug = typeof slugParam === 'string' ? slugParam : '';
  const { et } = useLocale();
  const c = useThemeColors();

  const { data: topic, isLoading, isError } = useQuery({
    queryKey: ['grammar-topic', slug],
    queryFn: () => grammarApi.getTopic(slug),
    enabled: !!slug,
  });

  const paragraphs = (topic?.rule_content_md ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  return (
    <ScreenContainer>
      <Pressable onPress={() => router.back()} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}>
        <ArrowLeft color={c.textSecondary} size={18} />
        <Text style={{ color: c.textSecondary, marginLeft: spacing.xs, fontSize: 14, fontWeight: '600' }}>{et.backBtn}</Text>
      </Pressable>

      {isLoading ? (
        <View style={{ marginTop: spacing.xxl, alignItems: 'center' }}>
          <ActivityIndicator color={c.primary} />
        </View>
      ) : isError || !topic ? (
        <Text style={{ color: c.danger, marginTop: spacing.lg }}>{et.genericError}</Text>
      ) : (
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' }}>
            {topic.exam_relevance.map((tag) => (
              <View
                key={tag}
                style={{
                  paddingHorizontal: spacing.sm,
                  paddingVertical: 4,
                  borderRadius: radius.full,
                  backgroundColor: c.primarySoft,
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: '700', color: c.primary }}>{tag.toUpperCase()}</Text>
              </View>
            ))}
            <View
              style={{
                paddingHorizontal: spacing.sm,
                paddingVertical: 4,
                borderRadius: radius.full,
                backgroundColor: c.accentSoft,
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: '700', color: c.accent }}>{topic.level.toUpperCase()}</Text>
            </View>
          </View>

          <Text style={{ fontSize: 20, fontWeight: '700', color: c.text, marginTop: spacing.sm }}>{topic.title_tr}</Text>
          <Text style={{ fontSize: 14, marginTop: spacing.xs, lineHeight: 20, color: c.textSecondary }}>{topic.summary_tr}</Text>

          <Card style={{ marginTop: spacing.lg }}>
            {paragraphs.map((line, idx) => {
              const isBullet = line.startsWith('- ');
              return (
                <Text
                  key={idx}
                  style={{
                    fontSize: 14,
                    lineHeight: 21,
                    color: c.text,
                    marginTop: idx === 0 ? 0 : spacing.sm,
                    marginLeft: isBullet ? spacing.sm : 0,
                  }}
                >
                  {isBullet ? `•  ${line.slice(2)}` : line}
                </Text>
              );
            })}
          </Card>

          {topic.example_sentences.length > 0 ? (
            <View style={{ marginTop: spacing.lg }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: c.text, marginBottom: spacing.sm }}>
                {et.grammarExamplesTitle}
              </Text>
              <View style={{ gap: spacing.sm }}>
                {topic.example_sentences.map((example, idx) => (
                  <Card key={idx} style={{ paddingVertical: spacing.sm }}>
                    <Text style={{ fontSize: 14, color: c.text }}>{example.en}</Text>
                    {example.tr ? (
                      <Text style={{ fontSize: 13, color: c.textSecondary, marginTop: 2 }}>{example.tr}</Text>
                    ) : null}
                  </Card>
                ))}
              </View>
            </View>
          ) : null}

          {topic.common_mistakes.length > 0 ? (
            <View style={{ marginTop: spacing.lg }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: c.text, marginBottom: spacing.sm }}>
                {et.grammarMistakesTitle}
              </Text>
              <View style={{ gap: spacing.sm }}>
                {topic.common_mistakes.map((mistake, idx) => (
                  <Card key={idx} style={{ paddingVertical: spacing.sm }}>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs }}>
                      <XCircle color={c.danger} size={16} style={{ marginTop: 2 }} />
                      <Text style={{ fontSize: 14, color: c.danger, flex: 1 }}>{mistake.wrong}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs, marginTop: spacing.xs }}>
                      <CheckCircle2 color={c.success} size={16} style={{ marginTop: 2 }} />
                      <Text style={{ fontSize: 14, color: c.success, flex: 1 }}>{mistake.correct}</Text>
                    </View>
                    <Text style={{ fontSize: 13, color: c.textSecondary, marginTop: spacing.xs }}>{mistake.note}</Text>
                  </Card>
                ))}
              </View>
            </View>
          ) : null}

          <View style={{ marginTop: spacing.xl, marginBottom: spacing.xl }}>
            {topic.has_practice_questions ? (
              <Button
                title={et.grammarPracticeCta}
                onPress={() => router.push({ pathname: '/(app)/exam-topic-practice', params: { topic_tag: topic.slug } })}
              />
            ) : (
              <Text style={{ fontSize: 13, color: c.textMuted, textAlign: 'center' }}>{et.grammarNoQuestionsYet}</Text>
            )}
          </View>
        </View>
      )}
    </ScreenContainer>
  );
}
