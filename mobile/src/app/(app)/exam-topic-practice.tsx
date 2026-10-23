// src/app/(app)/exam-topic-practice.tsx — Sınav Hazırlık İstatistik & İçerik
// Motoru madde #3b: "aynı konudan ekstra pratik soru önerisi". Ayrıca
// grammar.py'deki eski TODO'nun ("topic_tag'e göre filtrelenmiş sınav
// oturumu ... sırada bekliyor") karşılığı — ama tam bir session/XP akışı
// yerine bilinçli olarak HAFİF bir mod seçildi: oturum açmaz, exam_attempts'e
// yazmaz, XP vermez. Amaç ilerleme ölçmek değil, az önce yanlış yapılan
// konuyu hızlıca pekiştirmek. topic_tag parametresi ya exam-prep.tsx'teki
// "Bu konudan pratik yap" butonundan (cevap sonrası) ya da
// exam-grammar-detail.tsx'teki "Bu Konuyu Pratik Et" CTA'sından gelir.
//
// 23 Ekim 2026, Behçet'in kullanıcı isteği — test sorularına (MCQ) ek olarak
// EK bir faz: çeviri cümlesi kurma pratiği. Kutudan tıklama YOK, kullanıcı
// cümleyi kendi yazar, "Kontrol Et" ile kendi kontrol eder. Web ile birebir
// aynı mantık (bkz. web/src/app/(app)/exam-topic-practice/page.tsx) --
// backend TopicTranslationQuestionItem/translation_questions.
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Flag, XCircle } from 'lucide-react-native';
import { useLocale } from '@/i18n';
import { examsApi } from '@/api/exams';
import { studyProgramApi } from '@/api/studyProgram';
import type { ExamPracticeQuestionItem, TopicTranslationQuestionItem } from '@/api/types';
import { useThemeColors } from '@/hooks/useThemeColors';
import { radius, spacing } from '@/constants/theme';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { ScreenNavBar } from '@/components/ui/ScreenNavBar';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { ReportQuestionModal } from '@/components/ReportQuestionModal';

const WEEKLY_QUIZ_TAG = 'weekly-quiz';

