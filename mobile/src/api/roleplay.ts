// src/api/roleplay.ts — "Roleplay/diyalog botu" API istemcisi. exams.ts/
// dailyChallenge.ts ile aynı desen.
import { api } from './client';
import type {
  RoleplayFinishResponse,
  RoleplayMessageResponse,
  RoleplayScenario,
  RoleplaySessionResponse,
} from './types';

export const roleplayApi = {
  listScenarios: async (): Promise<RoleplayScenario[]> => {
    const res = await api.get<RoleplayScenario[]>('/roleplay/scenarios');
    return res.data;
  },
  startSession: async (scenario_slug: string): Promise<RoleplaySessionResponse> => {
    const res = await api.post<RoleplaySessionResponse>('/roleplay/sessions', { scenario_slug });
    return res.data;
  },
  sendMessage: async (sessionId: string, content: string): Promise<RoleplayMessageResponse> => {
    const res = await api.post<RoleplayMessageResponse>(`/roleplay/sessions/${sessionId}/messages`, { content });
    return res.data;
  },
  finishSession: async (sessionId: string): Promise<RoleplayFinishResponse> => {
    const res = await api.post<RoleplayFinishResponse>(`/roleplay/sessions/${sessionId}/finish`);
    return res.data;
  },
};
