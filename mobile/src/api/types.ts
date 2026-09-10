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

// Kullanıcı isteği (8 Eylül 2026) — tüm yabancı dil sınavları için sınav
// hatırlatıcısı (YDS, YÖKDİL, e-YDS, TOEFL, IELTS vb.).
export interface ExamReminder {
  id: string;
  user_id: string;
  exam_name: string;
  exam_date: string; // YYYY-MM-DD
  note: string | null;
  created_at: string;
}

export interface ExamReminderCreate {
  exam_name: string;
  exam_date: string; // YYYY-MM-DD
  note?: string;
}

export interface ScheduleTemplateCreate {
  name: string;
  items: ScheduleTemplateItem[];
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
    total: number;
    learned: number;
    learning: number;
    archived: number;
    active: number;
    passive: number;
  };
  type_breakdown: TypeBreakdown[];
  daily_added: DailyAdded[];
  daily_progress: DailyProgressRow[];
}

// ── Sosyal (arkadaşlar/takip/mesajlaşma/herkese açık profil) — web'in
// types/index.ts'inden birebir. Meydan okuma (challenge) tipleri de
// forward-compat için eklendi ama Faz 3 mobil ekranları henüz kullanmıyor
// (bkz. backlog — Challenges sekmesi bilinçli olarak sonraki bir faza
// bırakıldı, web'deki friends sayfasının ~%40'ını oluşturan ayrı bir
// oyun-entegrasyonu alt özelliği). ──
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

// ── Abonelik (Premium) ──────────────────────────────────────
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

// ── Mobil Apple/Google IAP — kullanıcı kararı: web'de iyzico kalıyor,
// mobilde store kuralları gereği native IAP kullanılıyor (bkz.
// mobile/src/app/(app)/premium.tsx ve backend app/api/routes/subscription.py
// içindeki aynı gerekçe notu). PricingPlan/CheckoutResponse yukarıda hâlâ
// mobil types.ts'te duruyor (forward-compat / web ile tip paylaşımı için)
// ama premium.tsx artık bunları KULLANMIYOR.
export interface VerifyPurchaseRequest {
  platform: 'ios' | 'android';
  product_id: string;
  transaction_id: string;
  purchase_token: string;
}

