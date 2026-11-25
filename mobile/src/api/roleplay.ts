// src/api/roleplay.ts — "Roleplay/diyalog botu" API istemcisi (25 Kasım
// 2026'da dallanan diyalog ağacına geçiş — bkz. backend/app/services/
// roleplay_service.py modül docstring'i). exams.ts/dailyChallenge.ts ile
// aynı desen.
import { api } from './client';
import type {
  RoleplayCategory,
  RoleplayChoiceResponse,
  RoleplayFinishResponse,
  RoleplaySessionResponse,
} from './types';

export const roleplayApi = {
  listCategories: async (): Promise<RoleplayCategory[]> => {
    const res = await api.get<RoleplayCategory[]>('/roleplay/categories');
    return res.data;
  },
  startSession: async (scenario_slug: string): Promise<RoleplaySessionResponse> => {
    const res = await api.post<RoleplaySessionResponse>('/roleplay/sessions', { scenario_slug });
    return res.data;
  },
  chooseOption: async (sessionId: string, optionId: string): Promise<RoleplayChoiceResponse> => {
    const res = await api.post<RoleplayChoiceResponse>(`/roleplay/sessions/${sessionId}/choices`, {
      option_id: optionId,
    });
    return res.data;
  },
  finishSession: async (sessionId: string): Promise<RoleplayFinishResponse> => {
    const res = await api.post<RoleplayFinishResponse>(`/roleplay/sessions/${sessionId}/finish`);
    return res.data;
  },
};
