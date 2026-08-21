import { api } from './client';
import type { Notification } from './types';

export const notificationsApi = {
  getAll: async (limit = 20): Promise<{ items: Notification[]; unread_count: number }> => {
    const res = await api.get('/notifications', { params: { limit } });
    return res.data;
  },
  markRead: async (id: string): Promise<Notification> => {
    const res = await api.patch<Notification>(`/notifications/${id}/read`);
    return res.data;
  },
  markAllRead: async (): Promise<void> => {
    await api.patch('/notifications/read-all');
  },
};

// ── Push token kaydı (Faz 1 — temel altyapı, bkz. backend/app/api/routes/push_tokens.py) ──
export const pushTokensApi = {
  register: async (data: { token: string; platform: 'ios' | 'android'; device_name?: string }): Promise<void> => {
    await api.post('/me/push-tokens', data);
  },
  unregister: async (token: string): Promise<void> => {
    await api.delete('/me/push-tokens', { data: { token } });
  },
};
