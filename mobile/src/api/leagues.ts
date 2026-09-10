// src/api/leagues.ts — web'deki lib/api.ts içindeki leaguesApi'nin mobil
// karşılığı. Backend: backend/app/api/routes/leagues.py
import { api } from './client';
import type { LeagueStatusResponse } from './types';

export const leaguesApi = {
  getMyLeague: async (): Promise<LeagueStatusResponse> => {
    const res = await api.get<LeagueStatusResponse>('/leagues/me');
    return res.data;
  },
};
