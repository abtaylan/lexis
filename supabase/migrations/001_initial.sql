-- ============================================================
-- LEXIS — Initial Database Schema
-- Migration: 001_initial.sql
-- ============================================================

-- Uzantılar
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- fuzzy search için

-- ============================================================
-- ENUM TIPLERI
-- ============================================================

CREATE TYPE word_status AS ENUM ('learning', 'learned', 'archived');
CREATE TYPE list_type AS ENUM ('active', 'passive');
CREATE TYPE user_role AS ENUM ('user', 'admin');
CREATE TYPE study_type AS ENUM ('flashcard', 'quiz', 'review');

-- ============================================================
-- DİLLER
-- ============================================================

CREATE TABLE languages (
    id          SERIAL PRIMARY KEY,
    code        VARCHAR(10) UNIQUE NOT NULL,  -- 'en', 'tr', 'de'
    name_native VARCHAR(50) NOT NULL,          -- 'English', 'Türkçe'
    name_en     VARCHAR(50) NOT NULL,          -- 'English', 'Turkish'
    flag_emoji  VARCHAR(10),
    is_active   BOOLEAN DEFAULT true,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- KULLANICILAR (Supabase Auth ile entegre)
-- ============================================================

CREATE TABLE profiles (
    id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username        VARCHAR(50) UNIQUE,
    display_name    VARCHAR(100),
    avatar_url      TEXT,
    role            user_role DEFAULT 'user',
    native_lang     VARCHAR(10) DEFAULT 'tr' REFERENCES languages(code),
    learning_lang   VARCHAR(10) DEFAULT 'en' REFERENCES languages(code),
    daily_goal      INT DEFAULT 5,
    timezone        VARCHAR(50) DEFAULT 'Europe/Istanbul',
    is_active       BOOLEAN DEFAULT true,
    last_seen_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- KELİME HAVUZU
-- ============================================================

CREATE TABLE words (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    word            VARCHAR(200) NOT NULL,
    meaning         TEXT NOT NULL,          -- "kitap / a set of pages..."
    meaning_tr      TEXT,                   -- sadece Türkçe
    meaning_en      TEXT,                   -- sadece İngilizce
    example         TEXT,
    word_type       VARCHAR(50),            -- noun, verb, adjective...
    word_type_tr    VARCHAR(50),            -- İsim, Fiil, Sıfat...
    list_type       list_type DEFAULT 'active',
    status          word_status DEFAULT 'learning',
    source_lang     VARCHAR(10) DEFAULT 'en' REFERENCES languages(code),
    target_lang     VARCHAR(10) DEFAULT 'tr' REFERENCES languages(code),
    -- Spaced repetition
    repetition_count    INT DEFAULT 0,
    last_reviewed_at    TIMESTAMPTZ,
    next_review_at      TIMESTAMPTZ,
    ease_factor         FLOAT DEFAULT 2.5,  -- SM-2 algoritması
    interval_days       INT DEFAULT 1,
    -- Meta
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    -- Arama için index
    search_vector   TSVECTOR GENERATED ALWAYS AS (
        to_tsvector('english', coalesce(word, '') || ' ' || coalesce(meaning, ''))
    ) STORED
);

CREATE INDEX idx_words_user_id ON words(user_id);
CREATE INDEX idx_words_status ON words(status);
CREATE INDEX idx_words_next_review ON words(next_review_at);
CREATE INDEX idx_words_search ON words USING GIN(search_vector);
CREATE INDEX idx_words_word_trgm ON words USING GIN(word gin_trgm_ops);

-- ============================================================
-- STREAK & GÜNLÜK HEDEF
-- ============================================================

CREATE TABLE daily_progress (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    date        DATE NOT NULL,
    words_added INT DEFAULT 0,
    words_reviewed INT DEFAULT 0,
    goal        INT DEFAULT 5,
    streak_day  INT DEFAULT 0,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, date)
);

CREATE INDEX idx_daily_progress_user_date ON daily_progress(user_id, date DESC);

-- ============================================================
-- ÇALIŞMA SESSIONları
-- ============================================================

CREATE TABLE study_sessions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    study_type      study_type NOT NULL,
    words_studied   INT DEFAULT 0,
    correct_count   INT DEFAULT 0,
    wrong_count     INT DEFAULT 0,
    duration_secs   INT DEFAULT 0,
    started_at      TIMESTAMPTZ DEFAULT NOW(),
    ended_at        TIMESTAMPTZ
);

CREATE INDEX idx_sessions_user_id ON study_sessions(user_id);

-- ============================================================
-- QUIZ SONUÇLARI
-- ============================================================

CREATE TABLE quiz_results (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id      UUID NOT NULL REFERENCES study_sessions(id) ON DELETE CASCADE,
    word_id         UUID NOT NULL REFERENCES words(id) ON DELETE CASCADE,
    is_correct      BOOLEAN NOT NULL,
    answered_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ÇALIŞMA PROGRAMI
-- ============================================================

CREATE TABLE study_schedule (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Pazar
    time_slot   VARCHAR(20),   -- 'sabah', 'akşam'
    activity    VARCHAR(100),
    duration_min INT DEFAULT 30,
    link_url    TEXT,
    is_active   BOOLEAN DEFAULT true,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- UPDATED_AT OTOMATİK GÜNCELLE
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_words_updated_at
    BEFORE UPDATE ON words
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- YENİ KULLANICI KAYDI — OTOMATİK PROFİL OLUŞTUR
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (id, display_name, username)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1))
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();
