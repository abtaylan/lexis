// src/app/(app)/study-focus-topics.tsx — "Odak konular" tam liste ekranı.
//
// Kullanıcı isteği (25 Eylül 2026): "Odak konular bölümü ekranda çok yer
// kaplıyor, orası küçük bir alan olsun, oraya tıklayınca ek bir sayfa
// açılsın, onun içinde sıralansın konular." StudyProgramCard.tsx artık
// dashboard'da sadece küçük, tıklanabilir bir özet gösteriyor (ilk konunun
// önizlemesi + "+N"); bu ekran tam listeyi (TopicRow bileşeni, aynen
// StudyProgramCard'daki gibi) gösteriyor. Kendi sorgusu, dashboard'daki
// ['study-program-current'] ile AYNI queryKey'i kullanıyor — react-query
// zaten önbelleğe alınmış veriyi anında gösterir, arkada sessizce tazeler.
import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useLocale } from '@/i18n';
import { studyProgramApi } from '@/api/studyProgram';
import { useThemeColors } from '@/hooks/useThemeColors';
import { spacing } from '@/constants/theme';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { ScreenNavBar } from '@/components/ui/ScreenNavBar';
import { STRINGS, TopicRow } from '@/components/StudyProgramCard';

const EMPTY_TEXT: Record<'tr' | 'en', string> = {
  tr: 'Şu anda odak konun yok.',
  en: 'No focus topics right now.',
};

export default function StudyFocusTopicsScreen() {
  const { locale } = useLocale();
  const c = useThemeColors();
  const s = STRINGS[locale] ?? STRINGS.tr!;
  const empty = EMPTY_TEXT[locale as 'tr' | 'en'] ?? EMPTY_TEXT.tr;

  const { data: program, isLoading } = useQuery({
    queryKey: ['study-program-current'],
    queryFn: studyProgramApi.current,
  });

  const topics = program?.available ? program.focus_topics : [];

  return (
    <ScreenContainer>
      <ScreenNavBar />
      <Text style={{ fontSize: 20, fontWeight: '700', color: c.text }}>{s.topicsTitle}</Text>
      <Text style={{ fontSize: 13, color: c.textMuted, marginTop: 4 }}>{s.subtitle}</Text>

      {isLoading && !program && (
        <View style={{ paddingVertical: spacing.xl * 2, alignItems: 'center' }}>
          <ActivityIndicator color={c.primary} />
        </View>
      )}

      {!isLoading && topics.length === 0 && (
        <Text style={{ color: c.textMuted, marginTop: spacing.lg, textAlign: 'center' }}>{empty}</Text>
      )}

      {topics.length > 0 && (
        <View style={{ gap: spacing.sm, marginTop: spacing.lg }}>
          {topics.map((t) => (
            <TopicRow key={t.topic_tag} topic={t} s={s} c={c} />
          ))}
        </View>
      )}
    </ScreenContainer>
  );
}
