// src/api/customLeagues.ts — web'deki lib/api.ts içindeki customLeaguesApi'nin
// mobil karşılığı, birebir aynı endpoint'ler. V2 Faz 3 devamı (10 Eylül 2026
// kullanıcı isteği — "kendi arkadaşlarımdan oluşan özel lig kurup kendi
// aramızda yarışabilmeliyim"). Backend: backend/app/api/routes/custom_leagues.py
import { api } from './client';
import type {
  CustomLeagueDetailResponse,
  CustomLeagueInviteItem,
  CustomLeagueInvitesListResponse,
  CustomLeagueItem,
  CustomLeagueListResponse,
} from './types';

export const customLeaguesApi = {
  create: async (name: string, max_members = 20): Promise<CustomLeagueItem> => {
    const res = await api.post<CustomLeagueItem>('/custom-leagues', { name, max_members });
    return res.data;
  },
  listMine: async (): Promise<CustomLeagueListResponse> => {
    const res = await api.get<CustomLeagueListResponse>('/custom-leagues/mine');
    return res.data;
  },
  getDetail: async (leagueId: string): Promise<CustomLeagueDetailResponse> => {
    const res = await api.get<CustomLeagueDetailResponse>(`/custom-leagues/${leagueId}`);
    return res.data;
  },
  delete: async (leagueId: string): Promise<void> => {
    await api.delete(`/custom-leagues/${leagueId}`);
  },
  leave: async (leagueId: string): Promise<void> => {
    await api.post(`/custom-leagues/${leagueId}/leave`);
  },
  invite: async (leagueId: string, username: string): Promise<CustomLeagueInviteItem> => {
    const res = await api.post<CustomLeagueInviteItem>(`/custom-leagues/${leagueId}/invite`, { username });
    return res.data;
  },
  listInvites: async (): Promise<CustomLeagueInvitesListResponse> => {
    const res = await api.get<CustomLeagueInvitesListResponse>('/custom-leagues/invites/mine');
    return res.data;
  },
  acceptInvite: async (inviteId: string): Promise<CustomLeagueItem> => {
    const res = await api.post<CustomLeagueItem>(`/custom-leagues/invites/${inviteId}/accept`);
    return res.data;
  },
  declineInvite: async (inviteId: string): Promise<void> => {
    await api.post(`/custom-leagues/invites/${inviteId}/decline`);
  },
  cancelInvite: async (inviteId: string): Promise<void> => {
    await api.post(`/custom-leagues/invites/${inviteId}/cancel`);
  },
};
