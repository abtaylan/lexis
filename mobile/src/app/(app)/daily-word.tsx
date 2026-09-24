// src/app/(app)/daily-word.tsx — "Günlük Kelime Avı" (24 Eylül 2026, Madde 2
// seçimi) oyun ekranı. game.tsx'teki wordle modunun AYNI görsel dili (can
// emojisi satırı, boşluklu kelime kutuları, klavye — bkz. game.tsx satır
// ~895-965) burada TEK bir günlük bulmaca için sadeleştirilmiş, kendi
// kendine yeten bir ekran olarak tekrar kullanıldı (mevcut dev karmaşık
// oyun state makinesine dokunulmadı).
//
// Paylaşım: YENİ BİR NATIVE BAĞIMLILIK YOK (expo-clipboard/expo-sharing
// mobile/package.json'da kurulu değil, kullanıcının "mobilde açılma/
// kapanma sorunlarıyla karşılaşmayalım" isteğiyle tutarlı olarak
// eklenmedi) -- react-native ÇEKİRDEĞİNİN kendi Share API'si kullanılıyor
// (zaten derlenmiş uygulamanın bir parçası, ekstra native modül/rebuild
// gerektirmiyor).
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { Flame, Share2 } from 'lucide-react-native';
import { useLocale } from '@/i18n';
import { dailyChallengeApi } from '@/api/dailyChallenge';
import type { DailyChallengeState } from '@/api/types';
import { useThemeColors } from '@/hooks/useThemeColors';
import { radius, spacing } from '@/constants/theme';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { ScreenNavBar } from '@/components/ui/ScreenNavBar';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

const KEYBOARD_ROWS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];

const L: Record<'tr' | 'en', Record<string, string>> = {
  tr: {
    title: 'Günlük Kelime Avı',
    error: 'Bir şeyler ters gitti.',
    noneTitle: 'Bugün için kelime yok',
    noneBody: 'Bu dil için bugünün kelimesi henüz hazır değil — biraz sonra tekrar dene.',
    livesLabel: 'Hak',
    streakLabel: 'gün seri',
    wonTitle: 'Kelimeyi buldun! 🎉',
    lostTitle: 'Hakların bitti',
    correctWordTpl: 'Doğru kelime: {word}',
    guessedLabel: 'Denenen harfler',
    shareBtn: 'Paylaş',
  },
  en: {
    title: 'Daily Word Hunt',
    error: 'Something went wrong.',
    noneTitle: 'No word today',
    noneBody: "Today's word for this language isn't ready yet — check back soon.",
    livesLabel: 'Lives',
    streakLabel: 'day streak',
    wonTitle: 'You got it! 🎉',
    lostTitle: 'Out of lives',
    correctWordTpl: 'The word was: {word}',
    guessedLabel: 'Guessed letters',
    shareBtn: 'Share',
  },
};

