// src/api/duels.ts — web'deki lib/api.ts içindeki duelsApi'nin mobil
// karşılığı, birebir aynı endpoint'ler. Backend: backend/app/api/routes/duels.py
import { api } from './client';
import type {
  DuelAnswerResponse,
  DuelInviteItem,
  DuelInvitesListResponse,
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
  // -- Arkadasa davet (Faz 3f, 10 Eylul 2026 -- "arkadasa davet gonderme") --
  invite: async (username: string, max_players = 2, round_count = 10): Promise<DuelInviteItem> => {
    const res = await api.post<DuelInviteItem>('/duels/invite', { username, max_players, round_count });
    return res.data;
  },
  listInvites: async (): Promise<DuelInvitesListResponse> => {
    const res = await api.get<DuelInvitesListResponse>('/duels/invites/mine');
    return res.data;
  },
  acceptInvite: async (inviteId: string): Promise<DuelResponse> => {
    const res = await api.post<DuelResponse>(`/duels/invites/${inviteId}/accept`);
    return res.data;
  },
  declineInvite: async (inviteId: string): Promise<void> => {
    await api.post(`/duels/invites/${inviteId}/decline`);
  },
  cancelInvite: async (inviteId: string): Promise<void> => {
    await api.post(`/duels/invites/${inviteId}/cancel`);
  },
};
