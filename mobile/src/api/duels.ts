// src/api/duels.ts — web'deki lib/api.ts içindeki duelsApi'nin mobil
// karşılığı, birebir aynı endpoint'ler. Backend: backend/app/api/routes/duels.py
import { api } from './client';
import type {
  DuelAnswerResponse,
  DuelListResponse,
  DuelResponse,
  DuelRoundPublic,
  DuelStatusResponse,
} from './types';

export const duelsApi = {
  create: async (): Promise<DuelResponse> => {
    const res = await api.post<DuelResponse>('/duels', {});
    return res.data;
  },
  list: async (): Promise<DuelListResponse> => {
    const res = await api.get<DuelListResponse>('/duels');
    return res.data;
  },
  getStatus: async (duelId: string): Promise<DuelStatusResponse> => {
    const res = await api.get<DuelStatusResponse>(`/duels/${duelId}`);
    return res.data;
  },
  join: async (duelId: string): Promise<DuelResponse> => {
    const res = await api.post<DuelResponse>(`/duels/${duelId}/join`);
    return res.data;
  },
  leave: async (duelId: string): Promise<void> => {
    await api.post(`/duels/${duelId}/leave`);
  },
  start: async (duelId: string): Promise<DuelResponse> => {
    const res = await api.post<DuelResponse>(`/duels/${duelId}/start`);
    return res.data;
  },
  getCurrentRound: async (duelId: string): Promise<DuelRoundPublic> => {
    const res = await api.get<DuelRoundPublic>(`/duels/${duelId}/rounds/current`);
    return res.data;
  },
  beginRound: async (duelId: string): Promise<DuelRoundPublic> => {
    const res = await api.post<DuelRoundPublic>(`/duels/${duelId}/rounds/begin`);
    return res.data;
  },
  submitAnswer: async (duelId: string, selectedOption: string): Promise<DuelAnswerResponse> => {
    const res = await api.post<DuelAnswerResponse>(`/duels/${duelId}/rounds/answer`, {
      selected_option: selectedOption,
    });
    return res.data;
  },
  advanceRound: async (duelId: string): Promise<DuelStatusResponse> => {
    const res = await api.post<DuelStatusResponse>(`/duels/${duelId}/rounds/advance`);
    return res.data;
  },
};
