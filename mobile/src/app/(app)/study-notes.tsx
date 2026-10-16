// src/app/(app)/study-notes.tsx — "Çalışma Notlarım" ana sayfası (16 Ekim
// 2026 kullanıcı isteği: "Çalışma notlarım bölümü mobile gelmeli, Sosyal
// rekabet bölümüne ekleyelim"). Web'deki app/(app)/study-notes/page.tsx ile
// aynı veriyi (GET /study-notes) kullanan mobil karşılığı: Takvimde
// "Yapıldı" olarak işaretlenmiş her gün burada tıklanabilir bir kart olarak
// listelenir. duels/report/roadmap ile AYNI desen: kendi sekmesi yok,
// dashboard'daki "Sosyal & Rekabet" kısayol grid'inden açılıyor (bkz.
// dashboard.tsx, _layout.tsx href:null kaydı).
import React from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { CalendarX2, ChevronRight, NotebookPen } from 'lucide-react-native';
import { studyNotesApi } from '@/api/studyNotes';
import type { StudyDaySummary, StudyNoteSource } from '@/api/types';
import { useThemeColors } from '@/hooks/useThemeColors';
import { radius, spacing } from '@/constants/theme';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { ScreenNavBar } from '@/components/ui/ScreenNavBar';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';

const SOURCE_LABEL: Record<StudyNoteSource, string> = {
  gemini: 'Gemini',
  notebooklm: 'NotebookLM',
  manual: 'Manuel',
};

function formatDateTr(dateIso: string): string {
  return new Date(dateIso + 'T00:00:00').toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    weekday: 'long',
  });
}

export default function StudyNotesScreen() {
  const c = useThemeColors();

  const { data, isLoading, isError, refetch, isFetching } = useQuery<StudyDaySummary[]>({
    queryKey: ['study-notes-days'],
    queryFn: () => studyNotesApi.listDays(),
  });

  return (
    <ScreenContainer onRefresh={refetch} refreshing={isFetching && !isLoading}>
      <ScreenNavBar />

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: radius.md,
            backgroundColor: c.primarySoft,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <NotebookPen color={c.primary} size={18} />
        </View>
        <Text style={{ fontSize: 20, fontWeight: '700', color: c.text }}>Çalışma Notlarım</Text>
      </View>
      <Text style={{ fontSize: 13, marginTop: spacing.xs, lineHeight: 19, color: c.textSecondary }}>
        Takvimde &quot;Yapıldı&quot; olarak işaretlediğin her gün burada listelenir — o günün konusuna göre
        hazırlanmış Gemini/NotebookLM talimatlarını kullanıp aldığın özetleri ve görselleri buraya
        kaydedebilirsin.
      </Text>

      <View style={{ marginTop: spacing.lg }}>
        {isLoading && (
          <View style={{ paddingVertical: spacing.xl, alignItems: 'center' }}>
            <ActivityIndicator color={c.primary} />
          </View>
        )}

        {!isLoading && isError && (
          <EmptyState title="Çalışma notları yüklenemedi." subtitle="Sayfayı aşağı çekerek tekrar dene." />
        )}

        {!isLoading && !isError && (data?.length ?? 0) === 0 && (
          <View style={{ alignItems: 'center' }}>
            <CalendarX2 color={c.textMuted} size={28} style={{ marginBottom: spacing.sm }} />
            <EmptyState
              title={'Henüz "Yapıldı" olarak işaretlenmiş bir gün yok.'}
              subtitle="Çalışma Programı'ndaki bir günü tamamlandı işaretleyince burada görünecek."
            />
            <Pressable onPress={() => router.push('/(app)/schedule')} style={{ marginTop: spacing.sm }}>
              <Text style={{ color: c.primary, fontWeight: '700', fontSize: 13 }}>Çalışma Programı&apos;na git →</Text>
            </Pressable>
          </View>
        )}

        {!isLoading &&
          !isError &&
          (data ?? []).map((day) => (
            <Pressable
              key={day.date}
              onPress={() => router.push({ pathname: '/(app)/study-notes-detail', params: { date: day.date } })}
              style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
            >
              <Card
                style={{
                  marginBottom: spacing.sm,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.sm,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: c.textMuted }}>{formatDateTr(day.date)}</Text>
                  <Text
                    style={{ fontSize: 14, fontWeight: '700', color: c.text, marginTop: 2 }}
                    numberOfLines={1}
                  >
                    {day.topic_title || day.activities[0] || 'Genel Çalışma Programı'}
                  </Text>
                  {day.note_sources.length > 0 && (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: spacing.xs }}>
                      {day.note_sources.map((s) => (
                        <View
                          key={s}
                          style={{
                            backgroundColor: '#E1F5EE',
                            borderRadius: radius.full,
                            paddingHorizontal: 8,
                            paddingVertical: 2,
                          }}
                        >
                          <Text style={{ color: '#0F6E56', fontWeight: '700', fontSize: 10 }}>
                            {SOURCE_LABEL[s] || s} ✓
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
                <ChevronRight color={c.textMuted} size={18} />
              </Card>
            </Pressable>
          ))}
      </View>
    </ScreenContainer>
  );
}
