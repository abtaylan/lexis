// src/api/duels.ts — web'deki lib/api.ts içindeki duelsApi'nin mobil
// karşılığı, birebir aynı endpoint'ler. Backend: backend/app/api/routes/duels.py
import { api } from './client';
import type {
  DuelAnswerResponse,
  DuelGuessLetterResponse,
  DuelInviteItem,
  DuelInvitesListResponse,
  DuelListResponse,
  DuelMode,
  DuelResponse,
  DuelRoundPublic,
  DuelStatusResponse,
} from './types';

export const duelsApi = {
  // 18 Eylul 2026 -- mode eklendi ('multiple_choice' | 'wordle', bkz.
  // backend schemas/duels.py::DuelCreate). Onceden burasi hep varsayilan
  // (multiple_choice) moda sabitti -- wordle duellosu HICBIR istemciden
  // olusturulamiyordu (backend hazir ama erisilemezdi).
  create: async (mode: DuelMode = 'multiple_choice', max_players = 8, round_count = 10): Promise<DuelResponse> => {
    const res = await api.post<DuelResponse>('/duels', { mode, max_players, round_count });
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
  invite: async (
    username: string,
    mode: DuelMode = 'multiple_choice',
    max_players = 2,
    round_count = 10
  ): Promise<DuelInviteItem> => {
    const res = await api.post<DuelInviteItem>('/duels/invite', { username, mode, max_players, round_count });
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
  // Faz 3f (10 Eylul 2026 kullanici istegi -- "duello olusturan kisi, odayi
  // silebilmeli"): sadece oda sahibi, sadece 'waiting' durumdaki bir odayi
  // silebilir. Backend: POST /duels/{id}/cancel (bkz. duels.py cancel_duel)
  cancel: async (duelId: string): Promise<void> => {
    await api.post(`/duels/${duelId}/cancel`);
  },
  // 18 Eylul 2026 -- mode='wordle' duellolarina ozel: su anki turda TEK
  // bir harf tahmini gonderir (bkz. backend duels.py::submit_round_guess_letter).
  guessLetter: async (duelId: string, letter: string): Promise<DuelGuessLetterResponse> => {
    const res = await api.post<DuelGuessLetterResponse>(`/duels/${duelId}/rounds/guess-letter`, { letter });
    return res.data;
  },
};
