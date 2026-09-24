// src/api/dailyChallenge.ts — "Günlük Kelime Avı" (24 Eylül 2026, Madde 2
// seçimi) API istemcisi. exams.ts/games.ts ile aynı desen.
import { api } from './client';
import type { DailyChallengeGuessResult, DailyChallengeState } from './types';

export const dailyChallengeApi = {
  // Gün için henüz kelime üretilmediyse backend null döner (cron henüz
  // çalışmadı / bu dil için uygun kelime yok).
  today: async (): Promise<DailyChallengeState | null> => {
    const res = await api.get<DailyChallengeState | null>('/daily-challenge/today');
    return res.data;
  },
  guessLetter: async (letter: string): Promise<DailyChallengeGuessResult> => {
    const res = await api.post<DailyChallengeGuessResult>('/daily-challenge/guess-letter', { letter });
    return res.data;
  },
};
