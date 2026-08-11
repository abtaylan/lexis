-- Migration: XP sistemi + kelime tahmin oyunu altyapısı
-- Proje: Lexis (mrxeuxscyztpiuagsumh)
-- Tarih: 11 Ağustos 2026

-- ============================================================
-- 1. profiles: XP alanları
-- ============================================================
ALTER TABLE public.profiles ADD COLUMN total_xp integer NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN level integer NOT NULL DEFAULT 1;

-- ============================================================
-- 2. Enum tipleri (mevcut word_status / study_type deseniyle uyumlu)
-- ============================================================
CREATE TYPE public.xp_source_type AS ENUM (
    'quiz',
    'flashcard_review',
    'schedule_complete',
    'daily_goal_bonus',
    'game_wordle',
    'game_multiple_choice',
    'game_typing',
    'game_matching',
    'game_listening',
    'game_sprint'
  );

CREATE TYPE public.game_mode AS ENUM (
    'wordle',
    'multiple_choice',
    'typing',
    'matching',
    'listening',
    'sprint'
  );

CREATE TYPE public.word_pool_source AS ENUM ('own', 'general');

-- ============================================================
-- 3. xp_events
-- ============================================================
CREATE TABLE public.xp_events (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES public.profiles(id),
      source_type public.xp_source_type NOT NULL,
      source_id uuid,
      amount integer NOT NULL,
      metadata jsonb,
      created_at timestamptz NOT NULL DEFAULT now()
  );

CREATE INDEX xp_events_user_id_idx ON public.xp_events(user_id);

ALTER TABLE public.xp_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own xp_events"
  ON public.xp_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own xp_events"
  ON public.xp_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 4. general_word_pool
-- ============================================================
CREATE TABLE public.general_word_pool (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      source_lang varchar NOT NULL REFERENCES public.languages(code),
      target_lang varchar NOT NULL REFERENCES public.languages(code),
      word varchar NOT NULL,
      meaning text NOT NULL,
      example text,
      difficulty_level varchar,
      is_active boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now()
  );

CREATE INDEX general_word_pool_lang_idx
  ON public.general_word_pool(source_lang, target_lang);

ALTER TABLE public.general_word_pool ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active general_word_pool"
  ON public.general_word_pool FOR SELECT
  USING (is_active = true);

-- ============================================================
-- 5. game_sessions
-- ============================================================
CREATE TABLE public.game_sessions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES public.profiles(id),
      mode public.game_mode NOT NULL,
      pool_source public.word_pool_source NOT NULL,
      score integer NOT NULL DEFAULT 0,
      xp_earned integer NOT NULL DEFAULT 0,
      started_at timestamptz NOT NULL DEFAULT now(),
      ended_at timestamptz
  );

CREATE INDEX game_sessions_user_id_idx ON public.game_sessions(user_id);

ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own game_sessions"
  ON public.game_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own game_sessions"
  ON public.game_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own game_sessions"
  ON public.game_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own game_sessions"
  ON public.game_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- 6. game_attempts
-- ============================================================
CREATE TABLE public.game_attempts (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      session_id uuid NOT NULL REFERENCES public.game_sessions(id),
      word_id uuid REFERENCES public.words(id),
      general_word_id uuid REFERENCES public.general_word_pool(id),
      is_correct boolean NOT NULL,
      attempts_count integer NOT NULL DEFAULT 1,
      time_taken_ms integer,
      xp_awarded integer NOT NULL DEFAULT 0,
      created_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT game_attempts_word_ref_check CHECK (
        (word_id IS NOT NULL AND general_word_id IS NULL) OR
        (word_id IS NULL AND general_word_id IS NOT NULL)
      )
  );

CREATE INDEX game_attempts_session_id_idx ON public.game_attempts(session_id);

ALTER TABLE public.game_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own game_attempts"
  ON public.game_attempts FOR SELECT
  USING (
      EXISTS (
        SELECT 1 FROM public.game_sessions s
        WHERE s.id = game_attempts.session_id AND s.user_id = auth.uid()
      )
    );

CREATE POLICY "Users can insert own game_attempts"
  ON public.game_attempts FOR INSERT
  WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.game_sessions s
        WHERE s.id = game_attempts.session_id AND s.user_id = auth.uid()
      )
    );
