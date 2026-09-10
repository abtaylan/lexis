// src/api/quests.ts — web'deki lib/api.ts içindeki questsApi'nin mobil
// karşılığı. Backend: backend/app/api/routes/quests.py
import { api } from './client';
import type { QuestListResponse } from './types';

export const questsApi = {
  list: async (): Promise<QuestListResponse> => {
    const res = await api.get<QuestListResponse>('/quests');
    return res.data;
  },
};
