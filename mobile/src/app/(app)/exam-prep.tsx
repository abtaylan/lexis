// src/app/(app)/exam-prep.tsx — Sınav Hazırlık Alanı (YDS/YÖKDİL/IELTS/TOEFL).
// V2 Yol Haritası §1.1, öncelik #1. game.tsx'teki stage-machine deseniyle
// tutarlı: select-type -> select-mode -> playing -> result. Backend akışı
// (session/next-question/attempt/finish) games.py'deki session/next-word/
// attempt/finish akışının bire bir karşılığıdır (bkz. backend/app/api/routes/exams.py).
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Link, router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, CheckCircle2, Clock, Plus, XCircle } from 'lucide-react-native';
import { useLocale } from '@/i18n';
import { examsApi } from '@/api/exams';
import type {
  ExamAttemptResult,
  ExamFinishResult,
  ExamSession,
  ExamSessionMode,
  ExamType,
  NextQuestionResult,
} from '@/api/types';
import { useThemeColors } from '@/hooks/useThemeColors';
import { radius, spacing } from '@/constants/theme';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

type Stage = 'loading' | 'disabled' | 'select-type' | 'select-mode' | 'playing' | 'result' | 'error';

const EXAM_TYPE_ORDER: ExamType[] = ['yds', 'yokdil', 'ielts', 'toefl'];

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function ExamPrepScreen() {
  const { et } = useLocale();
  const c = useThemeColors();

  const [stage, setStage] = useState<Stage>('loading');
  const [examType, setExamType] = useState<ExamType | null>(null);
  const [sessionMode, setSessionMode] = useState<ExamSessionMode>('practice');
  const [session, setSession] = useState<ExamSession | null>(null);
  const [question, setQuestion] = useState<NextQuestionResult | null>(null);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [attemptResult, setAttemptResult] = useState<ExamAttemptResult | null>(null);
  const [finishResult, setFinishResult] = useState<ExamFinishResult | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [addedWords, setAddedWords] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);

  const { data: examTypes, isLoading: typesLoading } = useQuery({
    queryKey: ['exam-types'],
    queryFn: examsApi.listExamTypes,
  });

  useEffect(() => {
    if (typesLoading) return;
    if (!examTypes || examTypes.length === 0) {
      setStage('disabled');
    } else {
      setStage('select-type');
    }
  }, [examTypes, typesLoading]);

  // Deneme sınavı (timed_mock) geri sayımı — süre bitince otomatik bitir.
  useEffect(() => {
    if (stage !== 'playing' || timeLeft === null) return;
    if (timeLeft <= 0) {
      handleFinish();
      return;
    }
    const timer = setTimeout(() => setTimeLeft((t) => (t !== null ? t - 1 : null)), 1000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, timeLeft]);

  async function loadNextQuestion(sessionId: string) {
    setBusy(true);
    try {
      const next = await examsApi.nextQuestion(sessionId);
      if (next.finished) {
        await handleFinish(sessionId);
        return;
      }
      setQuestion(next);
      setSelectedOption(null);
      setAttemptResult(null);
    } catch {
      setStage('error');
    } finally {
      setBusy(false);
    }
  }

  async function handleStart() {
    if (!examType) return;
    setBusy(true);
    try {
      const s = await examsApi.createSession(examType, sessionMode);
      setSession(s);
      setTimeLeft(s.time_limit_seconds ?? null);
      setStage('playing');
      await loadNextQuestion(s.id);
    } catch {
      setStage('error');
    } finally {
      setBusy(false);
    }
  }

  async function handleSubmit() {
    if (!session || !question?.question_id || !selectedOption) return;
    setBusy(true);
    try {
      const result = await examsApi.submitAttempt(session.id, {
        question_id: question.question_id,
        selected_option: selectedOption,
      });
      setAttemptResult(result);
    } catch {
      setStage('error');
    } finally {
      setBusy(false);
    }
  }

  async function handleAddWord(word: string) {
    if (!question?.question_id) return;
    try {
      await examsApi.addWordFromQuestion(question.question_id);
      setAddedWords((prev) => ({ ...prev, [word]: true }));
    } catch {
      // sessiz — kritik yol değil, kullanıcı tekrar deneyebilir
    }
  }

  async function handleFinish(sessionIdOverride?: string) {
    const sid = sessionIdOverride ?? session?.id;
    if (!sid) return;
    setBusy(true);
    try {
      const result = await examsApi.finishSession(sid);
      setFinishResult(result);
      setStage('result');
    } catch {
      setStage('error');
    } finally {
      setBusy(false);
    }
  }

  function resetToStart() {
    setExamType(null);
    setSession(null);
    setQuestion(null);
    setSelectedOption(null);
    setAttemptResult(null);
    setFinishResult(null);
    setTimeLeft(null);
    setAddedWords({});
    setStage('select-type');
  }

  // ── Yükleniyor / kullanılamaz durumları ──────────────────────────────
  if (stage === 'loading') {
    return (
      <ScreenContainer>
        <Text style={{ color: c.textMuted }}>{et.loadingLabel}</Text>
      </ScreenContainer>
    );
  }

  if (stage === 'disabled') {
    return (
      <ScreenContainer>
        <Card style={styles.centerCard}>
          <BookOpen color={c.textMuted} size={32} />
          <Text style={[styles.bodyText, { color: c.textSecondary, marginTop: spacing.md }]}>{et.disabledMessage}</Text>
          <View style={{ marginTop: spacing.lg, width: '100%' }}>
            <Button title={et.backToDashboardBtn} variant="secondary" onPress={() => router.back()} />
          </View>
        </Card>
      </ScreenContainer>
    );
  }

  if (stage === 'error') {
    return (
      <ScreenContainer>
        <Card style={styles.centerCard}>
          <Text style={[styles.bodyText, { color: c.danger }]}>{et.genericError}</Text>
          <View style={{ marginTop: spacing.lg, width: '100%' }}>
            <Button title={et.backBtn} variant="secondary" onPress={resetToStart} />
          </View>
        </Card>
      </ScreenContainer>
    );
  }

  // ── Sınav türü seçimi ─────────────────────────────────────────────────
  if (stage === 'select-type') {
    return (
      <ScreenContainer>
        <Text style={[styles.title, { color: c.text }]}>{et.pageTitle}</Text>
        <Text style={[styles.subtitle, { color: c.textSecondary }]}>{et.pageSubtitle}</Text>
        <View style={{ marginTop: spacing.lg, gap: spacing.md }}>
          {EXAM_TYPE_ORDER.map((type) => {
            const info = examTypes?.find((t) => t.exam_type === type);
            const available = !!info?.available;
            const label =
              type === 'yds' ? et.examTypeYds : type === 'yokdil' ? et.examTypeYokdil : type === 'ielts' ? et.examTypeIelts : et.examTypeToefl;
            return (
              <Pressable
                key={type}
                disabled={!available}
                onPress={() => {
                  setExamType(type);
                  setStage('select-mode');
                }}
              >
                <Card style={[styles.typeCard, { opacity: available ? 1 : 0.5 }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.typeLabel, { color: c.text }]}>{label}</Text>
                    <Text style={{ color: c.textMuted, fontSize: 13, marginTop: 2 }}>
                      {available ? et.questionCountTpl.replace('{count}', String(info?.question_count ?? 0)) : et.comingSoonLabel}
                    </Text>
                  </View>
                </Card>
              </Pressable>
            );
          })}
        </View>
        <Link href="/exam-grammar" asChild>
          <Pressable style={{ marginTop: spacing.lg, alignSelf: 'center' }}>
            <Text style={{ color: c.primary, fontWeight: '600', fontSize: 14 }}>{et.grammarEntryLabel}</Text>
          </Pressable>
        </Link>
        <Link href="/exam-suggest" asChild>
          <Pressable style={{ marginTop: spacing.lg, alignSelf: 'center' }}>
            <Text style={{ color: c.primary, fontWeight: '600', fontSize: 14 }}>{et.suggestEntryLabel}</Text>
          </Pressable>
        </Link>
      </ScreenContainer>
    );
  }

  // ── Mod seçimi (pratik / deneme sınavı) ─────────────────────────────
  if (stage === 'select-mode') {
    return (
      <ScreenContainer>
        <Text style={[styles.title, { color: c.text }]}>{et.chooseModeTitle}</Text>
        <View style={{ marginTop: spacing.lg, gap: spacing.md }}>
          {(['practice', 'timed_mock'] as ExamSessionMode[]).map((mode) => (
            <Pressable key={mode} onPress={() => setSessionMode(mode)}>
              <Card
                style={[
                  styles.typeCard,
                  { borderColor: sessionMode === mode ? c.primary : c.border, borderWidth: sessionMode === mode ? 2 : 1 },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.typeLabel, { color: c.text }]}>{mode === 'practice' ? et.modePracticeLabel : et.modeMockLabel}</Text>
                  <Text style={{ color: c.textMuted, fontSize: 13, marginTop: 2 }}>
                    {mode === 'practice' ? et.modePracticeDesc : et.modeMockDesc}
                  </Text>
                </View>
              </Card>
            </Pressable>
          ))}
        </View>
        <View style={{ marginTop: spacing.xl, gap: spacing.sm }}>
          <Button title={et.startBtn} onPress={handleStart} loading={busy} />
          <Button title={et.backBtn} variant="ghost" onPress={() => setStage('select-type')} />
        </View>
      </ScreenContainer>
    );
  }

  // ── Soru çözme ekranı ─────────────────────────────────────────────────
  if (stage === 'playing') {
    return (
      <ScreenContainer>
        <View style={styles.headerRow}>
          <Text style={{ color: c.textMuted, fontWeight: '600' }}>
            {question?.question_index && session
              ? et.questionCounterTpl.replace('{current}', String(question.question_index)).replace('{total}', String(session.total_questions))
              : ''}
          </Text>
          {timeLeft !== null && (
            <View style={styles.timeChip}>
              <Clock color={c.warning} size={16} />
              <Text style={{ color: c.warning, fontWeight: '700', marginLeft: 4 }}>{et.timeLeftTpl.replace('{time}', formatTime(timeLeft))}</Text>
            </View>
          )}
        </View>

        {!question ? (
          <Text style={{ color: c.textMuted, marginTop: spacing.lg }}>{et.loadingLabel}</Text>
        ) : (
          <>
            <Card style={{ marginTop: spacing.md }}>
              <Text style={[styles.bodyText, { color: c.text }]}>{question.question_text}</Text>
            </Card>

            <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
              {question.options?.map((opt) => {
                const isSelected = selectedOption === opt.id;
                const isCorrectOpt = attemptResult && opt.id === attemptResult.correct_option;
                const isWrongSelected = attemptResult && isSelected && !attemptResult.is_correct;
                let borderColor = c.border;
                if (attemptResult) {
                  if (isCorrectOpt) borderColor = c.success;
                  else if (isWrongSelected) borderColor = c.danger;
                } else if (isSelected) {
                  borderColor = c.primary;
                }
                return (
                  <Pressable key={opt.id} disabled={!!attemptResult} onPress={() => setSelectedOption(opt.id)}>
                    <View style={[styles.optionRow, { borderColor, backgroundColor: c.surface }]}>
                      <Text style={[styles.optionText, { color: c.text }]}>{opt.text}</Text>
                      {attemptResult && isCorrectOpt && <CheckCircle2 color={c.success} size={20} />}
                      {attemptResult && isWrongSelected && <XCircle color={c.danger} size={20} />}
                    </View>
                  </Pressable>
                );
              })}
            </View>

            {!attemptResult ? (
              <View style={{ marginTop: spacing.lg }}>
                <Button title={et.submitBtn} onPress={handleSubmit} loading={busy} disabled={!selectedOption} />
              </View>
            ) : (
              <View style={{ marginTop: spacing.lg, gap: spacing.md }}>
                <Card style={{ backgroundColor: attemptResult.is_correct ? c.successSoft : c.dangerSoft, borderColor: 'transparent' }}>
                  <Text style={{ color: attemptResult.is_correct ? c.success : c.danger, fontWeight: '700', fontSize: 15 }}>
                    {attemptResult.is_correct ? et.correctLabel : et.wrongLabel}
                    {attemptResult.xp_awarded > 0 ? `  +${attemptResult.xp_awarded} XP` : ''}
                  </Text>
                  <Text style={{ color: c.textMuted, fontWeight: '600', marginTop: spacing.sm }}>{et.explanationLabel}</Text>
                  <Text style={{ color: c.textSecondary, marginTop: 4 }}>{attemptResult.explanation}</Text>
                  {attemptResult.leveled_up && (
                    <Text style={{ color: c.accent, fontWeight: '700', marginTop: spacing.sm }}>
                      {et.levelUpTpl.replace('{level}', String(attemptResult.new_level ?? ''))}
                    </Text>
                  )}
                </Card>

                {/* Madde #3a/#3b: yanlış cevapta ilgili gramer konusuna
                    yönlendirme + aynı konudan ekstra pratik önerisi. */}
                {!attemptResult.is_correct && (attemptResult.related_grammar_topic || attemptResult.topic_tag) && (
                  <View style={{ gap: spacing.sm }}>
                    {attemptResult.related_grammar_topic && (
                      <Button
                        title={et.reviewGrammarTopicTpl.replace('{topic}', attemptResult.related_grammar_topic.title_tr)}
                        variant="secondary"
                        onPress={() =>
                          router.push({
                            pathname: '/(app)/exam-grammar-detail',
                            params: { slug: attemptResult.related_grammar_topic!.slug },
                          })
                        }
                      />
                    )}
                    {attemptResult.topic_tag && (
                      <Button
                        title={et.practiceThisTopicBtn}
                        variant="ghost"
                        onPress={() =>
                          router.push({
                            pathname: '/(app)/exam-topic-practice',
                            params: { topic_tag: attemptResult.topic_tag!, exclude_question_id: question?.question_id ?? '' },
                          })
                        }
                      />
                    )}
                  </View>
                )}

                {!!attemptResult.related_words?.length && (
                  <View style={{ gap: spacing.sm }}>
                    {attemptResult.related_words.map((rw) => (
                      <Pressable key={rw.word} disabled={!!addedWords[rw.word]} onPress={() => handleAddWord(rw.word)}>
                        <View style={[styles.wordChip, { borderColor: c.border, backgroundColor: c.surface }]}>
                          <View style={{ flex: 1 }}>
                            <Text style={{ color: c.text, fontWeight: '600' }}>{rw.word}</Text>
                            <Text style={{ color: c.textMuted, fontSize: 13 }}>{rw.meaning}</Text>
                          </View>
                          {addedWords[rw.word] ? (
                            <CheckCircle2 color={c.success} size={20} />
                          ) : (
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                              <Plus color={c.primary} size={16} />
                              <Text style={{ color: c.primary, fontWeight: '600', marginLeft: 4, fontSize: 13 }}>{et.addWordBtn}</Text>
                            </View>
                          )}
                        </View>
                      </Pressable>
                    ))}
                  </View>
                )}

                <Button
                  title={
                    session && question.question_index && question.question_index >= session.total_questions ? et.finishBtn : et.nextBtn
                  }
                  onPress={() => (session ? loadNextQuestion(session.id) : undefined)}
                  loading={busy}
                />
              </View>
            )}
          </>
        )}
      </ScreenContainer>
    );
  }

  // ── Sonuç ekranı ────────────────────────────────────────────────────
  if (stage === 'result' && finishResult) {
    return (
      <ScreenContainer>
        <Card style={styles.centerCard}>
          <CheckCircle2 color={c.success} size={40} />
          <Text style={[styles.title, { color: c.text, marginTop: spacing.md }]}>{et.doneTitle}</Text>
          <Text style={[styles.bodyText, { color: c.textSecondary, marginTop: spacing.sm }]}>
            {et.doneScoreTpl.replace('{score}', String(finishResult.score)).replace('{total}', String(finishResult.total_questions))}
          </Text>
          <Text style={[styles.bodyText, { color: c.textSecondary }]}>{et.doneXpTpl.replace('{xp}', String(finishResult.xp_earned))}</Text>
          {finishResult.mock_bonus_xp > 0 && (
            <Text style={[styles.bodyText, { color: c.accent }]}>{et.mockBonusTpl.replace('{xp}', String(finishResult.mock_bonus_xp))}</Text>
          )}
          <View style={{ marginTop: spacing.xl, width: '100%', gap: spacing.sm }}>
            <Button title={et.playAgainBtn} onPress={resetToStart} />
            <Button title={et.backToDashboardBtn} variant="secondary" onPress={() => router.back()} />
          </View>
        </Card>
      </ScreenContainer>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  title: { fontSize: 20, fontWeight: '700' },
  subtitle: { fontSize: 14, marginTop: spacing.xs, lineHeight: 20 },
  bodyText: { fontSize: 15, lineHeight: 22, textAlign: 'center' },
  centerCard: { alignItems: 'center', paddingVertical: spacing.xl },
  typeCard: { flexDirection: 'row', alignItems: 'center' },
  typeLabel: { fontSize: 16, fontWeight: '700' },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  timeChip: { flexDirection: 'row', alignItems: 'center' },
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
  wordChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
  },
});
