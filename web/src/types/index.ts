// ============================================================
// types/index.ts — Backend ile uyumlu tip tanımları
// ============================================================

// ── Auth ─────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  username: string;
  display_name?: string;
  is_admin: boolean;
  role?: 'user' | 'admin';
  daily_goal: number;
  native_lang?: string;
  learning_lang?: string;
  created_at: string;
  is_premium?: boolean;
  premium_until?: string;
}

export interface PricingPlan {
  code: 'monthly' | 'yearly';
  name: string;
  price: number;
  currency: string;
  interval_label: string;
  iyzico_pricing_plan_ref: string;
}

export interface CheckoutResponse {
  checkout_form_content?: string;
  payment_page_url?: string;
  token?: string;
}

export interface SubscriptionStatus {
  is_premium: boolean;
  premium_until?: string;
  plan_code?: string;
  status?: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: {
    id: string;
    email: string;
    display_name: string;
  };
}

export interface OtpPendingResponse {
  pending: true;
  email: string;
  purpose: 'login' | 'register';
  message?: string;
}

export interface RegisterResponse {
  pending: true;
  email: string;
  purpose: 'register';
  message?: string;
}

export interface Language {
  code: string;
  name_native: string;
  name_en: string;
  flag_emoji?: string;
  is_active: boolean;
}

export interface Word {
  id: string;
  user_id: string;
  word: string;
  meaning: string;
  meaning_native?: string;
  meaning_target?: string;
  example?: string;
  word_type?: string;
  word_type_native?: string;
  list_type: 'active' | 'passive';
  status: 'learning' | 'learned' | 'archived';
  repetition_count: number;
  last_reviewed_at?: string;
  next_review_at?: string;
  ease_factor: number;
  interval_days: number;
  created_at: string;
}

export interface WordCreate {
  word: string;
  meaning: string;
  meaning_native?: string;
  meaning_target?: string;
  example?: string;
  word_type?: string;
  word_type_native?: string;
  list_type: 'active' | 'passive';
}

export interface WordUpdate {
  meaning?: string;
  meaning_native?: string;
  meaning_target?: string;
  example?: string;
  word_type?: string;
  word_type_native?: string;
  list_type?: 'active' | 'passive';
  status?: 'learning' | 'learned' | 'archived';
}

export interface WordReview {
  success: boolean;
}

export interface DictionaryMeaning {
  word_type: string;
  word_type_native: string;
  meaning_target: string;
  meaning_native: string;
  examples: string[];
}

export interface DictionaryResult {
  meanings: DictionaryMeaning[];
  error: string | null;
}

export interface DailyProgress {
  date: string;
  words_added: number;
  words_reviewed: number;
  streak_day: number;
}

export interface Stats {
  total_words: number;
  learned: number;
  learning: number;
  active_list: number;
  passive_list: number;
  current_streak: number;
  today_added: number;
  daily_goal: number;
  daily_history: DailyProgress[];
}

export interface ScheduleItem {
  id: string;
  user_id: string;
  day_of_week: number;
  time_slot: string;
  activity: string;
  duration_min: number;
  link_url?: string;
  activity_key?: string;
  resolved_link_url?: string;
  resolved_resource_title?: string;
  is_active: boolean;
}

export interface ScheduleCreate {
  day_of_week: number;
  time_slot: string;
  activity: string;
  duration_min: number;
  link_url?: string;
  activity_key?: string;
}

export interface ScheduleTemplateItem {
  day_of_week: number;
  time_slot: string;
  activity: string;
  duration_min: number;
  link_url?: string;
}

export interface ScheduleTemplate {
  id: string;
  user_id: string;
  name: string;
  items: ScheduleTemplateItem[];
  created_at: string;
}

export interface ScheduleTemplateCreate {
  name: string;
  items: ScheduleTemplateItem[];
}

export interface AdminUser {
  id: string;
  email: string;
  display_name?: string;
  username?: string;
  role: 'user' | 'admin';
  is_active: boolean;
  native_lang?: string;
  learning_lang?: string;
  daily_goal?: number;
  password_masked?: string;
  created_at: string;
  last_seen_at?: string;
}

export interface AdminUserDetail extends AdminUser {
  total_words: number;
  learned: number;
  learning: number;
  words_today: number;
  active_words: number;
  passive_words: number;
}

export interface AdminStats {
  total_users: number;
  active_users: number;
  total_words: number;
  words_today: number;
}

export interface PaginatedWords {
  items: Word[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

export interface TypeBreakdown {
  word_type: string;
  total: number;
  learned: number;
  avg_repetition: number;
  learn_rate: number;
}

export interface DailyAdded {
  date: string;
  added: number;
}

export interface DailyProgressRow {
  date: string;
  words_added: number;
  words_reviewed: number;
  streak_day: number;
  goal: number;
}

export interface AnalyticsData {
  totals: {
    total: number; learned: number; learning: number;
    archived: number; active: number; passive: number;
  };
  type_breakdown: TypeBreakdown[];
  daily_added: DailyAdded[];
  daily_progress: DailyProgressRow[];
}
