// src/app/(app)/exam-suggest.tsx — Sınav Hazırlık: kullanıcı soru önerisi.
// Sınav Hazırlık İstatistik & İçerik Motoru, madde #2 (soru havuzu büyütme —
// kullanıcı katkısı). exam-prep.tsx'in select-type ekranındaki "Soru Öner"
// linkinden açılır. Backend: POST /api/v1/exams/questions/suggest — soru
// status=pending olarak kaydedilir, admin onaylayana kadar havuzda görünmez
// (bkz. backend/app/api/routes/exams.py::suggest_question).
import React, { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { CheckCircle2 } from 'lucide-react-native';
import { useLocale } from '@/i18n';
import { examsApi } from '@/api/exams';
import type { ExamType } from '@/api/types';
import { useThemeColors } from '@/hooks/useThemeColors';
import { spacing } from '@/constants/theme';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { ChipSelect } from '@/components/ui/ChipSelect';

const EXAM_TYPE_ORDER: ExamType[] = ['yds', 'yokdil', 'ielts', 'toefl'];
const OPTION_LETTERS = ['a', 'b', 'c', 'd'];

export default function ExamSuggestScreen() {
  const { et } = useLocale();
  const c = useThemeColors();

  const [examType, setExamType] = useState<ExamType>('yds');
  const [questionText, setQuestionText] = useState('');
  const [optionTexts, setOptionTexts] = useState<Record<string, string>>({ a: '', b: '', c: '', d: '' });
  const [correctOption, setCorrectOption] = useState<string | null>(null);
  const [explanation, setExplanation] = useState('');
  const [topicTag, setTopicTag] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  function resetForm() {
    setQuestionText('');
    setOptionTexts({ a: '', b: '', c: '', d: '' });
    setCorrectOption(null);
    setExplanation('');
    setTopicTag('');
    setError(null);
    setDone(false);
  }

  async function handleSubmit() {
    const options = OPTION_LETTERS.map((letter) => ({ id: letter, text: optionTexts[letter].trim() }));
    const allFilled = questionText.trim().length > 0 && options.every((o) => o.text.length > 0) && !!correctOption;
    if (!allFilled) {
      setError(et.suggestValidationError);
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await examsApi.suggestQuestion({
        exam_type: examType,
        question_text: questionText.trim(),
        options,
        correct_option: correctOption!,
        explanation: explanation.trim() || undefined,
        topic_tag: topicTag.trim() || undefined,
      });
      setDone(true);
    } catch {
      setError(et.genericError);
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <ScreenContainer>
        <Card style={{ alignItems: 'center', paddingVertical: spacing.xl }}>
          <CheckCircle2 color={c.success} size={40} />
          <Text style={{ fontSize: 18, fontWeight: '700', color: c.text, marginTop: spacing.md, textAlign: 'center' }}>
            {et.suggestSuccessTitle}
          </Text>
          <Text style={{ color: c.textSecondary, marginTop: spacing.sm, textAlign: 'center', lineHeight: 20 }}>
            {et.suggestSuccessBody}
          </Text>
          <View style={{ marginTop: spacing.xl, width: '100%', gap: spacing.sm }}>
            <Button title={et.suggestAnotherBtn} onPress={resetForm} />
            <Button title={et.backBtn} variant="secondary" onPress={() => router.back()} />
          </View>
        </Card>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={{ fontSize: 20, fontWeight: '700', color: c.text }}>{et.suggestTitle}</Text>
        <Text style={{ fontSize: 14, marginTop: spacing.xs, lineHeight: 20, color: c.textSecondary }}>{et.suggestSubtitle}</Text>

        <Text style={{ fontSize: 13, fontWeight: '600', marginTop: spacing.lg, marginBottom: spacing.sm, color: c.textSecondary }}>
          {et.suggestExamTypeLabel}
        </Text>
        <ChipSelect
          options={EXAM_TYPE_ORDER.map((type) => ({
            value: type,
            label: type === 'yds' ? et.examTypeYds : type === 'yokdil' ? et.examTypeYokdil : type === 'ielts' ? et.examTypeIelts : et.examTypeToefl,
          }))}
          value={examType}
          onChange={(v) => setExamType(v as ExamType)}
        />

        <View style={{ marginTop: spacing.md }}>
          <TextField
            label={et.suggestQuestionLabel}
            placeholder={et.suggestQuestionPlaceholder}
            value={questionText}
            onChangeText={setQuestionText}
            multiline
          />
        </View>

        {OPTION_LETTERS.map((letter) => (
          <TextField
            key={letter}
            label={et.suggestOptionLabelTpl.replace('{letter}', letter.toUpperCase())}
            placeholder={et.suggestOptionPlaceholderTpl.replace('{letter}', letter.toUpperCase())}
            value={optionTexts[letter]}
            onChangeText={(v) => setOptionTexts((prev) => ({ ...prev, [letter]: v }))}
          />
        ))}

        <Text style={{ fontSize: 13, fontWeight: '600', marginTop: spacing.sm, marginBottom: spacing.sm, color: c.textSecondary }}>
          {et.suggestCorrectOptionLabel}
        </Text>
        <ChipSelect
          options={OPTION_LETTERS.map((letter) => ({ value: letter, label: letter.toUpperCase() }))}
          value={correctOption}
          onChange={setCorrectOption}
        />

        <View style={{ marginTop: spacing.md }}>
          <TextField
            label={et.suggestExplanationLabel}
            placeholder={et.suggestExplanationPlaceholder}
            value={explanation}
            onChangeText={setExplanation}
            multiline
          />
          <TextField
            label={et.suggestTopicLabel}
            placeholder={et.suggestTopicPlaceholder}
            value={topicTag}
            onChangeText={setTopicTag}
          />
        </View>

        {error ? <Text style={{ color: c.danger, marginBottom: spacing.md }}>{error}</Text> : null}

        <View style={{ marginTop: spacing.sm, marginBottom: spacing.xl, gap: spacing.sm }}>
          <Button title={et.suggestSubmitBtn} onPress={handleSubmit} loading={busy} />
          <Button title={et.backBtn} variant="ghost" onPress={() => router.back()} />
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
