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
('ar', 'العربية',   'Arabic',   '🇸🇦', false)
ON CONFLICT (code) DO NOTHING;
