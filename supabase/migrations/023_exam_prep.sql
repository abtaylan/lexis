-- Migration: Sınav Hazırlık Alanı (YDS/YÖKDİL/IELTS/TOEFL) — V2 Yol Haritası
-- §1.1, öncelik #1. Kullanıcı isteği: uygulama içinde bu sınavlar için örnek
-- sorular, doğru cevap analizi, tam süreli (timed) deneme sınavı modu ve
-- sorulardan kelime hazinesine ekleme.
--
-- Tasarım kararları (devir notu §1.1'deki açık soruların çözümü, 9 Eylül 2026):
-- 1) İçerik kaynağı: telif riski nedeniyle gerçek geçmiş YDS/YÖKDİL/IELTS/TOEFL
--    soruları KULLANILMIYOR — sınav formatına uygun orijinal sorular seed
--    ediliyor (bkz. 024_exam_prep_yds_seed.sql).
-- 2) Dil kapsamı: şimdilik sadece native_lang=tr + learning_lang=en kullanıcı
--    kitlesine gösteriliyor (YDS/YÖKDİL zaten TR konuşanlara özel, IELTS/TOEFL
--    de İngilizce öğrenimi gerektirir) — backend bu filtrelemeyi route
--    katmanında yapar (bkz. app/api/routes/exams.py::_exam_area_enabled).
-- 3) Şema: games.py/game_sessions/game_attempts deseniyle tutarlı üç tablo.
-- 4) XP: xp_service.py'ye exam_question / exam_mock_complete eklendi.
-- 5) "Sorulardan kelime ekle": exam_questions.related_words (jsonb) üzerinden.
--
-- Not: Bu değişiklik Supabase MCP (apply_migration) ile canlıya uygulandı;
-- bu dosya repo geçmişi/reprodüksiyon amaçlı eklendi (bkz. 022'deki aynı not).

CREATE TYPE public.exam_type AS ENUM ('yds', 'yokdil', 'ielts', 'toefl');
CREATE TYPE public.exam_session_mode AS ENUM ('practice', 'timed_mock');

-- ============================================================
-- exam_questions — soru bankası (herkese açık okuma, admin/seed ile doldurulur)
-- ============================================================
CREATE TABLE public.exam_questions (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_type        public.exam_type NOT NULL,
    question_text    text NOT NULL,
    options          jsonb NOT NULL,   -- [{"id":"a","text":"..."}, ...] (4 seçenek)
    correct_option   text NOT NULL,    -- options[].id ile eşleşir (örn. "a")
    explanation      text NOT NULL,    -- doğru cevap analizi (neden doğru/yanlış)
    related_words    jsonb,            -- [{"word":"...","meaning":"...","example":"..."}]
    difficulty_level text,             -- 'easy' | 'medium' | 'hard' (opsiyonel)
    is_active        boolean NOT NULL DEFAULT true,
    created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX exam_questions_type_idx ON public.exam_questions(exam_type) WHERE is_active = true;

ALTER TABLE public.exam_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "exam_questions_select_active"
  ON public.exam_questions FOR SELECT
  USING (is_active = true);

CREATE POLICY "exam_questions_admin_all"
  ON public.exam_questions FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- ============================================================
-- exam_sessions
-- ============================================================
CREATE TABLE public.exam_sessions (
    id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id            uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    exam_type          public.exam_type NOT NULL,
    session_mode       public.exam_session_mode NOT NULL DEFAULT 'practice',
    total_questions    integer NOT NULL,
    time_limit_seconds integer,   -- practice modunda NULL, timed_mock'ta dolu
    score              integer NOT NULL DEFAULT 0,
    xp_earned          integer NOT NULL DEFAULT 0,
    started_at         timestamptz NOT NULL DEFAULT now(),
    ended_at           timestamptz
);

CREATE INDEX exam_sessions_user_idx ON public.exam_sessions(user_id);

ALTER TABLE public.exam_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "exam_sessions_select_own"
  ON public.exam_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "exam_sessions_insert_own"
  ON public.exam_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "exam_sessions_update_own"
  ON public.exam_sessions FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================================
-- exam_attempts — session başına her soru en fazla bir kez cevaplanır
-- ============================================================
CREATE TABLE public.exam_attempts (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id      uuid NOT NULL REFERENCES public.exam_sessions(id) ON DELETE CASCADE,
    question_id     uuid NOT NULL REFERENCES public.exam_questions(id),
    selected_option text NOT NULL,
    is_correct      boolean NOT NULL,
    time_taken_ms   integer,
    xp_awarded      integer NOT NULL DEFAULT 0,
    created_at      timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT exam_attempts_session_question_uniq UNIQUE (session_id, question_id)
);

CREATE INDEX exam_attempts_session_idx ON public.exam_attempts(session_id);

ALTER TABLE public.exam_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "exam_attempts_select_own"
  ON public.exam_attempts FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.exam_sessions s WHERE s.id = exam_attempts.session_id AND s.user_id = auth.uid())
  );

CREATE POLICY "exam_attempts_insert_own"
  ON public.exam_attempts FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.exam_sessions s WHERE s.id = exam_attempts.session_id AND s.user_id = auth.uid())
  );
