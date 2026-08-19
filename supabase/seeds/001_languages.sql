-- ============================================================
-- LEXIS — Seed: Languages
-- ============================================================

INSERT INTO languages (code, name_native, name_en, flag_emoji, is_active) VALUES
('en', 'English',    'English',  '🇬🇧', true),
('tr', 'Türkçe',     'Turkish',  '🇹🇷', true),
('de', 'Deutsch',    'German',   '🇩🇪', false),
('fr', 'Français',  'French',   '🇫🇷', false),
('es', 'Español',   'Spanish',  '🇪🇸', false),
('it', 'Italiano',  'Italian',  '🇮🇹', false),
('ja', '日本語',     'Japanese', '🇯🇵', false),
('ar', 'العربية',   'Arabic',   '🇸🇦', false),
('ru', 'Русский',   'Russian',  '🇷🇺', false)
ON CONFLICT (code) DO NOTHING;
-- 'ru' Madde 4 kapsamında 19 Ağustos 2026'da eklendi (bkz. backend/schedule_templates.py).
-- is_active=false: kelime/quiz içeriği hazır olmadan aktif edilmemeli.
