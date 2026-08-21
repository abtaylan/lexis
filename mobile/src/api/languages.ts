import { api } from './client';
import type { Language, UserLanguage } from './types';

export const languagesApi = {
  getAll: async (): Promise<Language[]> => {
    const res = await api.get('/languages');
    return res.data.languages;
  },
};

export const userLanguagesApi = {
  getAll: async (): Promise<UserLanguage[]> => {
    const res = await api.get('/me/languages');
    return res.data.languages;
  },
  add: async (learning_lang: string, daily_goal?: number): Promise<UserLanguage> => {
    const res = await api.post<UserLanguage>('/me/languages', { learning_lang, daily_goal });
    return res.data;
  },
  remove: async (code: string): Promise<void> => {
    await api.delete(`/me/languages/${code}`);
  },
  setActive: async (learning_lang: string): Promise<UserLanguage> => {
    const res = await api.patch<UserLanguage>('/me/languages/active', { learning_lang });
    return res.data;
  },
};
