// ============================================================
// lib/api.ts — Backend ile uyumlu API katmanı
// ============================================================

import axios from 'axios';
import type {
  AuthResponse,
  OtpPendingResponse,
  RegisterResponse,
  User,
  Word,
  WordCreate,
  WordUpdate,
  WordReview,
  PaginatedWords,
  Stats,
  DailyProgress,
  ScheduleItem,
  ScheduleCreate,
  ScheduleTemplate,
  ScheduleTemplateCreate,
  AdminUser,
  AdminUserDetail,
  AdminStats,
  Language,
  DictionaryResult,
  AnalyticsData,
  PricingPlan,
  CheckoutResponse,
  SubscriptionStatus,
} from '@/types';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const api = axios.create({
  baseURL: `${BASE_URL}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('lexis_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('lexis_token');
      localStorage.removeItem('lexis_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ── Auth API ─────────────────────────────────────────────────
export const authApi = {
  // Kayıt artık direkt token dönmüyor — hesap oluşturulur ve OTP kodu gönderilir.
  // Kullanıcı /verify-otp?email=...&purpose=register ekranına yönlendirilmeli.
  register: async (data: {
    email: string;
    password: string;
    display_name: string;
    username?: string;
    native_lang?: string;
    learning_lang?: string;
  }): Promise<RegisterResponse> => {
    const res = await api.post('/auth/register', data);
    return res.data;
  },

  // Login artık direkt token dönmüyor — şifre doğrulanır ve OTP kodu gönderilir.
  // Kullanıcı /verify-otp?email=...&purpose=login ekranına yönlendirilmeli.
  login: async (data: { email: string; password: string }): Promise<OtpPendingResponse> => {
    const res = await api.post<OtpPendingResponse>('/auth/login', data);
    return res.data;
  },

  // OTP kodu doğrulandığında asıl token'lar buradan gelir.
  verifyOtp: async (data: {
    email: string;
    code: string;
    purpose: 'login' | 'register';
  }): Promise<AuthResponse> => {
    const res = await api.post<AuthResponse>('/auth/verify-otp', data);
    return res.data;
  },

  resendOtp: async (data: {
    email: string;
    purpose: 'login' | 'register';
  }): Promise<{ message: string }> => {
    const res = await api.post('/auth/resend-otp', data);
    return res.data;
  },

  // Şifremi unuttum — e-posta sistemde kayıtlıysa 6 haneli sıfırlama kodu gönderilir.
  // Güvenlik gereği backend her zaman aynı genel mesajı döner (kullanıcı numaralandırmasını önler).
  forgotPassword: async (email: string): Promise<{ message: string }> => {
    const res = await api.post('/auth/forgot-password', { email });
    return res.data;
  },

  // Şifremi unuttum akışının ikinci adımı — kod + yeni şifre ile şifre güncellenir.
  resetPassword: async (data: {
    email: string;
    code: string;
    new_password: string;
  }): Promise<{ message: string }> => {
    const res = await api.post('/auth/reset-password', data);
    return res.data;
  },

  refresh: async (refresh_token: string): Promise<{ access_token: string }> => {
    const res = await api.post('/auth/refresh', { refresh_token });
    return res.data;
  },

  getMe: async (): Promise<User> => {
    const res = await api.get<User>('/auth/me');
    return res.data;
  },

  updateProfile: async (data: {
    display_name?: string;
    daily_goal?: number;
    native_lang?: string;
    learning_lang?: string;
  }): Promise<User> => {
    const res = await api.patch<User>('/auth/profile', data);
    return res.data;
  },
};

// ── Languages API ─────────────────────────────────────────────
export const languagesApi = {
  getAll: async (): Promise<Language[]> => {
    const res = await api.get('/languages');
    return res.data.languages;
  },
};

// ── Words API ─────────────────────────────────────────────────
export const wordsApi = {
  getAll: async (params?: {
    page?: number;
    per_page?: number;
    search?: string;
    status?: string;
    list_type?: string;
  }): Promise<PaginatedWords> => {
    const res = await api.get('/words', {
      params: {
        page: params?.page ?? 1,
        page_size: params?.per_page ?? 20,
        search: params?.search,
        status: params?.status,
        list_type: params?.list_type,
      },
    });
    return {
      items: res.data.items,
      total: res.data.total,
      page: res.data.page,
      per_page: res.data.page_size,
      pages: Math.ceil(res.data.total / res.data.page_size),
    };
  },

  create: async (data: WordCreate): Promise<Word> => {
    const res = await api.post<Word>('/words', data);
    return res.data;
  },

  update: async (id: string, data: WordUpdate): Promise<Word> => {
    const res = await api.patch<Word>(`/words/${id}`, data);
    return res.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/words/${id}`);
  },

  getDue: async (): Promise<Word[]> => {
    const res = await api.get('/words/due/today');
    return res.data.items;
  },

  review: async (id: string, data: WordReview): Promise<Word> => {
    const res = await api.post<Word>(`/words/${id}/review`, {
      word_id: id,
      success: data.success,
    });
    return res.data;
  },
};

