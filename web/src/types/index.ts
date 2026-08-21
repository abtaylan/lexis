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
  role?: 'user' | 'admin' | 'admin_readonly';
  daily_goal: number;
  native_lang?: string;
  learning_lang?: string;
  learning_langs?: string[];
  created_at: string;
  is_premium?: boolean;
  premium_until?: string;
}

export interface PricingPlan {
  id: string;
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

// Not: Oyun (game) tipleri artık burada değil, lib/api.ts içinde tanımlı
// (GameSession, GameWordOption, NextWordResult, GameAttemptResult,
// GuessLetterResult, GameFinishResult — bkz. Games API bölümü). Eski
// GameWordItem/GameHistoryItem/PlanInfo tipleri, branch merge'i ile birlikte
// gelen yeni oyun/abonelik altyapısı tarafından karşılığı olmadığı için
// kaldırıldı.

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

// Kullanıcının öğrendiği bir dile ait satır (user_learning_languages tablosu,
// Kullanıcı Madde 2 — çoklu dil öğrenme). GET/POST/PATCH /me/languages
// endpoint'lerinden dönen ham satır şekli.
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

// Madde 3a — görev bazında hatırlatma tercihi. undefined/null = kapalı.
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

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  schedule_item_id?: string | null;
  is_read: boolean;
  created_at: string;
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
  role: 'user' | 'admin' | 'admin_readonly';
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

// ============================================================
// Madde 1d — Admin panel: kapsamlı yönetim platformu tipleri
// ============================================================

export interface CronJobStatus {
  job_name: string;
  last_run: {
    id: string;
    job_name: string;
    status: 'running' | 'success' | 'failed';
    started_at: string;
    finished_at?: string | null;
    detail?: Record<string, unknown> | null;
    error?: string | null;
  } | null;
  scheduled: boolean;
}

export interface SystemHealth {
  backend: { status: string; uptime_seconds: number; version: string };
  database: { status: string; latency_ms: number | null };
  integrations: {
    iyzico_configured: boolean;
    otp_mode: string;
    smtp_configured: boolean;
    social_post_mode: string;
    telegram_configured: boolean;
    slack_configured: boolean;
  };
  cron_jobs: CronJobStatus[];
  mobile_app: { status: string; note: string };
}

export interface DetailedStats {
  language_distribution: {
    learning_lang: Record<string, number>;
    native_lang: Record<string, number>;
  };
  growth: { date: string; new_users: number }[];
  retention: {
    eligible_users: number;
    active_last_7_days: number;
    retention_rate_percent: number;
    definition: string;
  };
}

export interface Payment {
  id: string;
  user_id: string;
  plan_code: string;
  status: string;
  iyzico_subscription_ref?: string | null;
  current_period_end?: string | null;
  cancelled_at?: string | null;
  created_at: string;
  display_name?: string | null;
  username?: string | null;
  email?: string | null;
}

export interface PaymentsSummary {
  total_subscriptions: number;
  by_status: Record<string, number>;
  active_by_plan: Record<string, number>;
  mrr_estimate: number;
  currency: string;
}

export interface WordPoolEntry {
  id: string;
  source_lang: string;
  target_lang: string;
  word: string;
  meaning: string;
  example?: string | null;
  difficulty_level?: string | null;
  is_active: boolean;
  created_at: string;
}

export interface WordPoolCreate {
  source_lang: string;
  target_lang: string;
  word: string;
  meaning: string;
  example?: string;
  difficulty_level?: string;
}

export interface SocialPost {
  id: string;
  post_date: string;
  content_type: 'word' | 'quiz';
  general_word_id?: string | null;
  question_text?: string | null;
  options?: string[] | null;
  correct_answer?: string | null;
  telegram_sent: boolean;
  slack_sent: boolean;
  created_at: string;
}

export interface NotificationLogEntry {
  id: string;
  channel: 'email' | 'telegram' | 'slack';
  category: string;
  recipient?: string | null;
  status: 'sent' | 'skipped' | 'failed';
  detail?: Record<string, unknown> | null;
  created_at: string;
}

export interface GameModeSummary {
  mode: string;
  sessions: number;
  completed_sessions: number;
  avg_score: number;
  total_xp_earned: number;
}

export interface GameAnalytics {
  total_sessions: number;
  by_mode: GameModeSummary[];
  by_learning_lang: Record<string, number>;
  total_attempts: number;
  accuracy_percent: number;
}

// ============================================================
// Madde 6, Faz 1 — Arkadaşlık + Takip + Profil görüntüleme
// ============================================================

export type RelationshipStatus = 'self' | 'none' | 'pending_sent' | 'pending_received' | 'friends';

export interface UserCard {
  id: string;
  username?: string;
  display_name?: string;
  avatar_url?: string;
  level: number;
  relationship_status?: RelationshipStatus;
  is_following?: boolean;
}

export interface FriendshipItem {
  id: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
  responded_at?: string | null;
  user: UserCard;
}

export interface PendingRequests {
  incoming: FriendshipItem[];
  outgoing: FriendshipItem[];
}

export interface PublicProfileStats {
  learning_lang: string;
  total_words: number;
  learned: number;
  learning: number;
  current_streak: number;
}

export interface PublicScheduleItem {
  day_of_week: number;
  time_slot: string;
  activity: string;
  duration_min: number;
}

export interface PublicProfile {
  id: string;
  username?: string;
  display_name?: string;
  avatar_url?: string;
  level: number;
  total_xp: number;
  created_at: string;
  friend_count: number;
  follower_count: number;
  following_count: number;
  relationship_status: RelationshipStatus;
  friendship_id?: string | null;
  is_following: boolean;
  stats: PublicProfileStats;
  schedule: PublicScheduleItem[];
}

// ============================================================
// Madde 6, Faz 2 — Engelleme + Mesajlaşma
// ============================================================

export interface MessageItem {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  read_at?: string | null;
}

export interface ConversationItem {
  id: string;
  other_user: UserCard;
  last_message_preview?: string | null;
  last_message_sender_id?: string | null;
  last_message_at: string;
  unread_count: number;
}

export interface ConversationThread {
  conversation_id: string;
  other_user: UserCard;
  messages: MessageItem[];
}

// ============================================================
// Madde 6, Faz 3 — Meydan okuma (challenge)
// ============================================================

export type ChallengeStatus = 'pending' | 'accepted' | 'declined' | 'completed' | 'cancelled';

export interface ChallengeItem {
  id: string;
  mode: string;
  status: ChallengeStatus;
  is_challenger: boolean;
  other_user?: UserCard | null;
  your_session_id?: string | null;
  opponent_session_id?: string | null;
  winner_id?: string | null;
  you_won?: boolean | null;
  created_at: string;
  responded_at?: string | null;
  completed_at?: string | null;
}

export interface ChallengesList {
  incoming: ChallengeItem[];
  outgoing: ChallengeItem[];
  active: ChallengeItem[];
  completed: ChallengeItem[];
}

export interface AuditLogEntry {
  id: string;
  actor_id?: string | null;
  actor_email?: string | null;
  action: string;
  target_type?: string | null;
  target_id?: string | null;
  detail?: Record<string, unknown> | null;
  created_at: string;
}
