import { api } from './client';
import type { DailyProgress, LeaderboardPeriod, LeaderboardResponse, Stats, XpSummary } from './types';

export const statsApi = {
  getSummary: async (): Promise<Stats> => {
    const res = await api.get<Stats>('/stats/summary');
    return res.data;
  },
  getHistory: async (days = 14): Promise<DailyProgress[]> => {
    const res = await api.get<DailyProgress[]>('/stats/history', { params: { days } });
    return res.data;
  },
  getXp: async (): Promise<XpSummary> => {
    const res = await api.get<XpSummary>('/stats/xp');
    return res.data;
  },
  getLeaderboard: async (period: LeaderboardPeriod = 'all', limit = 5): Promise<LeaderboardResponse> => {
    const res = await api.get<LeaderboardResponse>('/stats/leaderboard', { params: { period, limit } });
    return res.data;
  },
};