// ── Dictionary API ────────────────────────────────────────────
export const dictionaryApi = {
  lookup: async (word: string, learning_lang?: string, native_lang?: string): Promise<DictionaryResult> => {
    const res = await api.get<DictionaryResult>('/dictionary/lookup', {
      params: { word, learning_lang, native_lang },
    });
    return res.data;
  },
};

// ── Stats API ─────────────────────────────────────────────────
export const statsApi = {
  getSummary: async (): Promise<Stats> => {
    const res = await api.get<Stats>('/stats/summary');
    return res.data;
  },
  getHistory: async (days = 14): Promise<DailyProgress[]> => {
    const res = await api.get<DailyProgress[]>('/stats/history', { params: { days } });
    return res.data;
  },
  getAnalytics: async (): Promise<AnalyticsData> => {
    const res = await api.get<AnalyticsData>('/stats/analytics');
    return res.data;
  },
};

// ── Schedule API ──────────────────────────────────────────────
export const scheduleApi = {
  getAll: async (): Promise<ScheduleItem[]> => {
    const res = await api.get('/schedule');
    return res.data.items;
  },
  create: async (data: ScheduleCreate): Promise<ScheduleItem> => {
    const res = await api.post<ScheduleItem>('/schedule', data);
    return res.data;
  },
  update: async (id: string, data: Partial<ScheduleCreate> & { is_active?: boolean }): Promise<ScheduleItem> => {
    const res = await api.patch<ScheduleItem>(`/schedule/${id}`, data);
    return res.data;
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/schedule/${id}`);
  },

  // Kişiye özel şablonlar
  getTemplates: async (): Promise<ScheduleTemplate[]> => {
    const res = await api.get('/schedule/templates');
    return res.data.templates;
  },
  createTemplate: async (data: ScheduleTemplateCreate): Promise<ScheduleTemplate> => {
    const res = await api.post<ScheduleTemplate>('/schedule/templates', data);
    return res.data;
  },
  deleteTemplate: async (id: string): Promise<void> => {
    await api.delete(`/schedule/templates/${id}`);
  },
};

// ── Subscription API ─────────────────────────────────────────
export const subscriptionApi = {
  getPlans: async (): Promise<PricingPlan[]> => {
    const res = await api.get<PricingPlan[]>('/subscription/plans');
    return res.data;
  },
  getStatus: async (): Promise<SubscriptionStatus> => {
    const res = await api.get<SubscriptionStatus>('/subscription/me');
    return res.data;
  },
  checkout: async (plan_code: 'monthly' | 'yearly'): Promise<CheckoutResponse> => {
    const res = await api.post<CheckoutResponse>('/subscription/checkout', { plan_code });
    return res.data;
  },
  cancel: async (): Promise<{ message: string }> => {
    const res = await api.post('/subscription/cancel');
    return res.data;
  },
};

// ── Admin API ─────────────────────────────────────────────────
export const adminApi = {
  getUsers: async (): Promise<AdminUser[]> => {
    const res = await api.get('/admin/users');
    return res.data.users;
  },
  getUserDetail: async (id: string): Promise<AdminUserDetail> => {
    const res = await api.get<AdminUserDetail>(`/admin/users/${id}`);
    return res.data;
  },
  createUser: async (data: {
    email: string;
    password: string;
    display_name: string;
    role: string;
    daily_goal: number;
    native_lang: string;
    learning_lang: string;
  }): Promise<{ message: string; id: string }> => {
    const res = await api.post('/admin/users', data);
    return res.data;
  },
  updateUserRole: async (id: string, role: 'user' | 'admin'): Promise<AdminUser> => {
    const res = await api.patch<AdminUser>(`/admin/users/${id}/role`, null, { params: { role } });
    return res.data;
  },
  deactivateUser: async (id: string): Promise<void> => {
    await api.delete(`/admin/users/${id}`);
  },
  activateUser: async (id: string): Promise<void> => {
    await api.patch(`/admin/users/${id}/activate`);
  },
  getStats: async (): Promise<AdminStats> => {
    const res = await api.get<AdminStats>('/admin/stats');
    return res.data;
  },
};
