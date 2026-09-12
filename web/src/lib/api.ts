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
  ExamReminder,
  ExamReminderCreate,
  ExamType,
  ExamSessionMode,
  ExamTypeInfo,
  ExamSession,
  NextQuestionResult,
  ExamAttemptResult,
  ExamPracticeQuestionsResult,
  WeakTopicsResult,
  WeakWordTypesResult,
  WeakDifficultyResult,
  ExamFinishResult,
  AddWordFromQuestionResult,
  ExamQuestionSuggestionInput,
  ExamQuestionSuggestionResult,
  PendingExamQuestion,
  ExamQuestionModerationResult,
  AIQuestionGenerateInput,
  AIQuestionGenerateResult,
  ContentAccuracySummary,
  QuestionAccuracyResponse,
  WordAccuracyResponse,
  ContentFlagScanResult,
  PlatformSnapshotsResponse,
  SubscriptionSegmentsResponse,
  PlatformSnapshotBenchmark,
  ContentFlagsResponse,
  ContentFlagItem,
  GrammarCategory,
  GrammarTopicSummary,
  GrammarTopicDetail,
  Notification,
  AdminUser,
  AdminUserDetail,
  AdminStats,
  Language,
  DictionaryResult,
  AnalyticsData,
  SystemHealth,
  DetailedStats,
  Payment,
  PaymentsSummary,
  WordPoolEntry,
  WordPoolCreate as WordPoolCreatePayload,
  SocialPost,
  NotificationLogEntry,
  GameAnalytics,
  LiveActivity,
  AuditLogEntry,
  PricingPlan,
  CheckoutResponse,
  SubscriptionStatus,
  UserCard,
  FriendshipItem,
  PendingRequests,
  PublicProfile,
  MessageItem,
  ConversationItem,
  ConversationThread,
  ChallengeItem,
  ChallengesList,
  DuelResponse,
  DuelListResponse,
  DuelStatusResponse,
  DuelRoundPublic,
  DuelAnswerResponse,
  DuelInviteItem,
  DuelInvitesListResponse,
  LeagueStatusResponse,
  LeagueOverviewResponse,
  QuestListResponse,
  CustomLeagueItem,
  CustomLeagueListResponse,
  CustomLeagueDetailResponse,
  CustomLeagueInviteItem,
  CustomLeagueInvitesListResponse,
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
    // Sadece daha önce bir token ile yapılmış (yani "oturum süresi doldu")
    // isteklerde otomatik /login'e yönlendir. Login/Register gibi henüz
    // token'sız yapılan isteklerde 401 = "yanlış e-posta/şifre" demektir;
    // bu durumda sayfa yeniden yönlendirilirse formdaki hata mesajı hiç
    // görünmeden kaybolur (bkz. Madde 1b test notları).
    const hadAuthHeader = !!error.config?.headers?.Authorization;
    if (error.response?.status === 401 && hadAuthHeader && typeof window !== 'undefined') {
      localStorage.removeItem('lexis_token');
      localStorage.removeItem('lexis_user');
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- axios interceptor React ağacının dışında çalışıyor (useRouter() burada yok); 401'de auth state'in (React Query cache, store) tam sıfırlanması için kasıtlı tam sayfa yenilemesi
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

  // KULLANICI İSTEĞİ (7-8 Eylül 2026): "OTP sadece üye olurken/kayıt sonrası
  // ilk girişte gelsin, sonraki girişlerde gerek yok" — backend artık bu
  // email için login-purpose OTP daha önce en az bir kez doğrulandıysa
  // (has_ever_verified) OTP adımını tamamen atlayıp token'ları DOĞRUDAN
  // dönüyor (AuthResponse). İlk girişte ise eskisi gibi {pending:true,...}
  // dönüp OTP ekranına yönlendirilmesi gerekiyor. Bu yüzden dönüş tipi artık
  // union — çağıran taraf (login/page.tsx) 'access_token' alanına bakarak
  // ayırt ediyor (mobile/src/app/(auth)/login.tsx ile aynı mantık).
  login: async (data: { email: string; password: string }): Promise<OtpPendingResponse | AuthResponse> => {
    const res = await api.post<OtpPendingResponse | AuthResponse>('/auth/login', data);
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

  // Hesabı ve tüm ilişkili verileri kalıcı olarak siler (Google Play / Apple
  // hesap silme politikası — bkz. backend/app/api/routes/auth.py delete_account).
  deleteAccount: async (): Promise<void> => {
    await api.delete('/auth/account');
  },

  // Apple ile Giriş (web) — Apple JS SDK'dan (usePopup) alınan id_token,
  // mobil ile AYNI backend ucuna gönderiliyor (bkz. AppleSignInButton.tsx).
  // full_name sadece kullanıcının Apple hesabıyla İLK yetkilendirmesinde
  // gelir (Apple'ın kendi davranışı), sonraki girişlerde undefined kalır.
  appleSignIn: async (data: { id_token: string; full_name?: string }): Promise<AuthResponse> => {
    const res = await api.post<AuthResponse>('/auth/apple', data);
    return res.data;
  },

  // Google ile Giriş (web) — Google Identity Services'ten alınan id_token,
  // backend'in /auth/google ucuna gönderiliyor (bkz. GoogleSignInButton.tsx).
  googleSignIn: async (data: { id_token: string }): Promise<AuthResponse> => {
    const res = await api.post<AuthResponse>('/auth/google', data);
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

  // V2 madde #6 (Faz 2) -- zayif kelime turu ozeti (dashboard widget'i icin).
  weakWordTypes: async (days = 30, limit = 5): Promise<WeakWordTypesResult> => {
    const res = await api.get<WeakWordTypesResult>('/words/stats/weak-word-types', {
      params: { days, limit },
    });
    return res.data;
  },

  review: async (id: string, data: WordReview): Promise<Word> => {
    const res = await api.post<Word>(`/words/${id}/review`, {
      word_id: id,
      success: data.success,
    });
    return res.data;
  },

  // Gorev Haritasi v2 (10 Eylul 2026) -- flashcards sayfasi bir tur
  // bittiginde (DoneScreen) bir kez cagirir; content_type='flashcard'
  // gorevlerinin ilerlemesini olculebilir kilar (bkz. backend words.py
  // log_study_session).
  logStudySession: async (data: {
    words_studied: number;
    correct_count: number;
    wrong_count: number;
    duration_secs: number;
    study_type?: string;
  }): Promise<void> => {
    try {
      await api.post('/words/study-sessions', data);
    } catch {
      // sessizce yut -- bu sadece Gorev Haritasi ilerlemesi icin, kritik degil
    }
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

// Sıralama (leaderboard) — bkz. backend/app/services/leaderboard_service.py
export type LeaderboardPeriod = 'all' | 'weekly' | 'monthly';

export interface LeaderboardEntry {
  rank: number;
  user_id: string;
  username: string;
  display_name: string | null;
  level: number;
  xp: number;
}

export interface LeaderboardResponse {
  period: LeaderboardPeriod;
  top: LeaderboardEntry[];
  me: LeaderboardEntry & { in_top: boolean };
}

// Rozetler (badges) — bkz. backend/app/services/badge_service.py::get_user_badges.
// "badges" alanı Supabase'in join sözdizimindeki tablo adı (badge_code'a
// karşılık gelen katalog satırı) — period_key doluysa dönem bazlı (haftalık/
// aylık liderlik) rozettir, null ise tek seferlik (streak) rozettir.
export interface UserBadge {
  badge_code: string;
  period_key: string | null;
  earned_at: string;
  meta: Record<string, unknown>;
  badges: {
    name_tr: string;
    name_en: string;
    description_tr: string;
    description_en: string;
    icon_emoji: string;
  } | null;
}


// Rozetler ve Ödüller — TAM katalog (V2 öncelik #2). Backend:
// GET /stats/badges/catalog (bkz. badge_service.py::get_badges_catalog).
// UserBadge'ten farkı: kazanılmamış rozetler de earned:false ile burada —
// katalog sayfası ikisini birden (kilitli/açık) gösterir.
export interface BadgeCatalogItem {
  code: string;
  kind: 'achievement' | 'title';
  category: string;
  icon_emoji: string;
  name_tr: string; name_en: string; name_de: string; name_fr: string; name_es: string;
  name_it: string; name_ar: string; name_ru: string; name_ja: string; name_pt: string;
  description_tr: string; description_en: string; description_de: string; description_fr: string; description_es: string;
  description_it: string; description_ar: string; description_ru: string; description_ja: string; description_pt: string;
  requirement_tr: string | null;
  requirement_en: string | null;
  earned: boolean;
  earned_at: string | null;
  period_key: string | null;
}

export type ReportExportFormat = 'csv' | 'xlsx' | 'pdf';

// Tarayıcıda blob response'u indirilebilir bir dosyaya çevirir (rapor
// export/e-posta özellikleri için ortak yardımcı — user report + org report
// export'u aynı deseni kullanıyor).
function downloadBlobResponse(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export interface UserReportTopicAccuracy {
  topic_tag: string;
  attempts: number;
  accuracy: number;
}

export interface UserReportLeagueHistoryEntry {
  week_start: string | null;
  tier_slug: string | null;
  outcome: string | null;
  final_rank: number | null;
  final_xp: number | null;
}

export interface UserReport {
  period: 'week' | 'month';
  learning_lang: string;
  range: { current_start: string; previous_start: string; now: string };
  study: {
    minutes_current: number; minutes_previous: number; minutes_change_pct: number | null;
    sessions_current: number; sessions_previous: number; sessions_change_pct: number | null;
  };
  streak: { current: number; longest: number };
  vocabulary: {
    total_words: number; learned_words: number; learned_pct: number;
    new_words_current: number; new_words_previous: number; new_words_change_pct: number | null;
  };
  games: {
    sessions_current: number; sessions_previous: number; sessions_change_pct: number | null;
    avg_score_current: number; avg_score_previous: number;
  };
  exam: {
    accuracy_current: number | null; accuracy_previous: number | null;
    weak_topics: UserReportTopicAccuracy[]; strong_topics: UserReportTopicAccuracy[];
  };
  quests: {
    completed_total: number; completed_current: number; completed_previous: number;
    total_active_nodes: number; progress_pct: number;
  };
  badges: { total_earned: number; earned_current: number };
  league: { current_tier: string | null; history: UserReportLeagueHistoryEntry[] };
  subscription: { is_premium: boolean; premium_until: string | null };
  platform: {
    cohort_size: number;
    active_peers_current: number;
    avg_minutes_current: number | null;
    avg_new_words_current: number | null;
    avg_accuracy_current: number | null;
    xp_percentile: number | null;
    same_country_cohort: boolean;
  };
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
  getBadges: async (): Promise<UserBadge[]> => {
    const res = await api.get<UserBadge[]>('/stats/badges');
    return res.data;
  },
  getBadgesCatalog: async (): Promise<BadgeCatalogItem[]> => {
    const res = await api.get<BadgeCatalogItem[]>('/stats/badges/catalog');
    return res.data;
  },
  getUserReport: async (period: 'week' | 'month' = 'week'): Promise<UserReport> => {
    const res = await api.get<UserReport>('/stats/report', { params: { period } });
    return res.data;
  },
  // İstatistik & Raporlama V2 öncelik #3, Faz 3 madde F — rapor export.
  // BİLİNÇLİ KAPSAM: üretilen dosya içeriği HER ZAMAN Türkçe (bkz. backend
  // report_export_service.py modül docstring'i) — sadece bu buton/etiket
  // metinleri kullanıcının arayüz diline göre çevriliyor.
  exportUserReport: async (period: 'week' | 'month', format: ReportExportFormat): Promise<void> => {
    const res = await api.get('/stats/report/export', { params: { period, format }, responseType: 'blob' });
    downloadBlobResponse(res.data, `lexis-rapor-${period}.${format}`);
  },
  sendUserReportEmail: async (
    period: 'week' | 'month', format: ReportExportFormat
  ): Promise<{ sent: boolean; to: string }> => {
    const res = await api.post('/stats/report/send-email', null, { params: { period, format } });
    return res.data;
  },
  getLeaderboard: async (
    period: LeaderboardPeriod = 'all',
    limit = 20
  ): Promise<LeaderboardResponse> => {
    const res = await api.get<LeaderboardResponse>('/stats/leaderboard', {
      params: { period, limit },
    });
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
  update: async (
    id: string,
    data: Partial<ScheduleCreate> & { is_active?: boolean; clear_reminder?: boolean }
  ): Promise<ScheduleItem> => {
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

// ── Sınav Hatırlatıcı API (tüm yabancı dil sınavları) ──────────
export const examReminderApi = {
  getAll: async (): Promise<ExamReminder[]> => {
    const res = await api.get('/exam-reminders');
    return res.data.exam_reminders;
  },
  create: async (data: ExamReminderCreate): Promise<ExamReminder> => {
    const res = await api.post<ExamReminder>('/exam-reminders', data);
    return res.data;
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/exam-reminders/${id}`);
  },
};

// ── Sınav Hazırlık Alanı (V2 §1.1, 9 Eylül 2026) ───────────────
// mobile/src/api/exams.ts ile birebir aynı endpoint/alan eşleşmesi.
export const examsApi = {
  listExamTypes: async (): Promise<ExamTypeInfo[]> => {
    const res = await api.get<ExamTypeInfo[]>('/exams/exam-types');
    return res.data;
  },
  createSession: async (
    exam_type: ExamType,
    session_mode: ExamSessionMode,
    total_questions?: number
  ): Promise<ExamSession> => {
    const res = await api.post<ExamSession>('/exams/sessions', {
      exam_type,
      session_mode,
      total_questions,
    });
    return res.data;
  },
  nextQuestion: async (sessionId: string): Promise<NextQuestionResult> => {
    const res = await api.get<NextQuestionResult>(`/exams/sessions/${sessionId}/next-question`);
    return res.data;
  },
  submitAttempt: async (
    sessionId: string,
    data: { question_id: string; selected_option: string; time_taken_ms?: number }
  ): Promise<ExamAttemptResult> => {
    const res = await api.post<ExamAttemptResult>(`/exams/sessions/${sessionId}/attempt`, data);
    return res.data;
  },
  finishSession: async (sessionId: string): Promise<ExamFinishResult> => {
    const res = await api.post<ExamFinishResult>(`/exams/sessions/${sessionId}/finish`);
    return res.data;
  },
  addWordFromQuestion: async (questionId: string): Promise<AddWordFromQuestionResult> => {
    const res = await api.post<AddWordFromQuestionResult>(`/exams/questions/${questionId}/add-word`);
    return res.data;
  },
  // Sınav Hazırlık İstatistik & İçerik Motoru Faz 2 — kullanıcı soru önerisi.
  suggestQuestion: async (data: ExamQuestionSuggestionInput): Promise<ExamQuestionSuggestionResult> => {
    const res = await api.post<ExamQuestionSuggestionResult>('/exams/questions/suggest', data);
    return res.data;
  },
  // Madde #3b — yanlış cevaptan sonra aynı konudan ekstra pratik soru seti.
  practiceQuestionsByTopic: async (
    topicTag: string,
    opts?: { examType?: ExamType; excludeQuestionId?: string; limit?: number }
  ): Promise<ExamPracticeQuestionsResult> => {
    const params: Record<string, string | number> = {};
    if (opts?.examType) params.exam_type = opts.examType;
    if (opts?.excludeQuestionId) params.exclude_question_id = opts.excludeQuestionId;
    if (opts?.limit) params.limit = opts.limit;
    const res = await api.get<ExamPracticeQuestionsResult>(
      `/exams/topics/${encodeURIComponent(topicTag)}/practice-questions`,
      { params }
    );
    return res.data;
  },
  // Görev Haritası v2 (10 Eylül 2026) — exam-topic-practice ekranında
  // cevaplanan her soru için (bkz. ExamPracticeQuestionsResult docstring'i,
  // backend). XP/session'a etkisi yok, sadece Görev Haritası'nın
  // 'grammar_topic' düğümlerini ölçülebilir kılar.
  logTopicPracticeAttempt: async (topicTag: string, questionId: string | null, isCorrect: boolean): Promise<void> => {
    try {
      await api.post(`/exams/topics/${encodeURIComponent(topicTag)}/practice-attempt`, {
        question_id: questionId,
        is_correct: isCorrect,
      });
    } catch {
      // sessizce yut -- sadece Görev Haritası ilerlemesi icin, kritik degil
    }
  },
  // Madde #3c — haftalık/günlük zayıf konu özeti (dashboard widget'ı için).
  weakTopics: async (days = 7, limit = 5): Promise<WeakTopicsResult> => {
    const res = await api.get<WeakTopicsResult>('/exams/stats/weak-topics', {
      params: { days, limit },
    });
    return res.data;
  },
};

// ── Gramer Rehberi API ───────────────────────────────────────
// exams.py'den bağımsız ayrı modül (bkz. backend/app/api/routes/grammar.py
// modül docstring'i) — telifli kaynak yerine yazılan özgün gramer
// referans içeriğini sunar.
export const grammarApi = {
  listCategories: async (): Promise<GrammarCategory[]> => {
    const res = await api.get<GrammarCategory[]>('/grammar/categories');
    return res.data;
  },
  listTopics: async (): Promise<GrammarTopicSummary[]> => {
    const res = await api.get<GrammarTopicSummary[]>('/grammar/topics');
    return res.data;
  },
  getTopic: async (slug: string): Promise<GrammarTopicDetail> => {
    const res = await api.get<GrammarTopicDetail>(`/grammar/topics/${slug}`);
    return res.data;
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
  checkout: async (plan_id: string): Promise<CheckoutResponse> => {
    const res = await api.post<CheckoutResponse>('/subscription/checkout', { plan_id });
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
  updateUserRole: async (id: string, role: 'user' | 'admin' | 'admin_readonly'): Promise<AdminUser> => {
    const res = await api.patch<AdminUser>(`/admin/users/${id}/role`, null, { params: { role } });
    return res.data;
  },
  deactivateUser: async (id: string): Promise<void> => {
    await api.delete(`/admin/users/${id}`);
  },
  activateUser: async (id: string): Promise<void> => {
    await api.patch(`/admin/users/${id}/activate`);
  },
  deleteUserPermanently: async (id: string): Promise<void> => {
    await api.delete(`/admin/users/${id}/permanent`);
  },
  getStats: async (): Promise<AdminStats> => {
    const res = await api.get<AdminStats>('/admin/stats');
    return res.data;
  },

  // ── Madde 1d — kapsamlı yönetim platformu ────────────────────
  getSystemHealth: async (): Promise<SystemHealth> => {
    const res = await api.get<SystemHealth>('/admin/system-health');
    return res.data;
  },
  getDetailedStats: async (days = 30): Promise<DetailedStats> => {
    const res = await api.get<DetailedStats>('/admin/stats/detailed', { params: { days } });
    return res.data;
  },
  getPayments: async (params?: { status_filter?: string; plan_code?: string }): Promise<Payment[]> => {
    const res = await api.get('/admin/payments', { params });
    return res.data.payments;
  },
  getPaymentsSummary: async (): Promise<PaymentsSummary> => {
    const res = await api.get<PaymentsSummary>('/admin/payments/summary');
    return res.data;
  },
  getWordPool: async (params?: {
    source_lang?: string; target_lang?: string; search?: string;
    include_inactive?: boolean; page?: number; page_size?: number;
  }): Promise<{ items: WordPoolEntry[]; total: number; coverage: Record<string, number> }> => {
    const res = await api.get('/admin/word-pool', { params });
    return res.data;
  },
  createWordPoolEntry: async (data: WordPoolCreatePayload): Promise<WordPoolEntry> => {
    const res = await api.post<WordPoolEntry>('/admin/word-pool', data);
    return res.data;
  },
  updateWordPoolEntry: async (id: string, data: Partial<WordPoolCreatePayload> & { is_active?: boolean }): Promise<WordPoolEntry> => {
    const res = await api.patch<WordPoolEntry>(`/admin/word-pool/${id}`, data);
    return res.data;
  },
  deleteWordPoolEntry: async (id: string): Promise<void> => {
    await api.delete(`/admin/word-pool/${id}`);
  },

  // Sınav Hazırlık — İstatistik & İçerik Motoru Faz 2b: soru moderasyon
  // kuyruğu (kullanıcı önerileri + AI ile üretilenler) + AI soru üretimi.
  getPendingExamQuestions: async (): Promise<PendingExamQuestion[]> => {
    const res = await api.get<PendingExamQuestion[]>('/exams/admin/questions/pending');
    return res.data;
  },
  approveExamQuestion: async (id: string): Promise<ExamQuestionModerationResult> => {
    const res = await api.post<ExamQuestionModerationResult>(`/exams/admin/questions/${id}/approve`);
    return res.data;
  },
  rejectExamQuestion: async (id: string): Promise<ExamQuestionModerationResult> => {
    const res = await api.post<ExamQuestionModerationResult>(`/exams/admin/questions/${id}/reject`);
    return res.data;
  },
  generateAiExamQuestions: async (data: AIQuestionGenerateInput): Promise<AIQuestionGenerateResult> => {
    const res = await api.post<AIQuestionGenerateResult>('/exams/admin/questions/generate-ai', data);
    return res.data;
  },
  getSocialPosts: async (limit = 30): Promise<{ posts: SocialPost[]; last_cron_run: { started_at: string; status: string } | null; mode: string }> => {
    const res = await api.get('/admin/social-posts', { params: { limit } });
    return res.data;
  },
  getNotificationsLog: async (params?: {
    channel?: string; category?: string; status_filter?: string; limit?: number;
  }): Promise<{ items: NotificationLogEntry[]; total: number }> => {
    const res = await api.get('/admin/notifications-log', { params });
    return res.data;
  },
  getGameAnalytics: async (): Promise<GameAnalytics> => {
    const res = await api.get<GameAnalytics>('/admin/game-analytics');
    return res.data;
  },
  getLiveActivity: async (): Promise<LiveActivity> => {
    const res = await api.get<LiveActivity>('/admin/live-activity');
    return res.data;
  },
  getAuditLog: async (params?: { action?: string; target_type?: string; limit?: number }): Promise<{ items: AuditLogEntry[]; total: number }> => {
    const res = await api.get('/admin/audit-log', { params });
    return res.data;
  },

  // İstatistik & Raporlama Faz 2 — içerik doğruluk analitiği (bkz. admin/reports sayfası)
  getContentAccuracySummary: async (): Promise<ContentAccuracySummary> => {
    const res = await api.get<ContentAccuracySummary>('/admin/content-accuracy/summary');
    return res.data;
  },
  getContentAccuracyQuestions: async (params?: {
    exam_type?: string; min_attempts?: number; limit?: number; order?: 'weakest' | 'strongest' | 'most_attempted';
  }): Promise<QuestionAccuracyResponse> => {
    const res = await api.get<QuestionAccuracyResponse>('/admin/content-accuracy/questions', { params });
    return res.data;
  },
  getContentAccuracyWords: async (params?: {
    source?: 'system' | 'user'; min_attempts?: number; limit?: number; order?: 'weakest' | 'strongest' | 'most_attempted';
  }): Promise<WordAccuracyResponse> => {
    const res = await api.get<WordAccuracyResponse>('/admin/content-accuracy/words', { params });
    return res.data;
  },

  // İstatistik & Raporlama Faz 3 madde C — veri doğruluğu/güvenilirlik paneli
  // (bkz. admin_platform.py /content-accuracy/flags/*, content_flag_service.py)
  scanContentFlags: async (): Promise<ContentFlagScanResult> => {
    const res = await api.post<ContentFlagScanResult>('/admin/content-accuracy/flags/scan');
    return res.data;
  },
  getContentFlags: async (params?: {
    status?: 'open' | 'fixed' | 'dismissed'; content_type?: 'exam_question' | 'system_word' | 'user_word'; limit?: number;
  }): Promise<ContentFlagsResponse> => {
    const res = await api.get<ContentFlagsResponse>('/admin/content-accuracy/flags', { params });
    return res.data;
  },
  updateContentFlag: async (flagId: string, data: { status: 'open' | 'fixed' | 'dismissed'; admin_note?: string }): Promise<ContentFlagItem> => {
    const res = await api.patch<ContentFlagItem>(`/admin/content-accuracy/flags/${flagId}`, data);
    return res.data;
  },

  // İstatistik & Raporlama Faz 3 madde E — zaman bazlı periyodik snapshot
  // (bkz. admin_platform.py /platform-stats/snapshots/*)
  getPlatformSnapshots: async (days = 30): Promise<PlatformSnapshotsResponse> => {
    const res = await api.get<PlatformSnapshotsResponse>('/admin/platform-stats/snapshots', { params: { days } });
    return res.data;
  },
  capturePlatformSnapshot: async (targetDate?: string): Promise<Record<string, unknown>> => {
    const res = await api.post('/admin/platform-stats/snapshots/capture', targetDate ? { target_date: targetDate } : {});
    return res.data;
  },

  // İstatistik & Raporlama Faz 3 madde H — abonelik-segment korelasyonu
  // (bkz. admin_platform.py /subscription-segments)
  getSubscriptionSegments: async (days = 30): Promise<SubscriptionSegmentsResponse> => {
    const res = await api.get<SubscriptionSegmentsResponse>('/admin/subscription-segments', { params: { days } });
    return res.data;
  },

  // İstatistik & Raporlama Faz 3 madde I — periyot benchmark (takvim/
  // filtreleme frontend'de, bkz. admin/reports/page.tsx::TrendPanel)
  getPlatformSnapshotBenchmark: async (days = 30): Promise<PlatformSnapshotBenchmark> => {
    const res = await api.get<PlatformSnapshotBenchmark>('/admin/platform-stats/benchmark', { params: { days } });
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

  // V2 madde #6 (Faz 2) -- zayif zorluk seviyesi ozeti (dashboard widget'i icin).
  weakDifficulty: async (days = 30, limit = 5): Promise<WeakDifficultyResult> => {
    const res = await api.get<WeakDifficultyResult>('/games/stats/weak-difficulty', {
      params: { days, limit },
    });
    return res.data;
  },
};

// ── Social API (Madde 6, Faz 1 — Arkadaşlık + Takip + Profil) ──
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

  // ── Engelleme (Faz 2) ──
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

  // ── Mesajlaşma (Faz 2) — polling tabanlı, gerçek zamanlı değil ──
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

  // ── Meydan okuma (Faz 3) ──
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

// ── Notifications API (Madde 3a — Dashboard bildirim alanı) ────
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

// ── Düello API (V2 §6.3 Faz 3a/3e — Gerçek Zamanlı Düello) ──
export const duelsApi = {
  create: async (max_players = 8, round_count = 10): Promise<DuelResponse> => {
    const res = await api.post<DuelResponse>('/duels', { max_players, round_count });
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
  // -- Faz 3f: oda sahibi bekleyen odayi silebilsin --
  cancel: async (duelId: string): Promise<void> => {
    await api.post(`/duels/${duelId}/cancel`);
  },
};

// ── Lig API (V2 §6.3 Faz 3b — haftalık kademe ligleri) ──
export const leaguesApi = {
  getMyLeague: async (): Promise<LeagueStatusResponse> => {
    const res = await api.get<LeagueStatusResponse>('/leagues/me');
    return res.data;
  },
  getOverview: async (): Promise<LeagueOverviewResponse> => {
    const res = await api.get<LeagueOverviewResponse>('/leagues/overview');
    return res.data;
  },
  // -- Faz 3f: herhangi bir lig grubunun tam siralama tablosu (Tum Ligler'den tiklaninca) --
  getDetail: async (leagueId: string): Promise<LeagueStatusResponse> => {
    const res = await api.get<LeagueStatusResponse>(`/leagues/${leagueId}`);
    return res.data;
  },
};

// ── Ozel Lig API (V2 Faz 3 devami, 10 Eylul 2026 -- "kendi
// arkadaslarimdan olusan ozel lig kurup kendi aramizda yarisabilmeliyim")
// Backend: /api/v1/custom-leagues/* (bkz. backend/app/api/routes/custom_leagues.py)
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
  transferOwnership: async (leagueId: string, newOwnerUserId: string): Promise<CustomLeagueItem> => {
    const res = await api.post<CustomLeagueItem>(`/custom-leagues/${leagueId}/transfer-ownership`, { new_owner_user_id: newOwnerUserId });
    return res.data;
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

// ── Görev haritası API (V2 §6.3 Faz 3c) ──
export const questsApi = {
  list: async (): Promise<QuestListResponse> => {
    const res = await api.get<QuestListResponse>('/quests');
    return res.data;
  },
};

// ── Kurum Raporu — İstatistik & Raporlama V2 öncelik #3, madde B ──
// NOT: organizations.py backend'i (kurum oluştur/üye davet/liderlik tablosu)
// V2 öncelik #4'ün ("B2B Kurumsal Lig arayüzü") bir parçası ve HENÜZ hiç
// web/mobil ekranı yok — bu API sadece rapor ucu için, kurum yönetimi
// (oluşturma/davet/üye listesi) burada YOK, öncelik #4'te eklenecek.
export interface OrgReportTopLearner {
  user_id: string;
  username: string | null;
  xp_gained: number;
}

export interface OrgReportWeakTopic {
  topic_tag: string;
  attempts: number;
  accuracy: number;
}

export interface OrganizationReport {
  org: { id: string; name: string | null; plan: string | null };
  period: 'week' | 'month';
  member_count: number;
  active_member_count: number;
  study: {
    minutes_current: number; minutes_previous: number; minutes_change_pct: number | null;
    sessions_current: number; sessions_previous: number; sessions_change_pct: number | null;
  };
  accuracy: { current: number | null; previous: number | null };
  vocabulary: {
    new_words_current: number; new_words_previous: number; new_words_change_pct: number | null;
  };
  top_learners: OrgReportTopLearner[];
  weak_topics: OrgReportWeakTopic[];
  badges_earned_current: number;
  // Faz 3 madde G (KVKK onay mekanizması) — top_learners'a dahil edilen
  // (rapor paylaşımına onay vermiş) üye sayısı / toplam üye sayısı.
  consent_summary: { consented_count: number; total_count: number };
}

export interface OrganizationConsentStatus {
  consent_given: boolean;
  consented_at: string | null;
}

export const organizationsApi = {
  getReport: async (orgId: string, period: 'week' | 'month' = 'week'): Promise<OrganizationReport> => {
    const res = await api.get<OrganizationReport>(`/organizations/${orgId}/report`, { params: { period } });
    return res.data;
  },
  exportReport: async (orgId: string, period: 'week' | 'month', format: ReportExportFormat): Promise<void> => {
    const res = await api.get(`/organizations/${orgId}/report/export`, {
      params: { period, format },
      responseType: 'blob',
    });
    downloadBlobResponse(res.data, `lexis-kurum-rapor-${period}.${format}`);
  },
  sendReportEmail: async (
    orgId: string, period: 'week' | 'month', format: ReportExportFormat
  ): Promise<{ sent: boolean; to: string }> => {
    const res = await api.post(`/organizations/${orgId}/report/send-email`, null, { params: { period, format } });
    return res.data;
  },
  // Faz 3 madde G (KVKK onay mekanizması) — üyenin kendi rızasıyla,
  // kurum raporunda (top_learners) isimli görünmeye onay vermesi/geri
  // çekmesi. Sadece kendi üyeliği için (bkz. backend route docstring'i).
  getConsent: async (orgId: string): Promise<OrganizationConsentStatus> => {
    const res = await api.get<OrganizationConsentStatus>(`/organizations/${orgId}/consent`);
    return res.data;
  },
  setConsent: async (orgId: string, consent: boolean): Promise<OrganizationConsentStatus> => {
    const res = await api.put<OrganizationConsentStatus>(`/organizations/${orgId}/consent`, { consent });
    return res.data;
  },
};
