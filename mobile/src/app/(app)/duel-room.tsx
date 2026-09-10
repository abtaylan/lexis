import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { AxiosError } from 'axios';
import { Swords, Play, LogOut, Check, X, Trophy } from 'lucide-react-native';
import { duelsApi } from '@/api/duels';
import type { DuelAnswerResponse, DuelRoundPublic, DuelStatusResponse } from '@/api/types';
import { DUELS_STRINGS } from '@/i18n/duelsStrings';
import { useLocale } from '@/i18n';
import { useAuth } from '@/store/auth';
import { useThemeColors } from '@/hooks/useThemeColors';
import { radius, spacing } from '@/constants/theme';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Card } from '@/components/ui/Card';

// ── Düello odası — web'deki app/(app)/duels/[id]/page.tsx'in mobil
// karşılığı. Bekleme odası (katılımcı listesi + başlat) -> aktif tur (tanım
// + seçenekler, canlı sayaç) -> bitiş (final skor tablosu). Gerçek zamanlı
// yayın (Realtime) YOK — bilinçli olarak POLLING (bkz. backend/app/api/
// routes/duels.py modül docstring'i).
//
// NOT (mobil taraf yazılırken fark edilen düzeltme): web sürümünün ilk
// halinde `tick` içindeki `answerResult` kontrolü, polling interval'ının
// SADECE `[duelId]`'ye bağlı olması yüzünden HER ZAMAN mount anındaki
// (null) değeri görüyordu — yani "herkes cevapladıysa hemen ilerlet"
// dalı hiç tetiklenmiyordu, sadece süre dolumu (ends_at) ilerletiyordu.
// Burada `answerResultRef` (her render'da güncellenen "latest ref"
// deseni) ile düzeltildi; aynı düzeltme web dosyasına da uygulandı.
function errorDetail(err: unknown): string | undefined {
  if (err instanceof AxiosError) {
    return (err.response?.data as { detail?: string } | undefined)?.detail;
  }
  return undefined;
}

const POLL_MS = 2000;

