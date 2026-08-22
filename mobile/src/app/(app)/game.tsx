import React, { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useLocale } from '@/i18n';
import { gamesApi } from '@/api/games';
import type { Direction, GameFinishResult, GameMode, NextWordResult, PoolSource } from '@/api/types';
import { useThemeColors } from '@/hooks/useThemeColors';
import { radius, spacing } from '@/constants/theme';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

type Stage = 'mode' | 'direction' | 'setup' | 'loading' | 'playing' | 'error' | 'done';

const KEYBOARD_ROWS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];

// ── Eşleştirme (matching) — web'deki app/(app)/game/page.tsx'teki aynı mantık
// mobile'a taşındı: tek seferde MATCHING_BATCH_SIZE kadar kelime çekilip iki
// sütun halinde gösterilir, kelime + anlam çifti tıklanarak eşleştirilir. ──
const MATCHING_BATCH_SIZE = 4;

type MatchingItem = {
  uid: string;
  word: string;
  meaning: string;
  word_id?: string;
  general_word_id?: string;
};

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function GameScreen() {
  const { gt } = useLocale();
  const c = useThemeColors();

  const [stage, setStage] = useState<Stage>('mode');
  const [gameMode, setGameMode] = useState<GameMode>('multiple_choice');
  const [direction, setDirection] = useState<Direction>('word_to_meaning');
  const [poolSource, setPoolSource] = useState<PoolSource>('general');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [current, setCurrent] = useState<NextWordResult | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<boolean | null>(null);

  const [revealed, setRevealed] = useState('');
  const [guessedLetters, setGuessedLetters] = useState<string[]>([]);
  const [wrongGuesses, setWrongGuesses] = useState(0);
  const [maxWrongGuesses, setMaxWrongGuesses] = useState(6);
  const [roundResult, setRoundResult] = useState<'won' | 'lost' | null>(null);
  const [revealedWord, setRevealedWord] = useState<string | null>(null);
  const [letterBusy, setLetterBusy] = useState(false);

  const [matchingItems, setMatchingItems] = useState<MatchingItem[]>([]);
  const [matchingWordSlots, setMatchingWordSlots] = useState<string[]>([]);
  const [matchingMeaningSlots, setMatchingMeaningSlots] = useState<string[]>([]);
  const [matchedUids, setMatchedUids] = useState<string[]>([]);
  const [selectedWordUid, setSelectedWordUid] = useState<string | null>(null);
  const [selectedMeaningUid, setSelectedMeaningUid] = useState<string | null>(null);
  const [wrongPairFlash, setWrongPairFlash] = useState<{ w: string; m: string } | null>(null);

  const [score, setScore] = useState(0);
  const [xpEarned, setXpEarned] = useState(0);
  const [questionNum, setQuestionNum] = useState(0);
  const [levelUp, setLevelUp] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [finishResult, setFinishResult] = useState<GameFinishResult | null>(null);

  const loadNext = async (sid: string, hadAnswered: boolean, pool: PoolSource) => {
    try {
      const nw = await gamesApi.nextWord(sid);
      if (nw.finished) {
        if (!hadAnswered) {
          setErrorMsg(pool === 'own' ? gt.ownEmptyError : gt.generalEmptyError);
          setStage('error');
          return;
        }
        try {
          const res = await gamesApi.finishSession(sid);
          setFinishResult(res);
        } catch {
          /* sessiz */
        }
        setStage('done');
        return;
      }
      setCurrent(nw);
      setSelectedId(null);
      setFeedback(null);
      setRevealed(nw.revealed ?? '');
      setGuessedLetters([]);
      setWrongGuesses(0);
      setMaxWrongGuesses(nw.max_wrong_guesses ?? 6);
      setRoundResult(null);
      setRevealedWord(null);
      setQuestionNum((n) => n + 1);
      setStage('playing');
    } catch {
      setErrorMsg(gt.genericError);
      setStage('error');
    }
  };

  // ── eşleştirme (matching) — tek next-word yerine MATCHING_BATCH_SIZE kadar
  // kelimeyi arka arkaya çekip bir "tur" oluşturur (bkz. web/game/page.tsx'teki
  // aynı isimli fonksiyon — backend tarafında ek bir değişiklik gerekmiyor). ──
  const loadMatchingBatch = async (sid: string, hadAnswered: boolean, pool: PoolSource) => {
    setStage('loading');
    try {
      const items: MatchingItem[] = [];
      const seenKeys = new Set<string>();
      const maxTries = MATCHING_BATCH_SIZE * 6;
      let tries = 0;
      while (items.length < MATCHING_BATCH_SIZE && tries < maxTries) {
        tries++;
        const nw = await gamesApi.nextWord(sid);
        if (nw.finished) break;
        const key = nw.word_id ?? nw.general_word_id ?? null;
        if (key && seenKeys.has(key)) continue;
        if (key) seenKeys.add(key);
        items.push({
          uid: `${items.length}-${key ?? 'x'}-${Math.random().toString(36).slice(2)}`,
          word: nw.word ?? '',
          meaning: nw.meaning ?? '',
          word_id: nw.word_id ?? undefined,
          general_word_id: nw.general_word_id ?? undefined,
        });
      }
      if (items.length === 0) {
        if (!hadAnswered) {
          setErrorMsg(pool === 'own' ? gt.ownEmptyError : gt.generalEmptyError);
          setStage('error');
          return;
        }
        try {
          const res = await gamesApi.finishSession(sid);
          setFinishResult(res);
        } catch {
          /* sessiz */
        }
        setStage('done');
        return;
      }
      setMatchingItems(items);
      setMatchedUids([]);
      setSelectedWordUid(null);
      setSelectedMeaningUid(null);
      setWrongPairFlash(null);
      setMatchingWordSlots(shuffleArray(items.map((it) => it.uid)));
      setMatchingMeaningSlots(shuffleArray(items.map((it) => it.uid)));
      setQuestionNum((n) => n + items.length);
      setStage('playing');
    } catch {
      setErrorMsg(gt.genericError);
      setStage('error');
    }
  };

  // ── eşleştirme (matching) — kelime/anlam çifti tıklanınca kontrol ──
  const attemptMatch = async (wordUid: string, meaningUid: string, sid: string, pool: PoolSource) => {
    if (wordUid === meaningUid) {
      const newMatched = [...matchedUids, wordUid];
      setMatchedUids(newMatched);
      setSelectedWordUid(null);
      setSelectedMeaningUid(null);
      setScore((s) => s + 1);
      const item = matchingItems.find((it) => it.uid === wordUid);
      if (item) {
        try {
          const res = await gamesApi.submitAttempt(sid, {
            word_id: item.word_id,
            general_word_id: item.general_word_id,
            is_correct: true,
          });
          setXpEarned((x) => x + res.xp_awarded);
          if (res.leveled_up) setLevelUp(res.new_level);
        } catch {
          /* sessiz */
        }
      }
      if (newMatched.length === matchingItems.length) {
        setTimeout(() => loadMatchingBatch(sid, true, pool), 600);
      }
    } else {
      setWrongPairFlash({ w: wordUid, m: meaningUid });
      setTimeout(() => {
        setWrongPairFlash(null);
        setSelectedWordUid(null);
        setSelectedMeaningUid(null);
      }, 600);
    }
  };

  const handleMatchWordClick = (uid: string) => {
    if (matchedUids.includes(uid) || wrongPairFlash || !sessionId) return;
    setSelectedWordUid(uid);
    if (selectedMeaningUid) {
      attemptMatch(uid, selectedMeaningUid, sessionId, poolSource);
    }
  };

  const handleMatchMeaningClick = (uid: string) => {
    if (matchedUids.includes(uid) || wrongPairFlash || !sessionId) return;
    setSelectedMeaningUid(uid);
    if (selectedWordUid) {
      attemptMatch(selectedWordUid, uid, sessionId, poolSource);
    }
  };

  const start = async (mode: GameMode, pool: PoolSource, dir: Direction) => {
    setGameMode(mode);
    setPoolSource(pool);
    setStage('loading');
    setErrorMsg('');
    setScore(0);
    setXpEarned(0);
    setQuestionNum(0);
    setLevelUp(null);
    setFinishResult(null);
    if (mode === 'matching') {
      setMatchingItems([]);
      setMatchedUids([]);
      setSelectedWordUid(null);
      setSelectedMeaningUid(null);
      setWrongPairFlash(null);
      setMatchingWordSlots([]);
      setMatchingMeaningSlots([]);
    }
    try {
      const session = await gamesApi.createSession(mode, pool, dir);
      setSessionId(session.id);
      if (mode === 'matching') {
        await loadMatchingBatch(session.id, false, pool);
      } else {
        await loadNext(session.id, false, pool);
      }
    } catch {
      setErrorMsg(gt.genericError);
      setStage('error');
    }
  };

  const handleAnswer = async (optionId: string, optionText: string) => {
    if (selectedId || !current || !sessionId) return;
    setSelectedId(optionId);
    const currentDirection = current.direction ?? direction;
    const correctText =
      currentDirection === 'meaning_to_word' || currentDirection === 'definition_to_word' ? current.word : current.meaning;
    const isCorrect = optionText === correctText;
    setFeedback(isCorrect);
    try {
      const res = await gamesApi.submitAttempt(sessionId, {
        word_id: current.word_id ?? undefined,
        general_word_id: current.general_word_id ?? undefined,
        is_correct: isCorrect,
      });
      setScore(res.session_score);
      setXpEarned((x) => x + res.xp_awarded);
      if (res.leveled_up) setLevelUp(res.new_level);
    } catch {
      /* sessiz */
    }
    setTimeout(() => loadNext(sessionId, true, poolSource), 900);
  };

  const handleGuessLetter = async (letter: string) => {
    if (letterBusy || roundResult || !sessionId || guessedLetters.includes(letter)) return;
    setLetterBusy(true);
    try {
      const res = await gamesApi.guessLetter(sessionId, letter);
      setRevealed(res.revealed);
      setGuessedLetters(res.guessed_letters);
      setWrongGuesses(res.wrong_guesses);
      setMaxWrongGuesses(res.max_wrong_guesses);
      setXpEarned((x) => x + res.xp_awarded);
      if (res.leveled_up) setLevelUp(res.new_level);

      if (res.is_complete) {
        setScore((s) => s + 1);
        setRoundResult('won');
        setRevealedWord(res.word ?? null);
        setTimeout(() => sessionId && loadNext(sessionId, true, poolSource), 1400);
      } else if (res.is_game_over) {
        setRoundResult('lost');
        setRevealedWord(res.word ?? null);
        setTimeout(() => sessionId && loadNext(sessionId, true, poolSource), 1800);
      }
    } catch {
      /* sessiz */
    } finally {
      setLetterBusy(false);
    }
  };

  const handleFinish = async () => {
    if (!sessionId) return;
    setStage('loading');
    try {
      const res = await gamesApi.finishSession(sessionId);
      setFinishResult(res);
    } catch {
      /* sessiz */
    }
    setStage('done');
  };

  // ── Mod seçimi ──
  if (stage === 'mode') {
    return (
      <CenterScreen>
        <Text style={styles.emoji}>🎮</Text>
        <Title c={c}>{gt.pageTitle}</Title>
        <Subtitle c={c}>{gt.pageSubtitle}</Subtitle>
        <SectionLabel c={c}>{gt.chooseModeTitle}</SectionLabel>
        <OptionButton
          title={gt.modeMultipleLabel}
          desc={gt.modeMultipleDesc}
          onPress={() => {
            setGameMode('multiple_choice');
            setStage('direction');
          }}
        />
        <OptionButton
          title={gt.modeWordleLabel}
          desc={gt.modeWordleDesc}
          onPress={() => {
            setGameMode('wordle');
            setDirection('meaning_to_word');
            setStage('setup');
          }}
        />
        <OptionButton
          title={gt.modeMatchingLabel}
          desc={gt.modeMatchingDesc}
          onPress={() => {
            setGameMode('matching');
            setDirection('meaning_to_word');
            setStage('setup');
          }}
        />
      </CenterScreen>
    );
  }

  // ── Yön seçimi ──
  if (stage === 'direction') {
    return (
      <CenterScreen>
        <Title c={c}>{gt.pageTitle}</Title>
        <Subtitle c={c}>{gt.chooseDirectionTitle}</Subtitle>
        <OptionButton title={gt.dirWordToMeaningLabel} desc={gt.dirWordToMeaningDesc} onPress={() => { setDirection('word_to_meaning'); setStage('setup'); }} />
        <OptionButton title={gt.dirMeaningToWordLabel} desc={gt.dirMeaningToWordDesc} onPress={() => { setDirection('meaning_to_word'); setStage('setup'); }} />
        <OptionButton title={gt.dirDefinitionToWordLabel} desc={gt.dirDefinitionToWordDesc} onPress={() => { setDirection('definition_to_word'); setStage('setup'); }} />
        <BackLink label={gt.backBtn} onPress={() => setStage('mode')} />
      </CenterScreen>
    );
  }

  // ── Havuz seçimi / Yükleniyor ──
  if (stage === 'setup' || stage === 'loading') {
    return (
      <CenterScreen>
        <Title c={c}>{gt.pageTitle}</Title>
        <Subtitle c={c}>{gt.choosePoolTitle}</Subtitle>
        {stage === 'loading' ? (
          <View style={{ paddingVertical: spacing.xl, alignItems: 'center' }}>
            <ActivityIndicator color={c.primary} />
            <Text style={{ color: c.textMuted, marginTop: spacing.sm }}>{gt.loadingLabel}</Text>
          </View>
        ) : (
          <>
            <OptionButton title={gt.poolGeneralLabel} desc={gt.poolGeneralDesc} onPress={() => start(gameMode, 'general', direction)} />
            {direction !== 'definition_to_word' && (
              <OptionButton title={gt.poolOwnLabel} desc={gt.poolOwnDesc} onPress={() => start(gameMode, 'own', direction)} />
            )}
            <BackLink label={gt.backBtn} onPress={() => setStage(gameMode === 'multiple_choice' ? 'direction' : 'mode')} />
          </>
        )}
      </CenterScreen>
    );
  }

  // ── Hata ──
  if (stage === 'error') {
    return (
      <CenterScreen>
        <Card style={{ backgroundColor: c.warningSoft, borderColor: c.warningSoft, marginBottom: spacing.lg }}>
          <Text style={{ color: c.warning, fontSize: 13, textAlign: 'center' }}>{errorMsg}</Text>
        </Card>
        <Button title={gt.playAgainBtn} onPress={() => setStage('mode')} />
      </CenterScreen>
    );
  }

  // ── Bitti ──
  if (stage === 'done') {
    const total = finishResult?.word_count ?? questionNum;
    const correct = finishResult?.correct_count ?? score;
    const xp = finishResult?.xp_earned ?? xpEarned;
    return (
      <CenterScreen>
        <Text style={styles.emoji}>🏆</Text>
        <Title c={c}>{gt.doneTitle}</Title>
        <Subtitle c={c}>{gt.doneScoreTpl.replace('{correct}', String(correct)).replace('{total}', String(total))}</Subtitle>
        <Card style={{ backgroundColor: c.accentSoft, borderColor: c.accentSoft, alignItems: 'center', marginTop: spacing.md, marginBottom: spacing.lg }}>
          <Text style={{ color: c.accent, fontWeight: '700' }}>{gt.doneXpTpl.replace('{xp}', String(xp))}</Text>
        </Card>
        <Button title={gt.playAgainBtn} onPress={() => setStage('mode')} />
        <View style={{ height: spacing.sm }} />
        <Button title={gt.backToDashboardBtn} variant="ghost" onPress={() => router.push('/(app)/dashboard')} />
      </CenterScreen>
    );
  }

  // ── Oynanış: eşleştirme (matching) — current tekil kelime state'ini
  // kullanmıyor (matchingItems kullanıyor), bu yüzden ayrı, erken bir return
  // olarak ele alınıyor (bkz. web/game/page.tsx'teki aynı desen). ──
  if (gameMode === 'matching') {
    if (matchingItems.length === 0) return null;
    return (
      <ScreenContainer>
        <View style={styles.playHeader}>
          <Text style={{ color: c.text, fontWeight: '600', fontSize: 13 }}>{gt.questionCounterTpl.replace('{n}', String(questionNum))}</Text>
          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <Text style={{ color: c.success, fontSize: 12, fontWeight: '600' }}>{gt.scoreLabel}: {score}</Text>
            <Text style={{ color: c.accent, fontSize: 12, fontWeight: '600' }}>✨ {xpEarned} {gt.xpLabel}</Text>
          </View>
        </View>

        {levelUp !== null && (
          <Card style={{ backgroundColor: c.accentSoft, borderColor: c.accentSoft, marginBottom: spacing.md, alignItems: 'center' }}>
            <Text style={{ color: c.accent, fontWeight: '700' }}>{gt.levelUpTpl.replace('{n}', String(levelUp))}</Text>
          </Card>
        )}

        <Text style={{ color: c.textMuted, fontSize: 11, fontWeight: '600', textAlign: 'center', textTransform: 'uppercase', marginBottom: spacing.md }}>
          {gt.matchingPromptLabel}
        </Text>

        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <View style={{ flex: 1, gap: spacing.sm }}>
            {matchingWordSlots.map((uid) => {
              const item = matchingItems.find((it) => it.uid === uid);
              if (!item) return null;
              const isMatched = matchedUids.includes(uid);
              const isSelected = selectedWordUid === uid;
              const isWrong = wrongPairFlash?.w === uid;
              let borderColor = c.border;
              let bg = c.surface;
              let textColor = c.text;
              if (isMatched) { borderColor = c.success; bg = c.successSoft; textColor = c.success; }
              else if (isWrong) { borderColor = c.danger; bg = c.dangerSoft; textColor = c.danger; }
              else if (isSelected) { borderColor = c.primary; bg = c.primarySoft; textColor = c.primary; }
              return (
                <Pressable
                  key={uid}
                  disabled={isMatched}
                  onPress={() => handleMatchWordClick(uid)}
                  style={[styles.matchTile, { borderColor, backgroundColor: bg, opacity: isMatched ? 0.6 : 1 }]}
                >
                  <Text style={{ color: textColor, fontSize: 13, fontWeight: '600', textAlign: 'center' }}>{item.word}</Text>
                </Pressable>
              );
            })}
          </View>
          <View style={{ flex: 1, gap: spacing.sm }}>
            {matchingMeaningSlots.map((uid) => {
              const item = matchingItems.find((it) => it.uid === uid);
              if (!item) return null;
              const isMatched = matchedUids.includes(uid);
              const isSelected = selectedMeaningUid === uid;
              const isWrong = wrongPairFlash?.m === uid;
              let borderColor = c.border;
              let bg = c.surface;
              let textColor = c.text;
              if (isMatched) { borderColor = c.success; bg = c.successSoft; textColor = c.success; }
              else if (isWrong) { borderColor = c.danger; bg = c.dangerSoft; textColor = c.danger; }
              else if (isSelected) { borderColor = c.primary; bg = c.primarySoft; textColor = c.primary; }
              return (
                <Pressable
                  key={uid}
                  disabled={isMatched}
                  onPress={() => handleMatchMeaningClick(uid)}
                  style={[styles.matchTile, { borderColor, backgroundColor: bg, opacity: isMatched ? 0.6 : 1 }]}
                >
                  <Text style={{ color: textColor, fontSize: 13, fontWeight: '600', textAlign: 'center' }}>{item.meaning}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Pressable onPress={handleFinish} style={{ alignItems: 'center', marginTop: spacing.lg }}>
          <Text style={{ color: c.textMuted, fontSize: 12, textDecorationLine: 'underline' }}>{gt.finishBtn}</Text>
        </Pressable>
      </ScreenContainer>
    );
  }

  // ── Oynanış ──
  if (!current) return null;
  const isWordle = gameMode === 'wordle';
  const activeDirection = current.direction ?? direction;
  const isDefinition = activeDirection === 'definition_to_word';
  const isReverse = !isWordle && (activeDirection === 'meaning_to_word' || isDefinition);

  return (
    <ScreenContainer>
      <View style={styles.playHeader}>
        <Text style={{ color: c.text, fontWeight: '600', fontSize: 13 }}>{gt.questionCounterTpl.replace('{n}', String(questionNum))}</Text>
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <Text style={{ color: c.success, fontSize: 12, fontWeight: '600' }}>{gt.scoreLabel}: {score}</Text>
          <Text style={{ color: c.accent, fontSize: 12, fontWeight: '600' }}>✨ {xpEarned} {gt.xpLabel}</Text>
        </View>
      </View>

      {levelUp !== null && (
        <Card style={{ backgroundColor: c.accentSoft, borderColor: c.accentSoft, marginBottom: spacing.md, alignItems: 'center' }}>
          <Text style={{ color: c.accent, fontWeight: '700' }}>{gt.levelUpTpl.replace('{n}', String(levelUp))}</Text>
        </Card>
      )}

      {!isWordle && (
        <>
          <Card style={{ alignItems: 'center', marginBottom: spacing.md }}>
            <Text style={{ color: c.textMuted, fontSize: 11, fontWeight: '600', marginBottom: spacing.sm, textTransform: 'uppercase' }}>
              {isDefinition ? gt.questionPromptDefinition : isReverse ? gt.questionPromptReverse : gt.questionPrompt}
            </Text>
            <Text style={{ color: c.text, fontSize: 26, fontWeight: '700', textAlign: 'center' }}>
              {isReverse ? current.meaning : current.word}
            </Text>
            {!isReverse && current.example && (
              <Text style={{ color: c.textMuted, fontSize: 13, fontStyle: 'italic', marginTop: spacing.sm, textAlign: 'center' }}>
                “{current.example}”
              </Text>
            )}
          </Card>

          <View style={{ gap: spacing.sm }}>
            {(current.options || []).map((opt) => {
              const correctText = isReverse ? current.word : current.meaning;
              const isCorrectOption = opt.text === correctText;
              const isSelected = opt.id === selectedId;
              const answered = selectedId !== null;
              let borderColor = c.border;
              let bg = c.surface;
              let textColor = c.text;
              if (answered) {
                if (isCorrectOption) {
                  borderColor = c.success;
                  bg = c.successSoft;
                  textColor = c.success;
                } else if (isSelected) {
                  borderColor = c.danger;
                  bg = c.dangerSoft;
                  textColor = c.danger;
                } else {
                  borderColor = c.border;
                  textColor = c.textMuted;
                }
              }
              return (
                <Pressable
                  key={opt.id}
                  disabled={answered}
                  onPress={() => handleAnswer(opt.id, opt.text)}
                  style={[styles.optionRow, { borderColor, backgroundColor: bg }]}
                >
                  <Text style={{ color: textColor, fontSize: 14, fontWeight: '600', flex: 1 }}>{opt.text}</Text>
                </Pressable>
              );
            })}
          </View>

          {feedback !== null && (
            <Text style={{ color: feedback ? c.success : c.danger, fontWeight: '700', textAlign: 'center', marginTop: spacing.md }}>
              {feedback ? gt.correctLabel : gt.wrongLabel}
            </Text>
          )}
        </>
      )}

      {isWordle && (
        <>
          <Card style={{ alignItems: 'center', marginBottom: spacing.md }}>
            <Text style={{ color: c.textMuted, fontSize: 11, fontWeight: '600', marginBottom: 4, textTransform: 'uppercase' }}>
              {gt.hangmanHintLabel}
            </Text>
            <Text style={{ color: c.text, fontSize: 16, fontWeight: '600', textAlign: 'center' }}>{current.meaning}</Text>
          </Card>

          <View style={styles.livesRow}>
            <Text style={{ color: c.textMuted, fontSize: 11, fontWeight: '600', marginRight: 4 }}>{gt.livesLabel}</Text>
            {Array.from({ length: maxWrongGuesses }).map((_, i) => (
              <Text key={i} style={{ fontSize: 16 }}>{i < maxWrongGuesses - wrongGuesses ? '❤️' : '🤍'}</Text>
            ))}
          </View>

          <View style={styles.revealRow}>
            {revealed.replace(/\s+/g, '').split('').map((ch, i) => (
              <View key={i} style={[styles.letterBox, { borderColor: ch === '_' ? c.border : c.success, backgroundColor: ch === '_' ? c.background : c.successSoft }]}>
                <Text style={{ fontSize: 18, fontWeight: '700', color: ch === '_' ? 'transparent' : c.success, textTransform: 'uppercase' }}>
                  {ch === '_' ? '·' : ch}
                </Text>
              </View>
            ))}
          </View>

          {roundResult && (
            <Card style={{ backgroundColor: roundResult === 'won' ? c.successSoft : c.dangerSoft, borderColor: roundResult === 'won' ? c.successSoft : c.dangerSoft, alignItems: 'center', marginBottom: spacing.md }}>
              <Text style={{ color: roundResult === 'won' ? c.success : c.danger, fontWeight: '700' }}>
                {roundResult === 'won' ? gt.wordleWonTitle : gt.wordleLostTitle}
              </Text>
              {roundResult === 'lost' && revealedWord && (
                <Text style={{ color: c.danger, marginTop: 4 }}>{gt.correctWordTpl.replace('{word}', revealedWord)}</Text>
              )}
            </Card>
          )}

          {!roundResult && (
            <View style={{ alignItems: 'center', gap: 6 }}>
              {KEYBOARD_ROWS.map((row, i) => (
                <View key={i} style={{ flexDirection: 'row', gap: 5 }}>
                  {row.split('').map((letter) => {
                    const lower = letter.toLowerCase();
                    const isGuessed = guessedLetters.includes(lower);
                    const isCorrectGuess = isGuessed && revealed.toLowerCase().includes(lower);
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

          {guessedLetters.length > 0 && (
            <Text style={{ color: c.textMuted, fontSize: 11, textAlign: 'center', marginTop: spacing.md }}>
              {gt.guessedLabel}: {guessedLetters.join(', ').toUpperCase()}
            </Text>
          )}
        </>
      )}

      <Pressable onPress={handleFinish} style={{ alignItems: 'center', marginTop: spacing.lg }}>
        <Text style={{ color: c.textMuted, fontSize: 12, textDecorationLine: 'underline' }}>{gt.finishBtn}</Text>
      </Pressable>
    </ScreenContainer>
  );
}

function CenterScreen({ children }: { children: React.ReactNode }) {
  return (
    <ScreenContainer>
      <View style={styles.center}>{children}</View>
    </ScreenContainer>
  );
}

function Title({ children, c }: { children: React.ReactNode; c: ReturnType<typeof useThemeColors> }) {
  return <Text style={{ fontSize: 22, fontWeight: '700', color: c.text, textAlign: 'center', marginTop: spacing.sm }}>{children}</Text>;
}
function Subtitle({ children, c }: { children: React.ReactNode; c: ReturnType<typeof useThemeColors> }) {
  return <Text style={{ fontSize: 13, color: c.textSecondary, textAlign: 'center', marginTop: 4, marginBottom: spacing.lg }}>{children}</Text>;
}
function SectionLabel({ children, c }: { children: React.ReactNode; c: ReturnType<typeof useThemeColors> }) {
  return <Text style={{ fontSize: 11, fontWeight: '700', color: c.textMuted, textTransform: 'uppercase', alignSelf: 'flex-start', marginBottom: spacing.sm }}>{children}</Text>;
}

function OptionButton({ title, desc, onPress }: { title: string; desc: string; onPress: () => void }) {
  const c = useThemeColors();
  return (
    <Pressable onPress={onPress} style={[styles.optionCard, { borderColor: c.border, backgroundColor: c.surface }]}>
      <Text style={{ color: c.text, fontWeight: '700', fontSize: 14 }}>{title}</Text>
      <Text style={{ color: c.textMuted, fontSize: 12, marginTop: 2 }}>{desc}</Text>
    </Pressable>
  );
}

function BackLink({ label, onPress }: { label: string; onPress: () => void }) {
  const c = useThemeColors();
  return (
    <Pressable onPress={onPress} style={{ marginTop: spacing.md }}>
      <Text style={{ color: c.textMuted, fontSize: 12 }}>{'← ' + label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', paddingTop: spacing.xl },
  emoji: { fontSize: 44, marginBottom: spacing.sm },
  optionCard: { width: '100%', borderWidth: 1.5, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm },
  playHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  optionRow: { borderWidth: 1.5, borderRadius: radius.md, padding: spacing.md, flexDirection: 'row', alignItems: 'center' },
  livesRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 2, marginBottom: spacing.md },
  revealRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6, marginBottom: spacing.md },
  letterBox: { width: 32, height: 40, borderWidth: 2, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  key: { width: 28, height: 36, borderRadius: radius.sm, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  matchTile: { borderWidth: 2, borderRadius: radius.md, paddingVertical: spacing.sm, paddingHorizontal: spacing.sm, minHeight: 52, alignItems: 'center', justifyContent: 'center' },
});