export default function DailyWordScreen() {
  const c = useThemeColors();
  const { locale } = useLocale();
  const t = L[locale === 'tr' ? 'tr' : 'en'];

  const [state, setState] = useState<DailyChallengeState | null | undefined>(undefined);
  const [error, setError] = useState('');
  const [letterBusy, setLetterBusy] = useState(false);

  useEffect(() => {
    dailyChallengeApi
      .today()
      .then(setState)
      .catch(() => setError(t.error));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGuessLetter = async (letter: string) => {
    if (!state || letterBusy || state.is_complete || state.is_failed) return;
    if (state.guessed_letters.includes(letter)) return;
    setLetterBusy(true);
    setError('');
    try {
      const res = await dailyChallengeApi.guessLetter(letter);
      setState((prev) => (prev ? { ...prev, ...res } : prev));
    } catch {
      setError(t.error);
    } finally {
      setLetterBusy(false);
    }
  };

  const handleShare = async () => {
    if (!state) return;
    const roundOver = state.is_complete || state.is_failed;
    if (!roundOver) return;
    const lettersLen = state.revealed.replace(/\s+/g, '').length;
    const squares = Array.from({ length: state.max_wrong_guesses })
      .map((_, i) => (i < state.wrong_guesses ? '🟥' : state.is_complete ? '🟩' : '⬜'))
      .join('');
    const resultLine = state.is_complete ? `✅ ${lettersLen} harf` : '❌';
    const streakLine = state.streak > 0 ? `🔥 ${state.streak} ${t.streakLabel}` : '';
    const message = [
      `Lexis — Günlük Kelime Avı (${state.puzzle_date})`,
      `${resultLine} ${squares}`,
      streakLine,
      'lexiswords.com',
    ]
      .filter(Boolean)
      .join('\n');
    try {
      await Share.share({ message });
    } catch {
      // Kullanıcı paylaşım sayfasını kapattıysa/izin yoksa sessizce yok say.
    }
  };

  return (
    <ScreenContainer>
      <ScreenNavBar />
      <Text style={[styles.h1, { color: c.text }]}>{t.title}</Text>

      {state === undefined && !error && (
        <View style={{ paddingVertical: spacing.xl * 2, alignItems: 'center' }}>
          <ActivityIndicator color={c.primary} />
        </View>
      )}

      {!!error && <Text style={{ color: c.danger, textAlign: 'center', marginTop: spacing.md }}>{error}</Text>}

      {state === null && (
        <Card style={{ alignItems: 'center', marginTop: spacing.md }}>
          <Text style={{ color: c.text, fontWeight: '700', fontSize: 14 }}>{t.noneTitle}</Text>
          <Text style={{ color: c.textMuted, fontSize: 12, marginTop: 4, textAlign: 'center' }}>{t.noneBody}</Text>
        </Card>
      )}

      {state && (
        <>
          {state.streak > 0 && (
            <View style={styles.streakRow}>
              <Flame color="#F97316" size={16} fill="#FB923C" />
              <Text style={{ color: '#F97316', fontWeight: '700', fontSize: 13 }}>
                {state.streak} {t.streakLabel}
              </Text>
            </View>
          )}

          {!!state.meaning && (
            <Card style={{ alignItems: 'center', marginTop: spacing.md, backgroundColor: c.primarySoft, borderColor: c.primarySoft }}>
              <Text style={{ color: c.primary, fontSize: 14, fontWeight: '600', textAlign: 'center' }}>{state.meaning}</Text>
              {!!state.example && (
                <Text style={{ color: c.primary, fontSize: 12, marginTop: 4, fontStyle: 'italic', textAlign: 'center' }}>
                  {state.example}
                </Text>
              )}
            </Card>
          )}

          <View style={styles.livesRow}>
            <Text style={{ color: c.textMuted, fontSize: 11, fontWeight: '600', marginRight: 4 }}>{t.livesLabel}</Text>
            {Array.from({ length: state.max_wrong_guesses }).map((_, i) => (
              <Text key={i} style={{ fontSize: 16 }}>
                {i < state.max_wrong_guesses - state.wrong_guesses ? '❤️' : '🤍'}
              </Text>
            ))}
          </View>

          <View style={styles.revealRow}>
            {state.revealed.replace(/\s+/g, '').split('').map((ch, i) => (
              <View
                key={i}
                style={[
                  styles.letterBox,
                  { borderColor: ch === '_' ? c.border : c.success, backgroundColor: ch === '_' ? c.background : c.successSoft },
                ]}
              >
                <Text style={{ fontSize: 18, fontWeight: '700', color: ch === '_' ? 'transparent' : c.success, textTransform: 'uppercase' }}>
                  {ch === '_' ? '·' : ch}
                </Text>
              </View>
            ))}
          </View>

          {(state.is_complete || state.is_failed) && (
            <Card
              style={{
                backgroundColor: state.is_complete ? c.successSoft : c.dangerSoft,
                borderColor: state.is_complete ? c.successSoft : c.dangerSoft,
                alignItems: 'center',
                marginBottom: spacing.md,
              }}
            >
              <Text style={{ color: state.is_complete ? c.success : c.danger, fontWeight: '700' }}>
                {state.is_complete ? t.wonTitle : t.lostTitle}
              </Text>
              {state.is_failed && state.word && (
                <Text style={{ color: c.danger, marginTop: 4 }}>{t.correctWordTpl.replace('{word}', state.word)}</Text>
              )}
            </Card>
          )}

          {!state.is_complete && !state.is_failed && (
            <View style={{ alignItems: 'center', gap: 6 }}>
              {KEYBOARD_ROWS.map((row, i) => (
                <View key={i} style={{ flexDirection: 'row', gap: 5 }}>
                  {row.split('').map((letter) => {
                    const lower = letter.toLowerCase();
                    const isGuessed = state.guessed_letters.includes(lower);
                    const isCorrectGuess = isGuessed && state.revealed.toLowerCase().includes(lower);
                    return (
                      <Pressable
                        key={letter}
                        disabled={isGuessed || letterBusy}
                        onPress={() => handleGuessLetter(lower)}
                        style={[
                          styles.key,
                          {
                            backgroundColor: isGuessed ? (isCorrectGuess ? c.successSoft : c.border) : c.surface,
                            borderColor: isGuessed ? 'transparent' : c.border,
                          },
                        ]}
                      >
                        <Text style={{ fontSize: 13, fontWeight: '600', color: isGuessed ? (isCorrectGuess ? c.success : c.textMuted) : c.text }}>
                          {letter}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              ))}
            </View>
          )}

          {state.guessed_letters.length > 0 && !state.is_complete && !state.is_failed && (
            <Text style={{ color: c.textMuted, fontSize: 11, textAlign: 'center', marginTop: spacing.md }}>
              {t.guessedLabel}: {state.guessed_letters.join(', ').toUpperCase()}
            </Text>
          )}

          {(state.is_complete || state.is_failed) && (
            <View style={{ marginTop: spacing.lg }}>
              <Button title={t.shareBtn} onPress={handleShare} icon={<Share2 color="#FFFFFF" size={16} />} />
            </View>
          )}
        </>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: 20, fontWeight: '700', marginBottom: spacing.md },
  streakRow: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center', marginBottom: spacing.sm },
  livesRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 2, marginTop: spacing.md, marginBottom: spacing.md },
  revealRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6, marginBottom: spacing.md },
  letterBox: { width: 32, height: 40, borderWidth: 2, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  key: { width: 28, height: 36, borderRadius: radius.sm, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
});
