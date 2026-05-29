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

// ── Language ─────────────────────────────────────────────────

export interface Language {
  code: string;
  name_native: string;
  name_en: string;
  flag_emoji?: string;
  is_active: boolean;
}

// ── Word ─────────────────────────────────────────────────────

export interface Word {
  id: string;
  user_id: string;
  word: string;
  meaning: string;
  meaning_tr?: string;
  meaning_en?: string;
  example?: string;
  word_type?: string;
  word_type_tr?: string;
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
  meaning_tr?: string;
  meaning_en?: string;
  example?: string;
  word_type?: string;
  word_type_tr?: string;
  list_type: 'active' | 'passive';
}

export interface WordUpdate {
  meaning?: string;
  meaning_tr?: string;
  meaning_en?: string;
  example?: string;
  word_type?: string;
  word_type_tr?: string;
  list_type?: 'active' | 'passive';
  status?: 'learning' | 'learned' | 'archived';
}

export interface WordReview {
  success: boolean;
}

// ── Dictionary ───────────────────────────────────────────────

export interface DictionaryMeaning {
  word_type: string;
  word_type_tr: string;
  meaning_en: string;
  meaning_tr: string;
  examples: string[];
}

export interface DictionaryResult {
  meanings: DictionaryMeaning[];
  error: string | null;
}

// ── Stats ────────────────────────────────────────────────────

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

// ── Schedule ─────────────────────────────────────────────────

export interface ScheduleItem {
  id: string;
  user_id: string;
  day_of_week: number;
  time_slot: string;
  activity: string;
  duration_min: number;
  link_url?: string;
  is_active: boolean;
}

export interface ScheduleCreate {
  day_of_week: number;
  time_slot: string;
  activity: string;
  duration_min: number;
  link_url?: string;
}

// ── Admin ────────────────────────────────────────────────────

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

// ── Pagination ───────────────────────────────────────────────

export interface PaginatedWords {
  items: Word[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}


// ── Analytics ────────────────────────────────────────────────

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
