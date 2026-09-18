-- 078_placement_level.sql
-- 18 Eylul 2026 -- kullanici istegi: seviye tespit sinavi sonucunda hesaplanan
-- CEFR seviyesinin kullanicinin (learning_lang bazinda) profiline eklenmesi,
-- boylece hem uygulama ici "sinava yonlendirme" kontrolu hem de raporlar
-- (user_report_service.py) bu degeri okuyabilsin.
--
-- user_learning_languages tablosuna eklendi (profiles'a degil) cunku bir
-- kullanici birden fazla dil ogreniyor olabilir -- her dilin kendi seviye
-- tespit sonucu olmali (bkz. backend/app/api/routes/exams.py::finish_session
-- ve backend/app/services/user_report_service.py).
--
-- Bu migration Supabase MCP ile dogrudan canli veritabanina uygulandi
-- (project_id: mrxeuxscyztpiuagsumh, migration adi:
-- user_learning_languages_placement_level) -- bu dosya repo/kod ile
-- veritabani semasi arasinda parity saglamak icin ekleniyor.

ALTER TABLE public.user_learning_languages
  ADD COLUMN IF NOT EXISTS placement_level text,
  ADD COLUMN IF NOT EXISTS placement_completed_at timestamptz;

ALTER TABLE public.user_learning_languages
  ADD CONSTRAINT user_learning_languages_placement_level_check
  CHECK (placement_level IS NULL OR placement_level IN ('a1','a2','b1','b2','c1','c2'));