// Cümle karşılaştırması: büyük/küçük harf, noktalama ve fazladan boşluk
// farkları yüzünden doğru cevabı yanlış saymasın (kutudan seçim değil,
// serbest metin girişi olduğu için gerekli — web'deki normalizeSentence ile
// birebir aynı).
function normalizeSentence(s: string): string {
  return s
    .trim()
    .toLocaleLowerCase()
    .replace(/[.,!?;:"'’‘“”()]/g, '')
    .replace(/\s+/g, ' ');
}

export default function ExamTopicPracticeScreen() {
  const { topic_tag: topicTagParam, exclude_question_id: excludeParam, limit: limitParam } = useLocalSearchParams<{
    topic_tag: string;
    exclude_question_id?: string;
    limit?: string;
  }>();
  const topicTag = typeof topicTagParam === 'string' ? topicTagParam : '';
  const excludeQuestionId = typeof excludeParam === 'string' ? excludeParam : undefined;
  // 15 Ekim 2026 — Program Haritası roadmap_* maddeleri ?limit= ile gelir
  // (Pekiştirme=6, Kısa Pratik=5, Uzun Pratik=10): başlıkta yazılan soru
  // sayısıyla gerçekten eşleşsin diye artık sabit 5 değil, parametreden okunuyor.
  const limitNum = typeof limitParam === 'string' ? parseInt(limitParam, 10) : NaN;
  const limit = Number.isFinite(limitNum) ? Math.max(1, Math.min(10, limitNum)) : 5;

  const { et } = useLocale();
  const c = useThemeColors();

  // 24 Eylül 2026 — Adaptif Öğrenme Motoru Madde 2: topic_tag=weekly-quiz ise
  // haftalık programın odak konularından karışık hafta sonu quizi açılır.
  const isWeeklyQuiz = topicTag === WEEKLY_QUIZ_TAG;
  const { data, isLoading, isError } = useQuery({
    queryKey: ['exam-topic-practice', topicTag, excludeQuestionId, limit],
    queryFn: () =>
      isWeeklyQuiz
        ? studyProgramApi.weeklyQuiz()
        : examsApi.practiceQuestionsByTopic(topicTag, { excludeQuestionId, limit }),
    enabled: !!topicTag,
  });

  const [index, setIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  // "Hata bildirimi" butonu -- 16 Ekim 2026
  const [reportModalOpen, setReportModalOpen] = useState(false);
  // 23 Ekim 2026 — MCQ fazından sonra gelen EK çeviri cümlesi pratiği fazı;
  // ayrı index/duruma sahip, kutudan tıklama yok, kullanıcı cümleyi kendi yazar.
  const [translationIndex, setTranslationIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [translationRevealed, setTranslationRevealed] = useState(false);
  const [translationCorrect, setTranslationCorrect] = useState(false);

  useEffect(() => {
    setIndex(0);
    setSelectedOption(null);
    setRevealed(false);
    setTranslationIndex(0);
    setUserAnswer('');
    setTranslationRevealed(false);
    setTranslationCorrect(false);
  }, [data]);

  const questions: ExamPracticeQuestionItem[] = data?.questions ?? [];
  const translationQuestions: TopicTranslationQuestionItem[] = data?.translation_questions ?? [];
  const current = questions[index];
  const currentTranslation = translationQuestions[translationIndex];
  const hasAnyQuestions = questions.length > 0 || translationQuestions.length > 0;
  const mcqPhaseActive = questions.length > 0 && index < questions.length;
  const translationPhaseActive =
    !mcqPhaseActive && translationQuestions.length > 0 && translationIndex < translationQuestions.length;
  const done = hasAnyQuestions && !mcqPhaseActive && !translationPhaseActive;

  function handleSelect(optionId: string) {
    if (revealed) return;
    setSelectedOption(optionId);
    setRevealed(true);
    if (current) {
      examsApi.logTopicPracticeAttempt(current.topic_tag ?? topicTag, current.id, optionId === current.correct_option);
    }
  }

  function handleNext() {
    setSelectedOption(null);
    setRevealed(false);
    setIndex((i) => i + 1);
  }

  function handleCheckTranslation() {
    if (!currentTranslation || translationRevealed) return;
    const normalizedUser = normalizeSentence(userAnswer);
    const candidates = [currentTranslation.correct_sentence, ...(currentTranslation.acceptable_answers ?? [])];
    const isCorrect = candidates.some((cand) => normalizeSentence(cand) === normalizedUser);
    setTranslationCorrect(isCorrect);
    setTranslationRevealed(true);
    examsApi.logTopicTranslationAttempt(
      currentTranslation.topic_tag ?? topicTag,
      currentTranslation.id,
      userAnswer,
      isCorrect
    );
  }

  function handleNextTranslation() {
    setUserAnswer('');
    setTranslationRevealed(false);
    setTranslationCorrect(false);
    setTranslationIndex((i) => i + 1);
  }

  return (
    <ScreenContainer>
      <ScreenNavBar />

      <Text style={{ fontSize: 20, fontWeight: '700', color: c.text }}>
        {isWeeklyQuiz ? et.weeklyQuizTitle : data?.related_grammar_topic?.title_tr ?? et.topicPracticeTitle}
      </Text>
      <Text style={{ fontSize: 13, color: c.textMuted, marginTop: 4 }}>
        {isWeeklyQuiz ? et.weeklyQuizSubtitle : et.topicPracticeSubtitle}
      </Text>

      {isLoading ? (
        <View style={{ marginTop: spacing.xxl, alignItems: 'center' }}>
          <ActivityIndicator color={c.primary} />
        </View>
      ) : isError ? (
        <Text style={{ color: c.danger, marginTop: spacing.lg }}>{et.genericError}</Text>
      ) : !hasAnyQuestions ? (
        <Text style={{ color: c.textMuted, marginTop: spacing.lg }}>{et.grammarNoQuestionsYet}</Text>
      ) : done ? (
        <Card style={styles.centerCard}>
          <CheckCircle2 color={c.success} size={36} />
          <Text style={[styles.title, { color: c.text, marginTop: spacing.md }]}>{et.topicPracticeDoneTitle}</Text>
          <View style={{ marginTop: spacing.xl, width: '100%', gap: spacing.sm }}>
            <Button title={et.backToDashboardBtn} onPress={() => router.back()} />
          </View>
        </Card>
      ) : translationPhaseActive && currentTranslation ? (
        <>
          <Text style={{ color: c.textMuted, fontWeight: '600', marginTop: spacing.lg }}>
            {et.translationCounterTpl
              .replace('{current}', String(translationIndex + 1))
              .replace('{total}', String(translationQuestions.length))}
          </Text>

          <Card style={{ marginTop: spacing.sm }}>
            {currentTranslation.grammar_note && (
              <View style={{ backgroundColor: c.warningSoft, borderRadius: radius.md, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, marginBottom: spacing.sm }}>
                <Text style={{ color: c.warning, fontSize: 12, fontWeight: '600' }}>{et.grammarNoteLabel}</Text>
                <Text style={{ color: c.warning, fontSize: 12, marginTop: 4, lineHeight: 17 }}>{currentTranslation.grammar_note}</Text>
              </View>
            )}
            <Text style={[styles.bodyText, { color: c.text, fontWeight: '600' }]}>{currentTranslation.prompt_sentence}</Text>
            {currentTranslation.word_hints.length > 0 && (
              <View style={{ marginTop: spacing.sm, flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {currentTranslation.word_hints.map((hint, i) => (
                  <View key={i} style={{ backgroundColor: c.border, borderRadius: radius.sm, paddingVertical: 4, paddingHorizontal: 8 }}>
                    <Text style={{ color: c.textMuted, fontSize: 12 }}>
                      {hint.phrase} <Text style={{ color: c.textMuted }}>— {hint.translation}</Text>
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </Card>

          <View style={{ marginTop: spacing.md }}>
            <TextField
              value={userAnswer}
              onChangeText={setUserAnswer}
              editable={!translationRevealed}
              autoFocus
              autoCapitalize="none"
              autoCorrect={false}
              spellCheck={false}
              multiline
              placeholder={et.translationInputPlaceholder}
              style={
                translationRevealed
                  ? {
                      borderColor: translationCorrect ? c.success : c.danger,
                      backgroundColor: translationCorrect ? c.successSoft : c.dangerSoft,
                      color: translationCorrect ? c.success : c.danger,
                    }
                  : undefined
              }
            />
          </View>

          {!translationRevealed && (
            <Button title={et.checkBtn} onPress={handleCheckTranslation} disabled={!userAnswer.trim()} />
          )}

          {translationRevealed && (
            <View style={{ marginTop: spacing.sm, gap: spacing.md }}>
              <Card style={{ backgroundColor: translationCorrect ? c.successSoft : c.dangerSoft, borderColor: 'transparent' }}>
                <Text style={{ color: translationCorrect ? c.success : c.danger, fontWeight: '600' }}>
                  {translationCorrect ? et.translationCorrectLabel : et.translationWrongLabel}
                </Text>
                <Text style={{ color: c.textMuted, fontWeight: '600', marginTop: spacing.sm, fontSize: 12 }}>{et.modelAnswerLabel}</Text>
                <Text style={{ color: c.textSecondary, marginTop: 4 }}>{currentTranslation.correct_sentence}</Text>
              </Card>
              <Button
                title={translationIndex + 1 >= translationQuestions.length ? et.finishBtn : et.nextBtn}
                onPress={handleNextTranslation}
              />
            </View>
          )}
        </>
      ) : (
        <>
          <Text style={{ color: c.textMuted, fontWeight: '600', marginTop: spacing.lg }}>
            {et.questionCounterTpl.replace('{current}', String(index + 1)).replace('{total}', String(questions.length))}
          </Text>

          <Card style={{ marginTop: spacing.sm }}>
            <Text style={[styles.bodyText, { color: c.text }]}>{current.question_text}</Text>
          </Card>

          <Pressable
            onPress={() => setReportModalOpen(true)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-end', marginTop: spacing.xs }}
          >
            <Flag color={c.textMuted} size={13} />
            <Text style={{ color: c.textMuted, fontSize: 12 }}>{et.reportQuestionBtn}</Text>
          </Pressable>

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

      <ReportQuestionModal
        visible={reportModalOpen}
        questionId={current?.id}
        onClose={() => setReportModalOpen(false)}
      />
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
