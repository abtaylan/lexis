-- ============================================================
-- LEXIS — Çok Dilli Destek
-- Migration: 004_multilang.sql
-- ============================================================

-- ── words: İngilizce/Türkçe'ye özel kolon adlarını genelleştir ──
-- meaning_en  -> meaning_target  (öğrenilen dildeki anlam/tanım)
-- meaning_tr  -> meaning_native  (kullanıcının ana dilindeki karşılığı)
-- word_type_tr -> word_type_native (ana dile göre yerelleştirilmiş kelime türü)
ALTER TABLE words RENAME COLUMN meaning_en TO meaning_target;
ALTER TABLE words RENAME COLUMN meaning_tr TO meaning_native;
ALTER TABLE words RENAME COLUMN word_type_tr TO word_type_native;

-- ── Tüm dilleri aktif et — "tüm diller için" gereksinimi ──
UPDATE languages SET is_active = true
WHERE code IN ('de', 'fr', 'es', 'it', 'ja', 'ar');

-- İstersen buraya yeni diller ekleyebilirsin, örnek:
-- INSERT INTO languages (code, name_native, name_en, flag_emoji, is_active) VALUES
-- ('ru', 'Русский', 'Russian', '🇷🇺', true),
-- ('pt', 'Português', 'Portuguese', '🇵🇹', true),
-- ('ko', '한국어', 'Korean', '🇰🇷', true),
-- ('nl', 'Nederlands', 'Dutch', '🇳🇱', true)
-- ON CONFLICT (code) DO NOTHING;

-- ── search_vector: 'english' stemming yerine dil-bağımsız 'simple' config ──
-- (generated column olduğu için önce düşürüp aynı adla yeniden oluşturuyoruz)
DROP INDEX IF EXISTS idx_words_search;
ALTER TABLE words DROP COLUMN search_vector;
ALTER TABLE words ADD COLUMN search_vector TSVECTOR GENERATED ALWAYS AS (
    to_tsvector('simple', coalesce(word, '') || ' ' || coalesce(meaning, ''))
) STORED;
CREATE INDEX idx_words_search ON words USING GIN(search_vector);
