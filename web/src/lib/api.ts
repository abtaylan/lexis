import axios, { AxiosInstance, AxiosError } from 'axios';
import type {
  User, Word, WordCreate, WordReview, DictionaryEntry,
  Stats, StudySchedule, PaginatedResponse
} from '@/types';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const api: AxiosInstance = axios.create({
  baseURL: `${BASE_URL}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});

// Request interceptor — attach token
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('lexis_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Response interceptor — handle 401
api.interceptors.response.use(
  (res) => res,
  (error: AxiosError) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('lexis_token');
      localStorage.removeItem('lexis_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
  // POST /auth/login  — JSON body: { email, password }
  login: async (data: { username: string; password: string }) => {
    const res = await api.post<{ access_token: string; token_type: string }>(
      '/auth/login',
      { email: data.username, password: data.password }
    );
    return res.data;
  },

  // POST /auth/register
  register: async (data: {
  email: string; username: string; password: string; display_name?: string;
}) => {
  const res = await api.post<{ message: string }>('/auth/register', {
    email: data.email,
    password: data.password,
    display_name: data.display_name || data.username,
  });
  return res.data;
},

  // GET /auth/me — we'll derive from token; backend may not have this
  // Use /stats/summary as a proxy to verify token works
  me: async (): Promise<User> => {
    // Try a lightweight authenticated call to verify token
    // Backend doesn't expose /auth/me so we store user from register/login response
    const saved = typeof window !== 'undefined' ? localStorage.getItem('lexis_user') : null;
    if (saved) return JSON.parse(saved) as User;
    throw new Error('No user in storage');
  },
};

// ─── Words ────────────────────────────────────────────────────────────────────
export const wordsApi = {
  // GET /words?skip=0&limit=20&search=...&status=...
  getAll: async (params?: {
    page?: number;
    per_page?: number;
    search?: string;
    tag?: string;
    sort?: string;
  }): Promise<PaginatedResponse<Word>> => {
    const skip = ((params?.page ?? 1) - 1) * (params?.per_page ?? 20);
    const res = await api.get<{ words: Word[]; total: number }>('/words', {
      params: {
        skip,
        limit: params?.per_page ?? 20,
        search: params?.search,
      },
    });
    const total = res.data.total;
    const perPage = params?.per_page ?? 20;
    return {
      items: res.data.words,
      total,
      page: params?.page ?? 1,
      per_page: perPage,
      pages: Math.ceil(total / perPage),
    };
  },

  // GET /words/due/today
  getDue: async (): Promise<Word[]> => {
    const res = await api.get<Word[]>('/words/due/today');
    return res.data;
  },

  // POST /words
  create: async (data: WordCreate): Promise<Word> => {
    const res = await api.post<Word>('/words', data);
    return res.data;
  },

  // PATCH /words/{id}
  update: async (id: string, data: Partial<WordCreate>): Promise<Word> => {
    const res = await api.patch<Word>(`/words/${id}`, data);
    return res.data;
  },

  // DELETE /words/{id}
  delete: async (id: string): Promise<void> => {
    await api.delete(`/words/${id}`);
  },

  // POST /words/{id}/review
  review: async (id: string, data: WordReview): Promise<Word> => {
    const res = await api.post<Word>(`/words/${id}/review`, data);
    return res.data;
  },

  // Favorite toggle — not in backend, handle locally or skip
  toggleFavorite: async (id: string): Promise<Word> => {
    const res = await api.patch<Word>(`/words/${id}`, { is_favorite: true });
    return res.data;
  },

  getOne: async (id: string): Promise<Word> => {
    // No single-word endpoint, get from list
    const res = await api.get<{ words: Word[] }>('/words', { params: { limit: 1 } });
    return res.data.words[0];
  },
};

// ─── Dictionary ───────────────────────────────────────────────────────────────
export const dictionaryApi = {
  // GET /dictionary/lookup?word=...
  lookup: async (word: string): Promise<DictionaryEntry> => {
    const res = await api.get<DictionaryEntry>('/dictionary/lookup', { params: { word } });
    return res.data;
  },
};

// ─── Stats ────────────────────────────────────────────────────────────────────
export const statsApi = {
  // GET /stats/summary
  get: async (): Promise<Stats> => {
    const res = await api.get<Stats>('/stats/summary');
    return res.data;
  },

  getHistory: async (days?: number) => {
    // Not in backend — return empty
    return [];
  },
};

// ─── Schedule ─────────────────────────────────────────────────────────────────
export const scheduleApi = {
  // GET /schedule
  getAll: async (): Promise<StudySchedule[]> => {
    const res = await api.get<StudySchedule[]>('/schedule');
    return res.data;
  },

  // POST /schedule
  create: async (data: Omit<StudySchedule, 'id' | 'user_id'>): Promise<StudySchedule> => {
    const res = await api.post<StudySchedule>('/schedule', data);
    return res.data;
  },

  update: async (id: string, data: Partial<StudySchedule>): Promise<StudySchedule> => {
    const res = await api.patch<StudySchedule>(`/schedule/${id}`, data);
    return res.data;
  },

  // DELETE /schedule/{id}
  delete: async (id: string): Promise<void> => {
    await api.delete(`/schedule/${id}`);
  },
};

// ─── Admin ────────────────────────────────────────────────────────────────────
export const adminApi = {
  // GET /admin/users
  getUsers: async () => {
    const res = await api.get('/admin/users');
    return res.data;
  },

  // DELETE /admin/users/{id}
  deleteUser: async (id: string): Promise<void> => {
    await api.delete(`/admin/users/${id}`);
  },

  // GET /admin/stats
  getGlobalStats: async (): Promise<Record<string, number>> => {
    const res = await api.get('/admin/stats');
    return res.data;
  },
};

export default api;
