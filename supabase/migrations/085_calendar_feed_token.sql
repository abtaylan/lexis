-- 085_calendar_feed_token.sql
--
-- 9 Ekim 2026 -- Kullanici istegi: "profilimizde sectigimiz calisma
-- programi, telefonda kullanilan takvim uygulamasina entegre olsun".
--
-- Gercek bir OAuth entegrasyonu (Google/Apple Calendar API) yerine,
-- sektorde yaygin olan "URL ile abone ol" (webcal/ics feed) yontemi
-- secildi: hicbir native mobil build/izin gerektirmiyor, Google
-- Calendar / Apple Calendar / Outlook'un hepsi "takvime URL ile abone
-- ol" akisini destekliyor. Her kullanicinin kendi study_schedule'ini
-- donen, tahmin edilemez bir token ile korunan, salt-okunur bir ICS
-- feed endpoint'i (bkz. backend/app/api/routes/schedule.py::get_ics_feed)
-- bu token'i kullaniyor.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS calendar_feed_token text UNIQUE;

CREATE INDEX IF NOT EXISTS profiles_calendar_feed_token_idx
  ON public.profiles(calendar_feed_token)
  WHERE calendar_feed_token IS NOT NULL;
