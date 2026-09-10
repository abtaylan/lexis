// src/api/leagues.ts — web'deki lib/api.ts içindeki leaguesApi'nin mobil
// karşılığı. Backend: backend/app/api/routes/leagues.py
import { api } from './client';
import type { LeagueStatusResponse, LeagueOverviewResponse } from './types';

export const leaguesApi = {
  getMyLeague: async (): Promise<LeagueStatusResponse> => {
    const res = await api.get<LeagueStatusResponse>('/leagues/me');
    return res.data;
  },
  getOverview: async (): Promise<LeagueOverviewResponse> => {
    const res = await api.get<LeagueOverviewResponse>('/leagues/overview');
    return res.data;
  },
  // Faz 3f (10 Eylul 2026) -- "tum ligleri listele, lige tiklayinca o ligin
  // icindeki user'lari sirlamayi gorecegim": herhangi bir lig grubunun tam
  // detayi (uye olmak sart degil, salt-okunur). Backend: GET /leagues/{id}
  getDetail: async (leagueId: string): Promise<LeagueStatusResponse> => {
    const res = await api.get<LeagueStatusResponse>(`/leagues/${leagueId}`);
    return res.data;
  },
};
