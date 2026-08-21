import { api } from './client';
import type {
  Direction,
  GameAttemptResult,
  GameFinishResult,
  GameMode,
  GameSession,
  GuessLetterResult,
  NextWordResult,
  PoolSource,
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
    data: { word_id?: string; general_word_id?: string; is_correct: boolean; attempts_count?: number; time_taken_ms?: number }
  ): Promise<GameAttemptResult> => {
    const res = await api.post<GameAttemptResult>(`/games/sessions/${sessionId}/attempt`, data);
    return res.data;
  },
  guessLetter: async (sessionId: string, letter: string): Promise<GuessLetterResult> => {
    const res = await api.post<GuessLetterResult>(`/games/sessions/${sessionId}/guess-letter`, { letter });
    return res.data;
  },
  finishSession: async (sessionId: string): Promise<GameFinishResult> => {
    const res = await api.post<GameFinishResult>(`/games/sessions/${sessionId}/finish`);
    return res.data;
  },
};
