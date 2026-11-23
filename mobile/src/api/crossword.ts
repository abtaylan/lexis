// src/api/crossword.ts — Çengel Bulmaca API istemcisi (18 Kasım 2026
// kullanıcı isteği). dailyChallenge.ts / games.ts ile aynı desen.
//
// 23 Kasım 2026: her çağrıya opsiyonel `mode` parametresi eklendi (standard/
// reverse/own_pool, bkz. api/types.ts CrosswordMode) — backend'e query
// param olarak iletilir, verilmezse backend varsayılanı (standard) kullanır.
import { api } from './client';
import type { CrosswordAttemptResult, CrosswordLevelResponse, CrosswordLevelsResponse, CrosswordMode } from './types';

export const crosswordApi = {
  levels: async (mode: CrosswordMode = 'standard'): Promise<CrosswordLevelsResponse> => {
    const res = await api.get<CrosswordLevelsResponse>('/crossword/levels', { params: { mode } });
    return res.data;
  },
  level: async (level: number, mode: CrosswordMode = 'standard'): Promise<CrosswordLevelResponse> => {
    const res = await api.get<CrosswordLevelResponse>(`/crossword/levels/${level}`, { params: { mode } });
    return res.data;
  },
  attemptWord: async (
    level: number,
    wordId: string,
    answer: string,
    mode: CrosswordMode = 'standard'
  ): Promise<CrosswordAttemptResult> => {
    const res = await api.post<CrosswordAttemptResult>(
      `/crossword/levels/${level}/words/${wordId}/attempt`,
      { answer },
      { params: { mode } }
    );
    return res.data;
  },
};
