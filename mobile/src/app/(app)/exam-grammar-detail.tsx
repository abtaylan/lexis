// src/app/(app)/exam-grammar-detail.tsx — Sınav Hazırlık: Gramer Rehberi konu detayı.
// Kural açıklaması + örnek cümleler + Türkçe konuşanlara özgü sık hatalar.
// slug parametresi router.push({ params: { slug } }) ile geliyor (bkz.
// exam-grammar.tsx ve user-profile.tsx'teki useLocalSearchParams deseni).
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import { BookOpen, CheckCircle2, Plus, RefreshCw, XCircle } from 'lucide-react-native';
import { useLocale } from '@/i18n';
import { grammarApi } from '@/api/grammar';
import { wordsApi } from '@/api/words';
import type { StudyPassageResponse } from '@/api/types';
import { useThemeColors } from '@/hooks/useThemeColors';
import { radius, spacing } from '@/constants/theme';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { ScreenNavBar } from '@/components/ui/ScreenNavBar';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

// Günün Okuma Parçası (14 Ekim 2026, kullanıcı isteği -- bkz. backend
// services/study_passage_generator.py modül docstring'i): o gün çalışılan
// gramer konusunu içeren AI-üretimi kısa okuma parçası + zor kelimeler
// (tek dokunuşla kendi kelime listesine eklenebilir) + bir phrasal verb.
function StudyPassageSection({ slug }: { slug: string }) {
  const c = useThemeColors();
  const [passage, setPassage] = useState<StudyPassageResponse | null>(null);
  const [addedWords, setAddedWords] = useState<Record<string, boolean>>({});

  const passageMutation = useMutation({
    mutationFn: () => grammarApi.getStudyPassage(slug),
    onSuccess: (data) => {
      setPassage(data);
      setAddedWords({});
    },
    onError: () => Alert.alert('Hata', 'Okuma parçası üretilemedi, tekrar dener misin?'),
  });

  const addWordMutation = useMutation({
    mutationFn: (item: { word: string; meaning_tr: string; part_of_speech?: string | null }) =>
      wordsApi.create({
        word: item.word,
        meaning: item.meaning_tr,
        meaning_native: item.meaning_tr,
        word_type: item.part_of_speech ?? undefined,
        list_type: 'active',
      }),
  });

  const handleAddWord = (item: { word: string; meaning_tr: string; part_of_speech?: string | null }) => {
    addWordMutation.mutate(item, {
      onSuccess: () => setAddedWords((prev) => ({ ...prev, [item.word]: true })),
      onError: () => Alert.alert('Hata', 'Kelime eklenemedi, tekrar dener misin?'),
    });
  };

  return (
    <View style={{ marginTop: spacing.lg }}>
      <Text style={{ fontSize: 15, fontWeight: '700', color: c.text, marginBottom: spacing.sm }}>
        Günün Okuma Parçası
      </Text>

      {!passage ? (
        <Button
          title="Okuma Parçası Üret"
          icon={<BookOpen color="#FFFFFF" size={18} />}
          loading={passageMutation.isPending}
          onPress={() => passageMutation.mutate()}
        />
      ) : (
        <View>
          <Card>
            <Text style={{ fontSize: 15, fontWeight: '700', color: c.text }}>{passage.title_tr}</Text>
            <Text style={{ fontSize: 14, lineHeight: 21, color: c.text, marginTop: spacing.sm }}>
              {passage.passage_en}
            </Text>
            {passage.comprehension_note_tr ? (
              <Text style={{ fontSize: 13, lineHeight: 19, color: c.textSecondary, marginTop: spacing.sm }}>
                {passage.comprehension_note_tr}
              </Text>
            ) : null}
          </Card>

          {passage.vocabulary.length > 0 ? (
            <View style={{ marginTop: spacing.md, gap: spacing.xs }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: c.textSecondary }}>
                Parçadaki Zor Kelimeler
              </Text>
              {passage.vocabulary.map((item) => {
                const added = addedWords[item.word];
                return (
                  <Card key={item.word} style={{ paddingVertical: spacing.sm }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontWeight: '600', color: c.text }}>
                          {item.word}
                          {item.part_of_speech ? (
                            <Text style={{ fontSize: 12, color: c.textMuted }}> ({item.part_of_speech})</Text>
                          ) : null}
                        </Text>
                        <Text style={{ fontSize: 13, color: c.textSecondary, marginTop: 2 }}>{item.meaning_tr}</Text>
                      </View>
                      <Pressable
                        onPress={() => handleAddWord(item)}
                        disabled={added || addWordMutation.isPending}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 4,
                          paddingHorizontal: spacing.sm,
                          paddingVertical: 6,
                          borderRadius: radius.full,
                          backgroundColor: added ? c.successSoft ?? c.primarySoft : c.primarySoft,
                        }}
                      >
                        {added ? (
                          <CheckCircle2 color={c.success} size={16} />
                        ) : (
                          <Plus color={c.primary} size={16} />
                        )}
                        <Text style={{ fontSize: 12, fontWeight: '700', color: added ? c.success : c.primary }}>
                          {added ? 'Eklendi' : 'Ekle'}
                        </Text>
                      </Pressable>
                    </View>
                  </Card>
                );
              })}
            </View>
          ) : null}

          {passage.phrasal_verb ? (
            <Card style={{ marginTop: spacing.md }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: c.accent }}>PHRASAL VERB</Text>
              <Text style={{ fontSize: 14, fontWeight: '600', color: c.text, marginTop: 4 }}>
                {passage.phrasal_verb.phrase} — {passage.phrasal_verb.meaning_tr}
              </Text>
              {passage.phrasal_verb.example_sentence ? (
                <Text style={{ fontSize: 13, color: c.textSecondary, marginTop: 4, fontStyle: 'italic' }}>
                  {passage.phrasal_verb.example_sentence}
                </Text>
              ) : null}
            </Card>
          ) : null}

          <View style={{ marginTop: spacing.md }}>
            <Button
              title="Yeni Parça Üret"
              variant="secondary"
              icon={<RefreshCw color={c.primary} size={16} />}
              loading={passageMutation.isPending}
              onPress={() => passageMutation.mutate()}
            />
          </View>
        </View>
      )}
    </View>
  );
}

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
      <ScreenNavBar />

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

          <View style={{ marginTop: spacing.xl }}>
            {topic.has_practice_questions ? (
              <Button
                title={et.grammarPracticeCta}
                onPress={() => router.push({ pathname: '/(app)/exam-topic-practice', params: { topic_tag: topic.slug } })}
              />
            ) : (
              <Text style={{ fontSize: 13, color: c.textMuted, textAlign: 'center' }}>{et.grammarNoQuestionsYet}</Text>
            )}
          </View>

          <StudyPassageSection slug={topic.slug} />

          <View style={{ marginBottom: spacing.xl }} />
        </View>
      )}
    </ScreenContainer>
  );
}
