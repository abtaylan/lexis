// src/components/ReportQuestionModal.tsx — "Hata bildirimi" butonu.
// 16 Ekim 2026 — kullanıcı talebi: "Hata bildirimi butonu işini de yap."
// exam-prep.tsx ve exam-topic-practice.tsx'teki soru ekranlarından paylaşılır
// (profile.tsx::AddLanguageModal ile aynı Modal deseni). Backend:
// POST /exams/questions/{id}/report (bkz. backend/app/api/routes/exams.py).
import React, { useState } from 'react';
import { Modal, Text, View, StyleSheet } from 'react-native';
import { CheckCircle2 } from 'lucide-react-native';
import { useLocale } from '@/i18n';
import { examsApi } from '@/api/exams';
import type { QuestionReportReason } from '@/api/types';
import { useThemeColors } from '@/hooks/useThemeColors';
import { radius, spacing } from '@/constants/theme';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { ChipSelect } from '@/components/ui/ChipSelect';

interface ReportQuestionModalProps {
  visible: boolean;
  questionId: string | null | undefined;
  onClose: () => void;
}

const REASONS: { value: QuestionReportReason; labelKey: 'reportReasonWrongAnswer' | 'reportReasonTypoUnclear' | 'reportReasonOther' }[] = [
  { value: 'wrong_answer', labelKey: 'reportReasonWrongAnswer' },
  { value: 'typo_unclear', labelKey: 'reportReasonTypoUnclear' },
  { value: 'other', labelKey: 'reportReasonOther' },
];

export function ReportQuestionModal({ visible, questionId, onClose }: ReportQuestionModalProps) {
  const { et } = useLocale();
  const c = useThemeColors();

  const [reason, setReason] = useState<QuestionReportReason | null>(null);
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function reset() {
    setReason(null);
    setDetails('');
    setError(null);
    setDone(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleSubmit() {
    if (!questionId) return;
    if (!reason) {
      setError(et.reportValidationError);
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await examsApi.reportQuestion(questionId, { reason, details: details.trim() || undefined });
      setDone(true);
    } catch {
      setError(et.genericError);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: c.surface }]}>
          {done ? (
            <View style={{ alignItems: 'center', paddingVertical: spacing.md }}>
              <CheckCircle2 color={c.success} size={36} />
              <Text style={{ color: c.text, fontSize: 15, fontWeight: '700', marginTop: spacing.md, textAlign: 'center' }}>
                {et.reportSuccessMsg}
              </Text>
              <View style={{ marginTop: spacing.lg, width: '100%' }}>
                <Button title={et.backBtn} onPress={handleClose} />
              </View>
            </View>
          ) : (
            <>
              <Text style={[styles.title, { color: c.text }]}>{et.reportModalTitle}</Text>

              <ChipSelect
                options={REASONS.map((r) => ({ value: r.value, label: et[r.labelKey] }))}
                value={reason}
                onChange={(v) => setReason(v as QuestionReportReason)}
              />

              <View style={{ marginTop: spacing.md }}>
                <TextField
                  label={et.reportDetailsLabel}
                  placeholder={et.reportDetailsPlaceholder}
                  value={details}
                  onChangeText={setDetails}
                  multiline
                />
              </View>

              {error ? <Text style={{ color: c.danger, fontSize: 12, marginTop: spacing.sm }}>{error}</Text> : null}

              <View style={[styles.actions, { marginTop: spacing.lg }]}>
                <View style={{ flex: 1 }}>
                  <Button title={et.reportCancelBtn} variant="ghost" onPress={handleClose} />
                </View>
                <View style={{ flex: 1 }}>
                  <Button title={et.reportSubmitBtn} loading={busy} onPress={handleSubmit} />
                </View>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  card: { borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg, maxHeight: '80%' },
  title: { fontSize: 18, fontWeight: '700', marginBottom: spacing.md },
  actions: { flexDirection: 'row', gap: spacing.sm },
});
