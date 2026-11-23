// src/app/(app)/exam-tactics.tsx — "Sınav Taktikleri" liste ekranı (23
// Kasım 2026, Behçet'in kullanıcı isteği: "YDS ve YÖKDİL sınavlarında
// sorular ... sınav taktikleri ile çözülebiliyor ... bu taktikleri
// çalıştığımız konuların olduğu bölümlere eklememiz lazım").
//
// GET /exams/tactics (bkz. backend ExamTacticItem) iki tür satır döner:
// - topic_tag DOLU: gerçek bir gramer konusuna bağlı taktik -- karta
//   basınca exam-topic-practice ekranına (o konunun MEVCUT soru havuzuyla
//   BİRLİKTE, taktik banner'ı zaten orada da gösterilir) yönlendirilir.
// - topic_tag BOŞ: bir soru TİPİNE (çeviri/cümle tamamlama/paragraf
//   tamamlama) ait genel strateji -- pratik havuzu yok, salt okunur.
import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, Lightbulb } from 'lucide-react-native';
import { useLocale } from '@/i18n';
import { examsApi } from '@/api/exams';
import type { ExamTacticItem } from '@/api/types';
import { useThemeColors } from '@/hooks/useThemeColors';
import { radius, spacing } from '@/constants/theme';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { ScreenNavBar } from '@/components/ui/ScreenNavBar';
import { Card } from '@/components/ui/Card';

export default function ExamTacticsScreen() {
  const { et } = useLocale();
  const c = useThemeColors();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['exam-tactics'],
    queryFn: () => examsApi.listTactics(),
  });

  const generalTactics = (data ?? []).filter((t) => !t.topic_tag);
  const topicTactics = (data ?? []).filter((t) => !!t.topic_tag);

  function openTopicPractice(tactic: ExamTacticItem) {
    if (!tactic.topic_tag) return;
    router.push({
      pathname: '/(app)/exam-topic-practice',
      params: { topic_tag: tactic.topic_tag, limit: '8' },
    });
  }

  return (
    <ScreenContainer>
      <ScreenNavBar />

      <Text style={{ fontSize: 20, fontWeight: '700', color: c.text }}>{et.examTacticsPageTitle}</Text>
      <Text style={{ fontSize: 13, color: c.textMuted, marginTop: 4 }}>{et.examTacticsPageSubtitle}</Text>

      {isLoading ? (
        <View style={{ marginTop: spacing.xxl, alignItems: 'center' }}>
          <ActivityIndicator color={c.primary} />
        </View>
      ) : isError ? (
        <Text style={{ color: c.danger, marginTop: spacing.lg }}>{et.genericError}</Text>
      ) : (
        <>
          {generalTactics.length > 0 && (
            <>
              <Text style={[styles.groupLabel, { color: c.textMuted }]}>{et.examTacticsGeneralGroupLabel}</Text>
              <View style={{ gap: spacing.sm }}>
                {generalTactics.map((tactic) => (
                  <Card key={tactic.id}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Lightbulb color={c.warning} size={16} />
                      <Text style={[styles.title, { color: c.text }]}>{tactic.title_tr}</Text>
                    </View>
                    <Text style={{ color: c.textSecondary, fontSize: 13, marginTop: spacing.sm, lineHeight: 19 }}>
                      {tactic.tactic_tr}
                    </Text>
                    {tactic.worked_example_tr && (
                      <Text style={{ color: c.textMuted, fontSize: 12, marginTop: spacing.sm, lineHeight: 18, fontStyle: 'italic' }}>
                        {et.tacticExampleLabel}: {tactic.worked_example_tr}
                      </Text>
                    )}
                  </Card>
                ))}
              </View>
            </>
          )}

          {topicTactics.length > 0 && (
            <>
              <Text style={[styles.groupLabel, { color: c.textMuted, marginTop: spacing.lg }]}>
                {et.examTacticsTopicGroupLabel}
              </Text>
              <View style={{ gap: spacing.sm }}>
                {topicTactics.map((tactic) => (
                  <Pressable key={tactic.id} onPress={() => openTopicPractice(tactic)}>
                    <Card style={styles.topicCard}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.title, { color: c.text }]}>{tactic.title_tr}</Text>
                        {tactic.related_grammar_topic && (
                          <Text style={{ color: c.textMuted, fontSize: 12, marginTop: 2 }}>
                            {tactic.related_grammar_topic.title_tr}
                          </Text>
                        )}
                      </View>
                      <ChevronRight color={c.textMuted} size={18} />
                    </Card>
                  </Pressable>
                ))}
              </View>
            </>
          )}
        </>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 15, fontWeight: '700' },
  groupLabel: { fontSize: 13, fontWeight: '700', marginTop: spacing.lg, marginBottom: spacing.sm, textTransform: 'uppercase' },
  topicCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
