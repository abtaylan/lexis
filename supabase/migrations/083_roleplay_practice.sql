-- 083_roleplay_practice.sql
--
-- "Roleplay/diyalog botu" (24 Eylul 2026, Madde 2 -- Gunluk Kelime Avi'nden
-- sonraki ikinci secim, bkz. daily_challenge_service.py'nin ayni oturumdaki
-- modul docstring'i): kullanici, onceden tanimli bir senaryoda (kafede
-- siparis, otelde check-in, is gorusmesi vb. -- bkz.
-- backend/app/services/roleplay_service.py::SCENARIOS) Anthropic API ile
-- hedef dilde canli bir diyalog kurar. Mikrofon/STT YOK (kullanicinin
-- "mobilde acilma/kapanma sorunlariyla karsilasmayalim" istegiyle tutarli
-- olarak yeni bir native modul eklenmedi) -- tamamen metin tabanli.
--
-- Senaryo KATALOGU DB'de DEGIL, Python'da statik (exams.py::
-- SUPPORTED_EXAM_TYPES ile AYNI desen) -- kullaniciya gore degismeyen,
-- nadiren guncellenen sabit bir liste, ayri bir tabloya/moderasyona
-- gerek yok.
CREATE TABLE public.roleplay_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    scenario_slug text NOT NULL,
    learning_lang text NOT NULL,
    native_lang text NOT NULL,
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed')),
    -- Kullanicinin gonderdigi mesaj sayisi -- XP kurali (asagida) bu sayi
    -- ile calisir, "merhaba" + "hoscakal" gibi bos oturumlarin XP
    -- farmlamasini onlemek icin.
    turn_count integer NOT NULL DEFAULT 0,
    xp_awarded boolean NOT NULL DEFAULT false,
    started_at timestamptz NOT NULL DEFAULT now(),
    completed_at timestamptz
);

CREATE INDEX roleplay_sessions_user_idx ON public.roleplay_sessions (user_id, started_at DESC);

-- GUVENLIK: study_programs/daily_word_challenges ile AYNI ilke -- RLS ACIK,
-- hicbir client policy YOK, sadece service-role (backend'in supabase_admin'i)
-- okuyup yazabilir. Burada "kelimeyi ifsa etme" riski yok ama kod tabaninin
-- YERLESIK deseni (bkz. 081_study_programs.sql) zaten TUM yeni tablolarda
-- bu -- backend disinda hicbir client Supabase'e dogrudan yazmiyor.
ALTER TABLE public.roleplay_sessions ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.roleplay_messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id uuid NOT NULL REFERENCES public.roleplay_sessions(id) ON DELETE CASCADE,
    role text NOT NULL CHECK (role IN ('user', 'assistant')),
    content text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX roleplay_messages_session_idx ON public.roleplay_messages (session_id, created_at);

ALTER TABLE public.roleplay_messages ENABLE ROW LEVEL SECURITY;

-- XP kurali (LEXIS_XP_YENI_KURALLAR.md): yeni source_type HEM Python
-- (xp_service.py::XPSourceType + XP_AMOUNTS) HEM DB enum'da tanimlanmali,
-- aksi halde award_xp() cagrisi 500/503 ile patlar (migration 038, 039,
-- 069, 071, 082'deki tekrarlayan hata sinifi -- bu sefer de TEK
-- migration'da ikisi birden yapiliyor).
ALTER TYPE public.xp_source_type ADD VALUE IF NOT EXISTS 'roleplay_session';
