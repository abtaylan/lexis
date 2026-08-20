-- ============================================================
-- LEXIS — Çok Dilli Program Kaynakları
-- Migration: 005_learning_resources.sql
-- ============================================================

-- Program/aktivite kaynak linklerini kullanıcının learning_lang'ine göre
-- dinamik çözebilmek için ayrı bir kaynak tablosu.
-- category: 'news_reading' | 'technical_article' | 'video_analysis'
--           | 'audio_practice' | 'general_review'

CREATE TABLE learning_resources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    language_code VARCHAR(10) NOT NULL REFERENCES languages(code),
    category VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    url TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_learning_resources_lang_category
    ON learning_resources(language_code, category)
    WHERE is_active = true;

-- study_schedule kayıtlarına, dinamik kaynak eşlemesi için kategori anahtarı ekle.
-- Mevcut kayıtlar NULL kalır (geriye dönük uyumlu); NULL olduğunda backend
-- eski davranışa (sabit link_url) düşer.
ALTER TABLE study_schedule ADD COLUMN IF NOT EXISTS activity_key VARCHAR(50);

-- RLS: learning_resources herkese (login olmuş kullanıcılara) salt-okunur.
ALTER TABLE learning_resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "learning_resources_select_all" ON learning_resources
    FOR SELECT USING (true);
