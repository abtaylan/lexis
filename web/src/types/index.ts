// ─── Auth ────────────────────────────────────────────────────────────────────
export interface User {
  id: string;
  email: string;
  username: string;
  full_name?: string;
  is_admin: boolean;
  daily_goal: number;
  created_at: string;
}

export interface AuthTokens {
  access_token: string;
  token_type: string;
}

export interface LoginForm {
  username: string;
  password: string;
}

export interface RegisterForm {
  email: string;
  username: string;
  password: string;
  full_name?: string;
}

// ─── Words ───────────────────────────────────────────────────────────────────
export interface Word {
  id: string;
  user_id: string;
  word: string;
  definition: string;
  translation?: string;
  example_sentence?: string;
  pronunciation?: string;
  part_of_speech?: string;
  difficulty_level: 1 | 2 | 3 | 4 | 5;
  // Spaced repetition
  ease_factor: number;
  interval: number;
  repetitions: number;
  next_review: string;
  last_reviewed?: string;
  // Meta
  is_favorite: boolean;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface WordCreate {
  word: string;
  definition?: string;
  translation?: string;
  example_sentence?: string;
  pronunciation?: string;
  part_of_speech?: string;
  difficulty_level?: number;
  tags?: string[];
}

export interface WordReview {
  quality: 0 | 1 | 2 | 3 | 4 | 5; // SM-2 quality rating
}

// ─── Dictionary ──────────────────────────────────────────────────────────────
export interface DictionaryEntry {
  word: string;
  definition: string;
  pronunciation?: string;
  part_of_speech?: string;
  example_sentence?: string;
  audio_url?: string;
}

// ─── Stats ───────────────────────────────────────────────────────────────────
export interface Stats {
  total_words: number;
  words_due_today: number;
  words_learned_today: number;
  daily_goal: number;
  streak_days: number;
  longest_streak: number;
  accuracy_rate: number;
  total_reviews: number;
}

export interface DailyProgress {
  date: string;
  words_studied: number;
  correct_answers: number;
  total_answers: number;
  study_time_minutes: number;
}

// ─── Quiz ────────────────────────────────────────────────────────────────────
export interface QuizQuestion {
  word: Word;
  options: string[];
  correct_answer: string;
  question_type: 'meaning' | 'word' | 'fill_blank';
}

export interface QuizResult {
  session_id: string;
  total_questions: number;
  correct_answers: number;
  score_percentage: number;
  time_taken_seconds: number;
  completed_at: string;
}

// ─── Schedule ────────────────────────────────────────────────────────────────
export interface StudySchedule {
  id: string;
  user_id: string;
  day_of_week: number; // 0=Sunday
  start_time: string;
  end_time: string;
  is_active: boolean;
}

// ─── Flashcard ───────────────────────────────────────────────────────────────
export type FlashcardSide = 'front' | 'back';

export interface FlashcardSession {
  words: Word[];
  currentIndex: number;
  reviewed: string[];
  correct: string[];
}

// ─── Admin ───────────────────────────────────────────────────────────────────
export interface AdminUser extends User {
  word_count: number;
  last_active?: string;
}

// ─── API ─────────────────────────────────────────────────────────────────────
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

export interface ApiError {
  detail: string;
  status_code?: number;
}
