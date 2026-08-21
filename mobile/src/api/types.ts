// src/api/types.ts — Backend ile uyumlu tip tanımları (web/src/types/index.ts'ten
// mobil Faz 1 kapsamına taşındı; Faz 2/3 sosyal tipleri de forward-compat için
// eklendi, ama Faz 1 ekranları bunları kullanmıyor).

export interface User {
  id: string;
  email: string;
  username: string;
  display_name?: string;
  is_admin: boolean;
  role?: 'user' | 'admin' | 'admin_readonly';
  daily_goal: number;
  native_lang?: string;
  learning_lang?: string;
  learning_langs?: string[];
  created_at: string;
  is_premium?: boolean;
  premium_until?: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: { id: string; email: string; display_name: string };
}

export interface OtpPendingResponse {
  pending: true;
  email: string;
  purpose: 'login' | 'register';
  message?: string;
}

export interface Language {
  code: string;
  name_native: string;
  name_en: string;
  flag_emoji?: string;
  is_active: boolean;
}

export interface UserLanguage {
  id: string;
  user_id: string;
  learning_lang: string;
  is_active: boolean;
  daily_goal?: number | null;
  added_at: string;
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

export type ReminderLead = '15min' | '1hour' | 'day_start';

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
  reminder_lead?: ReminderLead | null;
}

export interface ScheduleCreate {
  day_of_week: number;
  time_slot: string;
  activity: string;
  duration_min: number;
  link_url?: string;
  activity_key?: string;
  reminder_lead?: ReminderLead | null;
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

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  schedule_item_id?: string | null;
  is_read: boolean;
  created_at: string;
}

export interface XpSummary {
  total_xp: number;
  level: number;
  current_level_xp_floor: number;
  next_level_xp_target: number;
  xp_into_level: number;
  xp_to_next_level: number;
}

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

// ── Games ────────────────────────────────────────────────────
export type GameMode = 'wordle' | 'multiple_choice' | 'typing' | 'matching' | 'listening' | 'sprint';
export type PoolSource = 'own' | 'general';
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
  direction?: Direction | null;
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
