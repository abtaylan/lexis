// src/api/crossword.ts — Çengel Bulmaca API istemcisi (18 Kasım 2026
// kullanıcı isteği). dailyChallenge.ts / games.ts ile aynı desen.
import { api } from './client';
import type { CrosswordAttemptResult, CrosswordLevelResponse, CrosswordLevelsResponse } from './types';

export const crosswordApi = {
  levels: async (): Promise<CrosswordLevelsResponse> => {
    const res = await api.get<CrosswordLevelsResponse>('/crossword/levels');
    return res.data;
  },
  level: async (level: number): Promise<CrosswordLevelResponse> => {
    const res = await api.get<CrosswordLevelResponse>(`/crossword/levels/${level}`);
    return res.data;
  },
  attemptWord: async (level: number, wordId: string, answer: string): Promise<CrosswordAttemptResult> => {
    const res = await api.post<CrosswordAttemptResult>(`/crossword/levels/${level}/words/${wordId}/attempt`, { answer });
    return res.data;
  },
};
