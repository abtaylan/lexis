// src/api/ads.ts — Backend: backend/app/api/routes/ads.py
import { api } from './client';

export const adsApi = {
  claimReward: async (): Promise<{ xp_awarded: number; total_xp: number; level: number; remaining: number }> => {
    const res = await api.post('/ads/reward');
    return res.data;
  },
  rewardStatus: async (): Promise<{ used_today: number; daily_limit: number; remaining: number }> => {
    const res = await api.get('/ads/reward-status');
    return res.data;
  },
};
