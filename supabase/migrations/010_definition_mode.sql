-- ============================================================
-- LEXIS — Faz 2: İngilizce Tanım (Definition) Modu
-- Bu migration önceden Supabase MCP üzerinden canlı projeye
-- uygulandı (apply_migration: add_definition_to_general_word_pool,
-- add_game_multiple_choice_definition_to_xp_source_type). Bu dosya
-- repo geçmişinde iz bırakmak / yeni ortamlarda tekrar uygulanabilmek
-- için eklenmiştir.
-- ============================================================

-- general_word_pool'a monolingual İngilizce tanım kolonu ekle.
-- Sadece source_lang='en' satırları için doldurulur (backfill script'i
-- ile). "İngilizce tanım -> İngilizce kelime" quiz yönünde kullanılır.
ALTER TABLE general_word_pool ADD COLUMN IF NOT EXISTS definition text;

COMMENT ON COLUMN general_word_pool.definition IS
  'Monolingual English dictionary-style definition, used by the '
  '"English definition -> English word" quiz direction (Faz 2). '
  'Nullable; only backfilled for source_lang=en rows.';

-- multiple_choice oyun modunda üçüncü yön (definition_to_word) için
-- ayrı XP kaynağı (en zor kabul edilir, en yüksek XP).
ALTER TYPE xp_source_type ADD VALUE IF NOT EXISTS 'game_multiple_choice_definition';
