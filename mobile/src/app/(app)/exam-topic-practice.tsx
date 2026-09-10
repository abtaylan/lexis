// src/app/(app)/exam-topic-practice.tsx — Sınav Hazırlık İstatistik & İçerik
// Motoru madde #3b: "aynı konudan ekstra pratik soru önerisi". Ayrıca
// grammar.py'deki eski TODO'nun ("topic_tag'e göre filtrelenmiş sınav
// oturumu ... sırada bekliyor") karşılığı — ama tam bir session/XP akışı
// yerine bilinçli olarak HAFİF bir mod seçildi: oturum açmaz, exam_attempts'e
// yazmaz, XP vermez. Amaç ilerleme ölçmek değil, az önce yanlış yapılan
// konuyu hızlıca pekiştirmek. topic_tag parametresi ya exam-prep.tsx'teki
// "Bu konudan pratik yap" butonundan (cevap sonrası) ya da
// exam-grammar-detail.tsx'teki "Bu Konuyu Pratik Et" CTA'sından gelir.
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle2, XCircle } from 'lucide-react-native';
import { useLocale } from '@/i18n';
import { examsApi } from '@/api/exams';
import type { ExamPracticeQuestionItem } from '@/api/types';
import { useThemeColors } from '@/hooks/useThemeColors';
import { radius, spacing } from '@/constants/theme';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function ExamTopicPracticeScreen() {
  const { topic_tag: topicTagParam, exclude_question_id: excludeParam } = useLocalSearchParams<{
    topic_tag: string;
    exclude_question_id?: string;
  }>();
  const topicTag = typeof topicTagParam === 'string' ? topicTagParam : '';
  const excludeQuestionId = typeof excludeParam === 'string' ? excludeParam : undefined;

  const { et } = useLocale();
  const c = useThemeColors();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['exam-topic-practice', topicTag, excludeQuestionId],
    queryFn: () => examsApi.practiceQuestionsByTopic(topicTag, { excludeQuestionId, limit: 5 }),
    enabled: !!topicTag,
  });

  const [index, setIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    setIndex(0);
    setSelectedOption(null);
    setRevealed(false);
  }, [data]);

  const questions: ExamPracticeQuestionItem[] = data?.questions ?? [];
  const current = questions[index];
  const done = questions.length > 0 && index >= questions.length;

  function handleSelect(optionId: string) {
    if (revealed) return;
    setSelectedOption(optionId);
    setRevealed(true);
    if (current) {
      examsApi.logTopicPracticeAttempt(topicTag, current.id, optionId === current.correct_option);
    }
  }

  function handleNext() {
    setSelectedOption(null);
    setRevealed(false);
    setIndex((i) => i + 1);
  }

  return (
    <ScreenContainer>
      <Pressable onPress={() => router.back()} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}>
        <ArrowLeft color={c.textSecondary} size={18} />
        <Text style={{ color: c.textSecondary, marginLeft: spacing.xs, fontSize: 14, fontWeight: '600' }}>{et.backBtn}</Text>
      </Pressable>

      <Text style={{ fontSize: 20, fontWeight: '700', color: c.text }}>
        {data?.related_grammar_topic?.title_tr ?? et.topicPracticeTitle}
      </Text>
      <Text style={{ fontSize: 13, color: c.textMuted, marginTop: 4 }}>{et.topicPracticeSubtitle}</Text>

      {isLoading ? (
        <View style={{ marginTop: spacing.xxl, alignItems: 'center' }}>
          <ActivityIndicator color={c.primary} />
        </View>
      ) : isError ? (
        <Text style={{ color: c.danger, marginTop: spacing.lg }}>{et.genericError}</Text>
      ) : questions.length === 0 ? (
        <Text style={{ color: c.textMuted, marginTop: spacing.lg }}>{et.grammarNoQuestionsYet}</Text>
      ) : done ? (
        <Card style={styles.centerCard}>
          <CheckCircle2 color={c.success} size={36} />
          <Text style={[styles.title, { color: c.text, marginTop: spacing.md }]}>{et.topicPracticeDoneTitle}</Text>
          <View style={{ marginTop: spacing.xl, width: '100%', gap: spacing.sm }}>
            <Button title={et.backToDashboardBtn} onPress={() => router.back()} />
          </View>
        </Card>
      ) : (
        <>
          <Text style={{ color: c.textMuted, fontWeight: '600', marginTop: spacing.lg }}>
            {et.questionCounterTpl.replace('{current}', String(index + 1)).replace('{total}', String(questions.length))}
          </Text>

          <Card style={{ marginTop: spacing.sm }}>
            <Text style={[styles.bodyText, { color: c.text }]}>{current.question_text}</Text>
          </Card>

          <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
            {current.options.map((opt) => {
              const isSelected = selectedOption === opt.id;
              const isCorrectOpt = revealed && opt.id === current.correct_option;
              const isWrongSelected = revealed && isSelected && opt.id !== current.correct_option;
              let borderColor = c.border;
              if (revealed) {
                if (isCorrectOpt) borderColor = c.success;
                else if (isWrongSelected) borderColor = c.danger;
              } else if (isSelected) {
                borderColor = c.primary;
              }
              return (
                <Pressable key={opt.id} disabled={revealed} onPress={() => handleSelect(opt.id)}>
                  <View style={[styles.optionRow, { borderColor, backgroundColor: c.surface }]}>
                    <Text style={[styles.optionText, { color: c.text }]}>{opt.text}</Text>
                    {isCorrectOpt && <CheckCircle2 color={c.success} size={20} />}
                    {isWrongSelected && <XCircle color={c.danger} size={20} />}
                  </View>
                </Pressable>
              );
            })}
          </View>

          {revealed && (
            <View style={{ marginTop: spacing.lg, gap: spacing.md }}>
              <Card style={{ backgroundColor: selectedOption === current.correct_option ? c.successSoft : c.dangerSoft, borderColor: 'transparent' }}>
                <Text style={{ color: c.textMuted, fontWeight: '600' }}>{et.explanationLabel}</Text>
                <Text style={{ color: c.textSecondary, marginTop: 4 }}>{current.explanation}</Text>
              </Card>
              <Button
                title={index + 1 >= questions.length ? et.finishBtn : et.nextBtn}
                onPress={handleNext}
              />
            </View>
          )}
        </>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 20, fontWeight: '700' },
  bodyText: { fontSize: 15, lineHeight: 22 },
  centerCard: { alignItems: 'center', paddingVertical: spacing.xl, marginTop: spacing.lg },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  optionText: { fontSize: 15, flex: 1 },
});
