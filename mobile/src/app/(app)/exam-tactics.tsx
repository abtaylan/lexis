// src/app/(app)/exam-tactics.tsx — "Sınav Taktikleri" liste ekranı (23
// Kasım 2026, Behçet'in kullanıcı isteği: "YDS ve YÖKDİL sınavlarında
// sorular ... sınav taktikleri ile çözülebiliyor ... bu taktikleri
// çalıştığımız konuların olduğu bölümlere eklememiz lazım").
//
// GET /exams/tactics (bkz. backend ExamTacticItem) iki tür satır döner:
// - topic_tag DOLU: gerçek bir gramer konusuna bağlı taktik -- karta
//   basınca YERİNDE açılır/kapanır (bkz. ExamTacticCard, collapsible),
//   altındaki "Taktikle Pratik Yap" butonuna basınca exam-topic-practice
//   ekranına (o konunun MEVCUT soru havuzuyla BİRLİKTE) yönlendirilir.
// - topic_tag BOŞ: bir soru TİPİNE (çeviri/cümle tamamlama/paragraf
//   tamamlama) ait genel strateji -- pratik havuzu yok, her zaman açık.
//
// 23 Kasım 2026 kullanıcı geri bildirimi ("burada sayfalama yapısı olmalı,
// başlıklara tıklayınca ayrıntıları görmeliyiz ... sarı renkli alan
// okunaklı olmuyor ... örnekler çok olmalı, taktikler isimlendirilmeli"):
// önceden konu bazlı taktiklere basınca ayrıntı GÖSTERMEDEN direkt pratik
// ekranına gidiliyordu -- artık ExamTacticCard ile YERİNDE açılıp
// kapanabiliyor (literal sayfa numaralı "sayfalama" yerine akordeon --
// sadece 25 taktik olduğu için bu daha kullanışlı; sayı arttıkça gerekirse
// literal sayfalamaya geçilebilir) ve birden fazla örnek + okunaklı nötr
// metin rengiyle gösteriliyor (bkz. ExamTacticCard bileşeni).
import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useLocale } from '@/i18n';
import { examsApi } from '@/api/exams';
import type { ExamTacticItem } from '@/api/types';
import { useThemeColors } from '@/hooks/useThemeColors';
import { spacing } from '@/constants/theme';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { ScreenNavBar } from '@/components/ui/ScreenNavBar';
import { Button } from '@/components/ui/Button';
import { ExamTacticCard } from '@/components/ExamTacticCard';

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
              <Text style={{ fontSize: 13, fontWeight: '700', marginTop: spacing.lg, marginBottom: spacing.sm, textTransform: 'uppercase', color: c.textMuted }}>
                {et.examTacticsGeneralGroupLabel}
              </Text>
              <View style={{ gap: spacing.sm }}>
                {generalTactics.map((tactic) => (
                  <ExamTacticCard
                    key={tactic.id}
                    collapsible
                    title={tactic.title_tr}
                    tactic={tactic.tactic_tr}
                    examples={tactic.examples_tr}
                  />
                ))}
              </View>
            </>
          )}

          {topicTactics.length > 0 && (
            <>
              <Text style={{ fontSize: 13, fontWeight: '700', marginTop: spacing.lg, marginBottom: spacing.sm, textTransform: 'uppercase', color: c.textMuted }}>
                {et.examTacticsTopicGroupLabel}
              </Text>
              <View style={{ gap: spacing.sm }}>
                {topicTactics.map((tactic) => (
                  <ExamTacticCard
                    key={tactic.id}
                    collapsible
                    title={tactic.title_tr}
                    subtitle={tactic.related_grammar_topic ? `${et.examTacticsTopicLabel}: ${tactic.related_grammar_topic.title_tr}` : null}
                    tactic={tactic.tactic_tr}
                    examples={tactic.examples_tr}
                    footer={<Button title={et.examTacticsPracticeBtn} onPress={() => openTopicPractice(tactic)} />}
                  />
                ))}
              </View>
            </>
          )}
        </>
      )}
    </ScreenContainer>
  );
}