export interface VerifyPurchaseResponse {
  is_premium: boolean;
  premium_until?: string;
  plan_code?: string;
  status?: string;
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

// Rozetler — bkz. backend/app/services/badge_service.py::get_user_badges /
// web'deki lib/api.ts::UserBadge ile birebir aynı şekil.
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

// ── Sınav Hazırlık Alanı (Exam Prep — YDS/YÖKDİL/IELTS/TOEFL) ──────────────
export type ExamType = 'yds' | 'yokdil' | 'ielts' | 'toefl';
export type ExamSessionMode = 'practice' | 'timed_mock';

export interface ExamTypeInfo {
  exam_type: ExamType;
  question_count: number;
  available: boolean;
}

export interface ExamSession {
  id: string;
  exam_type: ExamType;
  session_mode: ExamSessionMode;
  total_questions: number;
  time_limit_seconds: number | null;
  score: number;
  xp_earned: number;
  started_at: string;
  ended_at: string | null;
}

export interface ExamQuestionOption {
  id: string;
  text: string;
}

export interface NextQuestionResult {
  finished: boolean;
  question_id?: string | null;
  question_text?: string | null;
  options?: ExamQuestionOption[] | null;
  question_index?: number | null;
  total_questions?: number | null;
}

export interface ExamRelatedWord {
  word: string;
  meaning: string;
  example?: string | null;
}

export interface RelatedGrammarTopic {
  slug: string;
  title_tr: string;
  category_name_tr: string;
}

export interface ExamAttemptResult {
  id: string;
  is_correct: boolean;
  correct_option: string;
  explanation: string;
  related_words?: ExamRelatedWord[] | null;
  xp_awarded: number;
  session_score: number;
  leveled_up: boolean;
  new_level: number | null;
  // Madde #3a/#3b: yanlış cevapta ilgili gramer konusuna yönlendirme +
  // aynı konudan ekstra pratik önerisi.
  topic_tag?: string | null;
  related_grammar_topic?: RelatedGrammarTopic | null;
}

export interface ExamPracticeQuestionItem {
  id: string;
  exam_type: ExamType;
  question_text: string;
  options: ExamQuestionOption[];
  correct_option: string;
  explanation: string;
}

export interface ExamPracticeQuestionsResult {
  topic_tag: string;
  related_grammar_topic?: RelatedGrammarTopic | null;
  questions: ExamPracticeQuestionItem[];
}

export interface WeakTopicItem {
  topic_tag: string;
  total_count: number;
  wrong_count: number;
  accuracy_ratio: number;
  related_grammar_topic?: RelatedGrammarTopic | null;
}

export interface WeakTopicsResult {
  period_days: number;
  items: WeakTopicItem[];
}

// V2 madde #6 (Faz 2) -- kelime tarafi zayif alan istatistigi.
export interface WeakWordTypeItem {
  word_type: string;
  word_count: number;
  avg_ease_factor: number;
}

export interface WeakWordTypesResult {
  period_days: number;
  items: WeakWordTypeItem[];
}

// V2 madde #6 (Faz 2) -- oyun tarafi zayif alan istatistigi.
export interface WeakDifficultyItem {
  difficulty_level: string;
  total_count: number;
  wrong_count: number;
  accuracy_ratio: number;
}

export interface WeakDifficultyResult {
  period_days: number;
  items: WeakDifficultyItem[];
}

export interface ExamFinishResult {
  id: string;
  exam_type: ExamType;
  session_mode: ExamSessionMode;
  score: number;
  total_questions: number;
  xp_earned: number;
  started_at: string;
  ended_at: string;
  mock_bonus_xp: number;
}

export interface AddWordFromQuestionResult {
  added_count: number;
  already_had_count: number;
}

export interface ExamQuestionSuggestionInput {
  exam_type: ExamType;
  question_text: string;
  options: ExamQuestionOption[];
  correct_option: string;
  explanation?: string | null;
  topic_tag?: string | null;
}

export interface ExamQuestionSuggestionResult {
  id: string;
  status: string;
}

export interface GrammarExampleSentence {
  en: string;
  tr?: string | null;
}

export interface GrammarCommonMistake {
  wrong: string;
  correct: string;
  note: string;
}

export interface GrammarCategory {
  id: string;
  slug: string;
  name_tr: string;
  name_en: string;
  sort_order: number;
}

export interface GrammarTopicSummary {
  id: string;
  slug: string;
  category_id: string;
  title_tr: string;
  summary_tr: string;
  level: string;
  exam_relevance: string[];
  sort_order: number;
  has_practice_questions: boolean;
}

export interface GrammarTopicDetail extends GrammarTopicSummary {
  rule_content_md: string;
  example_sentences: GrammarExampleSentence[];
  common_mistakes: GrammarCommonMistake[];
}

// ── V2 §6.3 Faz 3 — Düello, Lig, Görev Haritası ──
// web/src/types/index.ts'teki aynı adlı tiplerle birebir (backend Pydantic
// şemalarına karşılık gelir, bkz. backend/app/schemas/duels.py|leagues.py|quests.py).

export type DuelStatus = 'waiting' | 'active' | 'finished' | 'cancelled';

export interface DuelParticipantItem {
  user_id: string;
  username?: string | null;
  avatar_url?: string | null;
  score: number;
  joined_at: string;
  left_at?: string | null;
}

export interface DuelResponse {
  id: string;
  mode: string;
  status: DuelStatus;
  learning_lang: string;
  created_by: string;
  max_players: number;
  round_count: number;
  created_at: string;
  started_at?: string | null;
  ended_at?: string | null;
  participant_count: number;
}

export interface DuelListResponse {
  items: DuelResponse[];
}

export interface DuelStatusResponse extends DuelResponse {
  participants: DuelParticipantItem[];
}

export interface DuelRoundPublic {
  round_index: number;
  definition: string;
  options: string[];
  started_at: string;
  ends_at: string;
}

export interface DuelAnswerResponse {
  is_correct: boolean;
  correct_option: string;
  score: number;
}

export interface DuelInviteItem {
  id: string;
  duel_id: string;
  status: 'pending' | 'accepted' | 'declined' | 'cancelled';
  is_inviter: boolean;
  other_user: UserCard | null;
  created_at: string;
  responded_at?: string | null;
}

export interface DuelInvitesListResponse {
  items: DuelInviteItem[];
}

export interface LeagueMemberItem {
  user_id: string;
  username?: string | null;
  avatar_url?: string | null;
  xp: number;
  is_me: boolean;
  // Faz 3 devami (10 Eylul 2026 -- "kazanilan oyun, kazanilan duello gibi
  // sayisal degerler eklenmeli, ayni puanda olanlar bunlara gore
  // siralanacak"): bu hafta xp_events'ten sayilan sayaclar -- backend
  // esitlikte siralamayi ONCE duels_won SONRA games_won SONRA
  // flashcards_reviewed'a gore kirar. flashcards_reviewed: ucuncu geri
  // bildirim (10 Eylul 2026 -- "quizlet ve flashcards basarilari da
  // eklensin") -- "quizlet" tarzi oyunlar zaten games_won icinde.
  games_won: number;
  duels_won: number;
  flashcards_reviewed: number;
}

export interface LeagueStatusResponse {
  league_id: string;
  tier_slug: string;
  tier_index: number;
  group_name: string;
  week_start: string;
  week_end: string;
  members: LeagueMemberItem[];
}

export interface LeagueOverviewGroup {
  league_id: string;
  tier_slug: string;
  tier_index: number;
  tier_name_tr: string;
  tier_name_en: string;
  group_name: string;
  member_count: number;
  top_members: LeagueMemberItem[];
  is_mine: boolean;
}

export interface LeagueOverviewResponse {
  groups: LeagueOverviewGroup[];
}

export interface QuestNodeItem {
  id: string;
  slug: string;
  title_tr: string;
  title_en: string;
  description_tr?: string | null;
  description_en?: string | null;
  requirement_type: string;
  requirement_count: number;
  reward_xp: number;
  reward_badge_code?: string | null;
  order_index: number;
  current_value: number;
  is_completed: boolean;
  is_unlocked: boolean;
  completed_at?: string | null;
}

export interface QuestListResponse {
  items: QuestNodeItem[];
}

// ============================================================
// V2 Faz 3 devami (10 Eylul 2026 kullanici istegi) -- Ozel Lig
// web/src/types/index.ts'teki aynı adlı tiplerle birebir (bkz.
// backend/app/schemas/custom_leagues.py).
// ============================================================

export interface CustomLeagueMemberItem {
  user_id: string;
  username?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
  xp: number;
  games_won: number;
  duels_won: number;
  flashcards_reviewed: number;
  is_me: boolean;
  is_creator: boolean;
  joined_at: string;
}

export interface CustomLeagueItem {
  id: string;
  name: string;
  created_by: string;
  max_members: number;
  member_count: number;
  created_at: string;
  is_creator: boolean;
}

export interface CustomLeagueListResponse {
  items: CustomLeagueItem[];
}

export interface CustomLeagueDetailResponse {
  id: string;
  name: string;
  created_by: string;
  max_members: number;
  created_at: string;
  members: CustomLeagueMemberItem[];
}

export interface CustomLeagueInviteItem {
  id: string;
  league_id: string;
  league_name: string;
  inviter_id: string;
  inviter_username?: string | null;
  inviter_display_name?: string | null;
  invitee_id: string;
  invitee_username?: string | null;
  invitee_display_name?: string | null;
  status: 'pending' | 'accepted' | 'declined' | 'cancelled';
  created_at: string;
  is_received: boolean;
}

export interface CustomLeagueInvitesListResponse {
  items: CustomLeagueInviteItem[];
}
