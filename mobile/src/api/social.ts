import { api } from './client';
import type {
  ChallengeItem,
  ChallengesList,
  ConversationItem,
  ConversationThread,
  FriendshipItem,
  MessageItem,
  PendingRequests,
  PublicProfile,
  UserCard,
} from './types';

// src/api/social.ts — web'deki lib/api.ts içindeki socialApi'nin mobil
// karşılığı, birebir aynı endpoint'ler. Meydan okuma (challenge) metodları
// forward-compat için eklendi ama mobil Faz 3 UI'ı henüz bunları çağırmıyor
// (bkz. friends.tsx üstündeki not).
export const socialApi = {
  searchUsers: async (q: string, limit = 20): Promise<UserCard[]> => {
    const res = await api.get('/social/users/search', { params: { q, limit } });
    return res.data.items;
  },

  // ── Arkadaşlık ──
  getFriends: async (): Promise<FriendshipItem[]> => {
    const res = await api.get('/social/friends');
    return res.data.items;
  },
  getPendingRequests: async (): Promise<PendingRequests> => {
    const res = await api.get<PendingRequests>('/social/friends/pending');
    return res.data;
  },
  sendFriendRequest: async (username: string): Promise<FriendshipItem> => {
    const res = await api.post<FriendshipItem>('/social/friends/request', { username });
    return res.data;
  },
  acceptFriendRequest: async (friendshipId: string): Promise<FriendshipItem> => {
    const res = await api.post<FriendshipItem>(`/social/friends/${friendshipId}/accept`);
    return res.data;
  },
  declineFriendRequest: async (friendshipId: string): Promise<FriendshipItem> => {
    const res = await api.post<FriendshipItem>(`/social/friends/${friendshipId}/decline`);
    return res.data;
  },
  removeFriend: async (userId: string): Promise<void> => {
    await api.delete(`/social/friends/${userId}`);
  },

  // ── Takip ──
  follow: async (userId: string): Promise<void> => {
    await api.post(`/social/follow/${userId}`);
  },
  unfollow: async (userId: string): Promise<void> => {
    await api.delete(`/social/follow/${userId}`);
  },
  getFollowers: async (): Promise<UserCard[]> => {
    const res = await api.get('/social/followers');
    return res.data.items;
  },
  getFollowing: async (): Promise<UserCard[]> => {
    const res = await api.get('/social/following');
    return res.data.items;
  },

  // ── Herkese açık profil ──
  getPublicProfile: async (username: string): Promise<PublicProfile> => {
    const res = await api.get<PublicProfile>(`/social/profile/${username}`);
    return res.data;
  },

  // ── Engelleme ──
  blockUser: async (userId: string): Promise<void> => {
    await api.post(`/social/block/${userId}`);
  },
  unblockUser: async (userId: string): Promise<void> => {
    await api.delete(`/social/block/${userId}`);
  },
  getBlockedUsers: async (): Promise<UserCard[]> => {
    const res = await api.get('/social/blocked');
    return res.data.items;
  },

  // ── Şikayet/Rapor — Guideline 1.2 (Safety - UGC) için engellemeye ek
  // moderasyon yolu. Kullanıcı ve/veya belirli bir mesajı raporlar.
  reportUser: async (userId: string, reason: string, messageId?: string): Promise<void> => {
    await api.post(`/social/report/${userId}`, { reason, message_id: messageId });
  },

  // ── Mesajlaşma — polling tabanlı, gerçek zamanlı değil (web ile aynı) ──
  getConversations: async (): Promise<ConversationItem[]> => {
    const res = await api.get('/social/conversations');
    return res.data.items;
  },
  getConversationThread: async (username: string): Promise<ConversationThread> => {
    const res = await api.get<ConversationThread>(`/social/conversations/${username}`);
    return res.data;
  },
  sendMessage: async (username: string, body: string): Promise<MessageItem> => {
    const res = await api.post<MessageItem>(`/social/conversations/${username}`, { body });
    return res.data;
  },
  getUnreadMessageCount: async (): Promise<number> => {
    const res = await api.get('/social/messages/unread-count');
    return res.data.unread_count;
  },

  // ── Meydan okuma — forward-compat, mobil UI'da henüz kullanılmıyor ──
  createChallenge: async (username: string, mode: string): Promise<ChallengeItem> => {
    const res = await api.post<ChallengeItem>('/social/challenges', { username, mode });
    return res.data;
  },
  getChallenges: async (): Promise<ChallengesList> => {
    const res = await api.get<ChallengesList>('/social/challenges');
    return res.data;
  },
  acceptChallenge: async (challengeId: string): Promise<ChallengeItem> => {
    const res = await api.post<ChallengeItem>(`/social/challenges/${challengeId}/accept`);
    return res.data;
  },
  declineChallenge: async (challengeId: string): Promise<ChallengeItem> => {
    const res = await api.post<ChallengeItem>(`/social/challenges/${challengeId}/decline`);
    return res.data;
  },
  cancelChallenge: async (challengeId: string): Promise<void> => {
    await api.post(`/social/challenges/${challengeId}/cancel`);
  },
  submitChallengeScore: async (challengeId: string, sessionId: string): Promise<ChallengeItem> => {
    const res = await api.post<ChallengeItem>(`/social/challenges/${challengeId}/submit`, {
      session_id: sessionId,
    });
    return res.data;
  },
};
