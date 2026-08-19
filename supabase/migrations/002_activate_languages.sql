-- ============================================================
-- LEXIS — Dilleri aktifleştir
-- Supabase SQL Editor'da çalıştır
-- ============================================================

-- Mevcut dilleri aktif yap (yoksa ekle)
INSERT INTO languages (code, name_native, name_en, flag_emoji, is_active) VALUES
  ('en', 'English',   'English',  '🇬🇧', true),
  ('tr', 'Türkçe',    'Turkish',  '🇹🇷', true),
  ('de', 'Deutsch',   'German',   '🇩🇪', true),
  ('fr', 'Français',  'French',   '🇫🇷', true),
  ('es', 'Español',   'Spanish',  '🇪🇸', true),
  ('it', 'Italiano',  'Italian',  '🇮🇹', true),
  ('ja', '日本語',     'Japanese', '🇯🇵', true),
  ('ar', 'العربية',    'Arabic',   '🇸🇦', true),
  ('ru', 'Русский',   'Russian',  '🇷🇺', true),
  ('pt', 'Português', 'Portuguese','🇵🇹', true)
ON CONFLICT (code) DO UPDATE
  SET is_active = EXCLUDED.is_active,
      name_native = EXCLUDED.name_native,
      name_en = EXCLUDED.name_en,
      flag_emoji = EXCLUDED.flag_emoji;