export default function DuelRoomScreen() {
  const { id: duelId } = useLocalSearchParams<{ id: string }>();
  const { locale } = useLocale();
  const { user } = useAuth();
  const c = useThemeColors();
  const t = DUELS_STRINGS[locale] ?? DUELS_STRINGS.tr;

  const [duel, setDuel] = useState<DuelStatusResponse | null>(null);
  const [round, setRound] = useState<DuelRoundPublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [answerResult, setAnswerResult] = useState<DuelAnswerResponse | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const lastRoundIndex = useRef<number | null>(null);
  const answerResultRef = useRef<DuelAnswerResponse | null>(null);
  useEffect(() => {
    answerResultRef.current = answerResult;
  }, [answerResult]);

  const tick = useCallback(async () => {
    if (!duelId) return;
    try {
      const status = await duelsApi.getStatus(duelId);
      setDuel(status);
      setError(null);

      if (status.status === 'active') {
        const r = await duelsApi.getCurrentRound(duelId);
        if (lastRoundIndex.current !== r.round_index) {
          lastRoundIndex.current = r.round_index;
          setSelected(null);
          setAnswerResult(null);
        }
        if (!r.started_at) {
          const started = await duelsApi.beginRound(duelId);
          setRound(started);
        } else {
          setRound(r);
          const ended = r.ends_at ? new Date(r.ends_at).getTime() <= Date.now() : false;
          if (ended || answerResultRef.current) {
            duelsApi.advanceRound(duelId).catch(() => {});
          }
        }
      } else {
        setRound(null);
      }
    } catch {
      setError(t.error);
    } finally {
      setLoading(false);
    }
  }, [duelId, t.error]);

  useEffect(() => {
    tick();
    const interval = setInterval(tick, POLL_MS);
    return () => clearInterval(interval);
  }, [tick]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(timer);
  }, []);

  const handleStart = async () => {
    if (!duelId) return;
    setStarting(true);
    try {
      await duelsApi.start(duelId);
      await tick();
    } catch (err) {
      setError(errorDetail(err) || t.error);
    } finally {
      setStarting(false);
    }
  };

  const handleLeave = async () => {
    if (duelId) {
      try {
        await duelsApi.leave(duelId);
      } catch {
        // yoksay — her durumda lobiye dön
      }
    }
    router.replace('/(app)/duels');
  };

  const handleAnswer = async (option: string) => {
    if (selected || !round || !duelId) return;
    setSelected(option);
    try {
      const res = await duelsApi.submitAnswer(duelId, option);
      setAnswerResult(res);
    } catch (err) {
      setError(errorDetail(err) || t.error);
    }
  };

  if (loading && !duel) {
    return (
      <ScreenContainer>
        <View style={{ alignItems: 'center', paddingVertical: spacing.xxl }}>
          <ActivityIndicator color={c.primary} />
        </View>
      </ScreenContainer>
    );
  }

  if (error && !duel) {
    return (
      <ScreenContainer>
        <Text style={{ color: c.danger, fontSize: 13, textAlign: 'center', paddingVertical: spacing.xl }}>{error}</Text>
      </ScreenContainer>
    );
  }

  if (!duel) return <ScreenContainer>{null}</ScreenContainer>;

  const isHost = duel.created_by === user?.id;
  const secondsLeft = round?.ends_at ? Math.max(0, Math.ceil((new Date(round.ends_at).getTime() - now) / 1000)) : null;
  const sortedParticipants = [...duel.participants].sort((a, b) => b.score - a.score);

  return (
    <ScreenContainer>
      <View style={styles.headerRow}>
        <View style={[styles.headerIcon, { backgroundColor: c.primarySoft }]}>
          <Swords color={c.primary} size={20} />
        </View>
        <Text style={{ color: c.text, fontSize: 18, fontWeight: '700', textTransform: 'uppercase' }}>
          {duel.learning_lang}
        </Text>
      </View>

      {duel.status === 'waiting' && (
        <Card style={{ gap: spacing.md }}>
          <View>
            <Text style={{ color: c.text, fontSize: 15, fontWeight: '700' }}>{t.waitingTitle}</Text>
            <Text style={{ color: c.textMuted, fontSize: 12, marginTop: 2 }}>{t.waitingSub}</Text>
          </View>
          <View style={{ gap: 4 }}>
            {sortedParticipants.map((p) => (
              <View key={p.user_id} style={styles.participantRow}>
                <View style={[styles.avatar, { backgroundColor: c.primary }]}>
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>{(p.username || '?')[0].toUpperCase()}</Text>
                </View>
                <Text style={{ color: c.textSecondary, fontSize: 13 }}>
                  {p.username || p.user_id.slice(0, 8)} {p.user_id === user?.id ? t.youLabel : ''}
                </Text>
              </View>
            ))}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' }}>
            {isHost ? (
              <Pressable
                onPress={handleStart}
                disabled={starting || duel.participant_count < 2}
                style={[styles.primaryBtn, { backgroundColor: c.primary, opacity: starting || duel.participant_count < 2 ? 0.5 : 1 }]}
              >
                {starting ? <ActivityIndicator color="#fff" size="small" /> : <Play color="#fff" size={15} />}
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>{t.startBtn}</Text>
              </Pressable>
            ) : (
              <Text style={{ color: c.textMuted, fontSize: 12 }}>{t.hostOnlyLabel}</Text>
            )}
            <Pressable onPress={handleLeave} style={styles.leaveBtn}>
              <LogOut color={c.textMuted} size={15} />
              <Text style={{ color: c.textMuted, fontWeight: '600', fontSize: 13 }}>{t.leaveBtn}</Text>
            </Pressable>
          </View>
          {isHost && duel.participant_count < 2 && (
            <Text style={{ color: c.warning, fontSize: 11 }}>{t.needMoreLabel}</Text>
          )}
        </Card>
      )}

      {duel.status === 'active' && (
        <Card style={{ gap: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ color: c.textMuted, fontSize: 11, fontWeight: '700' }}>
              {t.roundLabel} {(round?.round_index ?? 0) + 1}/{duel.round_count}
            </Text>
            {secondsLeft !== null && (
              <Text style={{ color: c.primary, fontSize: 14, fontWeight: '700' }}>{secondsLeft}s</Text>
            )}
          </View>

          {!round && (
            <Text style={{ color: c.textMuted, fontSize: 13, textAlign: 'center', paddingVertical: spacing.lg }}>
              {t.waitingRoundLabel}
            </Text>
          )}

          {round && (
            <>
              <Text style={{ color: c.text, fontSize: 16, fontWeight: '600', textAlign: 'center', paddingVertical: spacing.xs }}>
                {round.definition}
              </Text>
              <View style={{ gap: spacing.sm }}>
                {round.options.map((opt) => {
                  const isSelected = selected === opt;
                  const isCorrectOpt = !!answerResult && opt === answerResult.correct_option;
                  let borderColor = c.border;
                  let bg = 'transparent';
                  let fg = c.textSecondary;
                  if (answerResult) {
                    if (isCorrectOpt) {
                      borderColor = c.success;
                      bg = c.successSoft;
                      fg = c.success;
                    } else if (isSelected) {
                      borderColor = c.danger;
                      bg = c.dangerSoft;
                      fg = c.danger;
                    }
                  } else if (isSelected) {
                    borderColor = c.primary;
                    bg = c.primarySoft;
                    fg = c.primary;
                  }
                  return (
                    <Pressable
                      key={opt}
                      disabled={!!selected}
                      onPress={() => handleAnswer(opt)}
                      style={[styles.optionBtn, { borderColor, backgroundColor: bg }]}
                    >
                      <Text style={{ color: fg, fontSize: 14, fontWeight: '600', flex: 1 }}>{opt}</Text>
                      {answerResult && isCorrectOpt && <Check color={c.success} size={16} />}
                      {answerResult && isSelected && !isCorrectOpt && <X color={c.danger} size={16} />}
                    </Pressable>
                  );
                })}
              </View>
              {answerResult && (
                <Text style={{ color: answerResult.is_correct ? c.success : c.danger, fontSize: 13, fontWeight: '600', textAlign: 'center' }}>
                  {answerResult.is_correct ? t.correctLabel : `${t.wrongLabel} ${t.correctAnswerPrefix} ${answerResult.correct_option}`}
                </Text>
              )}
              {selected && !answerResult && (
                <Text style={{ color: c.textMuted, fontSize: 11, textAlign: 'center' }}>{t.answeredLabel}</Text>
              )}
            </>
          )}

          <View style={{ borderTopWidth: 1, borderTopColor: c.border, paddingTop: spacing.sm, gap: 4 }}>
            {sortedParticipants.map((p) => (
              <View key={p.user_id} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: c.textSecondary, fontSize: 13 }}>
                  {p.username || p.user_id.slice(0, 8)} {p.user_id === user?.id ? t.youLabel : ''}
                </Text>
                <Text style={{ color: c.text, fontSize: 13, fontWeight: '700' }}>
                  {p.score} {t.scoreLabel}
                </Text>
              </View>
            ))}
          </View>
        </Card>
      )}

      {duel.status === 'finished' && (
        <Card style={{ gap: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <Trophy color={c.amber} size={18} />
            <Text style={{ color: c.text, fontSize: 15, fontWeight: '700' }}>{t.finishedTitle}</Text>
          </View>
          <View style={{ gap: 4 }}>
            {sortedParticipants.map((p, i) => (
              <View key={p.user_id} style={[styles.finishedRow, { backgroundColor: c.background }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                  <Text style={{ color: c.textMuted, fontSize: 11, width: 16 }}>{i + 1}.</Text>
                  <Text style={{ color: c.textSecondary, fontSize: 13 }}>
                    {p.username || p.user_id.slice(0, 8)} {p.user_id === user?.id ? t.youLabel : ''}
                  </Text>
                </View>
                <Text style={{ color: c.text, fontSize: 13, fontWeight: '700' }}>
                  {p.score} {t.scoreLabel}
                </Text>
              </View>
            ))}
          </View>
          <Pressable
            onPress={() => router.replace('/(app)/duels')}
            style={[styles.primaryBtn, { backgroundColor: c.primary, justifyContent: 'center' }]}
          >
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>{t.backToLobbyBtn}</Text>
          </Pressable>
        </Card>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  headerIcon: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  participantRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 4 },
  avatar: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2 },
  leaveBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.sm, paddingVertical: spacing.sm + 2 },
  optionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1.5, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.md },
  finishedRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: radius.md, paddingHorizontal: spacing.sm, paddingVertical: spacing.sm },
});
