-- ============================================================
-- LEXIS — Çoklu Dil Öğrenme Altyapısı (Kullanıcı Madde 2)
-- Migration: 009_user_learning_languages.sql
-- ============================================================
-- Tasarım: profiles.learning_lang, "şu an aktif çalışılan dil"in bir
-- AYNASI olarak korunuyor (mevcut games.py/_get_profile_langs,
-- schedule.py/_get_learning_lang gibi tüm okuma noktaları hiç
-- değişmeden çalışmaya devam eder). Kullanıcının öğrendiği TÜM diller
-- ise yeni user_learning_languages tablosunda tutulur; aktif dil
-- değiştirildiğinde hem bu tablodaki is_active bayrağı hem de
-- profiles.learning_lang birlikte güncellenir (bkz. backend
-- app/services/learning_languages.py — set_active_language()).
--
-- Streak/günlük hedef DİL BAZINDA ayrı tutulacak (kullanıcı kararı),
-- bu yüzden daily_progress'e learning_lang eklenip UNIQUE(user_id, date)
-- kısıtı UNIQUE(user_id, date, learning_lang) olarak genişletiliyor.
--
-- total_xp / level (profiles) BİLEREK hesap genelinde tek/global kalıyor
-- (genel oyunlaştırma göstergesi) — xp_events'e eklenen learning_lang
-- sadece "hangi dilde kazanıldı" analitiği için, toplam hesaba girmiyor.
-- ============================================================

-- ============================================================
-- 1. user_learning_languages — kullanıcının öğrendiği diller (many-to-many)
-- ============================================================
CREATE TABLE public.user_learning_languages (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    learning_lang  VARCHAR(10) NOT NULL REFERENCES public.languages(code),
    is_active      BOOLEAN NOT NULL DEFAULT false,  -- şu an "aktif" öğrenilen dil mi (profiles.learning_lang ile senkron)
    daily_goal     INT DEFAULT 5,                    -- dile özel günlük hedef override (NULL ise profiles.daily_goal kullanılır)
    added_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, learning_lang)
);

CREATE INDEX idx_user_learning_languages_user_id ON public.user_learning_languages(user_id);

-- Bir kullanıcının aynı anda sadece 1 aktif dili olabilir
CREATE UNIQUE INDEX idx_user_learning_languages_one_active
    ON public.user_learning_languages(user_id) WHERE is_active;

ALTER TABLE public.user_learning_languages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own learning languages"
    ON public.user_learning_languages FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own learning languages"
    ON public.user_learning_languages FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own learning languages"
    ON public.user_learning_languages FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own learning languages"
    ON public.user_learning_languages FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================
-- 2. Backfill — mevcut kullanıcıların tek learning_lang'ini yeni tabloya taşı
--    (hepsi aktif olarak işaretlenir, çünkü şu ana kadar tek dilleri vardı)
-- ============================================================
INSERT INTO public.user_learning_languages (user_id, learning_lang, is_active, added_at)
SELECT id, learning_lang, true, created_at
FROM public.profiles
WHERE learning_lang IS NOT NULL
ON CONFLICT (user_id, learning_lang) DO NOTHING;

-- ============================================================
-- 3. daily_progress — dil bazında ayrı streak/günlük hedef
-- ============================================================
ALTER TABLE public.daily_progress
    ADD COLUMN learning_lang VARCHAR(10) REFERENCES public.languages(code);

-- Backfill: geçmiş kayıtlar, o zamanki (tek) learning_lang'e ait kabul edilir
UPDATE public.daily_progress dp
SET learning_lang = p.learning_lang
FROM public.profiles p
WHERE dp.user_id = p.id AND dp.learning_lang IS NULL;

-- Eski UNIQUE(user_id, date) kısıtını dil-bazlı hale getir
ALTER TABLE public.daily_progress DROP CONSTRAINT daily_progress_user_id_date_key;
ALTER TABLE public.daily_progress
    ADD CONSTRAINT daily_progress_user_id_date_lang_key UNIQUE (user_id, date, learning_lang);

CREATE INDEX idx_daily_progress_user_lang ON public.daily_progress(user_id, learning_lang, date DESC);

-- ============================================================
-- 4. xp_events / game_sessions / study_sessions — analitik etiketi
--    (nullable — global toplamları etkilemez, sadece "hangi dilde" bilgisi)
-- ============================================================
ALTER TABLE public.xp_events
    ADD COLUMN learning_lang VARCHAR(10) REFERENCES public.languages(code);
UPDATE public.xp_events xe SET learning_lang = p.learning_lang
FROM public.profiles p WHERE xe.user_id = p.id AND xe.learning_lang IS NULL;
CREATE INDEX idx_xp_events_user_lang ON public.xp_events(user_id, learning_lang);

ALTER TABLE public.game_sessions
    ADD COLUMN learning_lang VARCHAR(10) REFERENCES public.languages(code);
UPDATE public.game_sessions gs SET learning_lang = p.learning_lang
FROM public.profiles p WHERE gs.user_id = p.id AND gs.learning_lang IS NULL;
CREATE INDEX idx_game_sessions_user_lang ON public.game_sessions(user_id, learning_lang);

ALTER TABLE public.study_sessions
    ADD COLUMN learning_lang VARCHAR(10) REFERENCES public.languages(code);
UPDATE public.study_sessions ss SET learning_lang = p.learning_lang
FROM public.profiles p WHERE ss.user_id = p.id AND ss.learning_lang IS NULL;
CREATE INDEX idx_study_sessions_user_lang ON public.study_sessions(user_id, learning_lang);
