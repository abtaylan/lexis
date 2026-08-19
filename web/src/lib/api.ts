// ============================================================
// lib/api.ts — Backend ile uyumlu API katmanı
// ============================================================

import axios from 'axios';
import type {
  AuthResponse,
  OtpPendingResponse,
  RegisterResponse,
  User,
  UserLanguage,
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
    // Coklu dil kaydi (Kullanici Madde 2): verilirse learning_lang yerine
    // bu liste kullanilir, ilk eleman aktif dil olur.
    learning_langs?: string[];
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

// ── User Languages API (Kullanıcının öğrendiği diller — Madde 2) ──────
// Kullanıcının aynı anda birden fazla dil öğrenebilmesini sağlayan
// endpoint'ler. Backend: /api/v1/me/languages
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

// ── Words API ────────────────────────────────────────────────
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

// ── Stats API ────────────────────────────────────────────────
export interface XpSummary {
  total_xp: number;
  level: number;
  current_level_xp_floor: number;
  next_level_xp_target: number;
  xp_into_level: number;
  xp_to_next_level: number;
}

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
  getXp: async (): Promise<XpSummary> => {
    const res = await api.get<XpSummary>('/stats/xp');
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

// ── Games API (Kelime Tahmin Oyunu) ────────────────────────────
export type GameMode = 'wordle' | 'multiple_choice' | 'typing' | 'matching' | 'listening' | 'sprint';
export type PoolSource = 'own' | 'general';
// multiple_choice modunda soru yönü. wordle modunda kullanılmaz (her zaman anlam
// gösterilip kelime bulunur). "definition_to_word" (Faz 2, monolingual) sadece
// pool_source="general" ile çalışır.
export type Direction = 'word_to_meaning' | 'meaning_to_word' | 'definition_to_word';

export interface GameSession {
  id: string;
  mode: GameMode;
  pool_source: PoolSource;
  direction: Direction;
  score: number;
  xp_earned: number;
  started_at: string;
  ended_at: string | null;
}

export interface GameWordOption {
  id: string;
  text: string;
}

export interface NextWordResult {
  finished: boolean;
  word_id?: string | null;
  general_word_id?: string | null;
  word?: string | null;
  meaning?: string | null;
  example?: string | null;
  options?: GameWordOption[] | null;
  direction?: Direction | null; // multiple_choice modunda dolu
  // ── wordle (adam asmaca) moduna özel alanlar ──
  word_length?: number | null;
  revealed?: string | null;
  max_wrong_guesses?: number | null;
}

export interface GameAttemptResult {
  id: string;
  is_correct: boolean;
  xp_awarded: number;
  session_score: number;
  leveled_up: boolean;
  new_level: number | null;
}

export interface GuessLetterResult {
  letter: string;
  correct: boolean;
  revealed: string;
  guessed_letters: string[];
  wrong_guesses: number;
  max_wrong_guesses: number;
  is_complete: boolean;
  is_game_over: boolean;
  word?: string | null;
  xp_awarded: number;
  leveled_up: boolean;
  new_level: number | null;
}

export interface GameFinishResult {
  id: string;
  mode: GameMode;
  pool_source: PoolSource;
  score: number;
  xp_earned: number;
  started_at: string;
  ended_at: string;
  word_count: number;
  correct_count: number;
}

export const gamesApi = {
  createSession: async (
    mode: GameMode,
    pool_source: PoolSource,
    direction: Direction = 'word_to_meaning'
  ): Promise<GameSession> => {
    const res = await api.post<GameSession>('/games/sessions', { mode, pool_source, direction });
    return res.data;
  },

  nextWord: async (sessionId: string): Promise<NextWordResult> => {
    const res = await api.get<NextWordResult>(`/games/sessions/${sessionId}/next-word`);
    return res.data;
  },

  submitAttempt: async (
    sessionId: string,
    data: {
      word_id?: string;
      general_word_id?: string;
      is_correct: boolean;
      attempts_count?: number;
      time_taken_ms?: number;
    }
  ): Promise<GameAttemptResult> => {
    const res = await api.post<GameAttemptResult>(`/games/sessions/${sessionId}/attempt`, data);
    return res.data;
  },

  guessLetter: async (sessionId: string, letter: string): Promise<GuessLetterResult> => {
    const res = await api.post<GuessLetterResult>(`/games/sessions/${sessionId}/guess-letter`, { letter });
    return res.data;
  },

  finishSession: async (sessionId: string): Promise<GameFinishResult> => {
    const res = await api.post<GameFinishResult>(`/games/sessions/${sessionId}/finish`);
    return res.data;
  },
};
