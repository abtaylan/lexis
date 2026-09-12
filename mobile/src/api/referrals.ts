import { api } from './client';
import type { ReferralsSummary } from './types';

// src/api/referrals.ts — web'deki lib/api.ts içindeki referralsApi'nin mobil
// karşılığı, birebir aynı endpoint. Ödül GRANT etme mantığı burada YOK —
// sadece okuma (bkz. backend/app/api/routes/referrals.py, ve ayrı çalışan
// backend/process_referral_rewards.py).
export const referralsApi = {
  getMine: async (): Promise<ReferralsSummary> => {
    const res = await api.get<ReferralsSummary>('/referrals/me');
    return res.data;
  },
};
