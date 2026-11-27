import { api } from './client';
import type {
  Direction,
  GameAttemptResult,
  GameFinishResult,
  GameMode,
  GameSession,
  GuessLetterResult,
  LingoGuessResult,
  NextWordResult,
  PoolSource,
  WeakDifficultyResult,
} from './types';

export const gamesApi = {
  createSession: async (mode: GameMode, pool_source: PoolSource, direction: Direction = 'word_to_meaning'): Promise<GameSession> => {
    const res = await api.post<GameSession>('/games/sessions', { mode, pool_source, direction });
    return res.data;
  },
  nextWord: async (sessionId: string): Promise<NextWordResult> => {
    const res = await api.get<NextWordResult>(`/games/sessions/${sessionId}/next-word`);
    return res.data;
  },
  submitAttempt: async (
    sessionId: string,
    data: {
      word_id?: string;
      general_word_id?: string;
      grammar_sentence_id?: string;
      is_correct: boolean;
      attempts_count?: number;
      time_taken_ms?: number;
    }
  ): Promise<GameAttemptResult> => {
    const res = await api.post<GameAttemptResult>(`/games/sessions/${sessionId}/attempt`, data);
    return res.data;
  },
  guessLetter: async (sessionId: string, letter: string): Promise<GuessLetterResult> => {
    const res = await api.post<GuessLetterResult>(`/games/sessions/${sessionId}/guess-letter`, { letter });
    return res.data;
  },
  lingoGuess: async (sessionId: string, word: string): Promise<LingoGuessResult> => {
    const res = await api.post<LingoGuessResult>(`/games/sessions/${sessionId}/lingo/guess`, { word });
    return res.data;
  },
  // 27 Kasım 2026 -- kullanıcı kendi 10 sn'lik deneme süresi (final dışı)
  // ya da finalin ortak 120 sn'lik saati dolduğunda çağrılır.
  lingoTimeout: async (sessionId: string): Promise<LingoGuessResult> => {
    const res = await api.post<LingoGuessResult>(`/games/sessions/${sessionId}/lingo/timeout`, {});
    return res.data;
  },
  // 27 Kasım 2026 -- 6 harfli final kelimesi bilindikten sonra 7 harfliye
  // (büyük ödül) geçmeden önceki risk/bank seçimi.
  lingoFinalChoice: async (
    sessionId: string,
    choice: 'risk' | 'bank'
  ): Promise<LingoGuessResult> => {
    const res = await api.post<LingoGuessResult>(`/games/sessions/${sessionId}/lingo/final/choice`, { choice });
    return res.data;
  },
  finishSession: async (sessionId: string): Promise<GameFinishResult> => {
    const res = await api.post<GameFinishResult>(`/games/sessions/${sessionId}/finish`);
    return res.data;
  },

  // V2 madde #6 (Faz 2) -- zayif zorluk seviyesi ozeti (dashboard widget'i icin).
  weakDifficulty: async (days = 30, limit = 5): Promise<WeakDifficultyResult> => {
    const res = await api.get<WeakDifficultyResult>('/games/stats/weak-difficulty', {
      params: { days, limit },
    });
    return res.data;
  },
};
