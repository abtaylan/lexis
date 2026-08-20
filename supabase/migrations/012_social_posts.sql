-- Migration: Madde 3b (revize) — Sosyal medya günlük içerik paylaşımı
-- Proje: Lexis (mrxeuxscyztpiuagsumh)
-- Kapsam: hatırlatma DEĞİL, sadece otomatik içerik paylaşımı (Telegram bot +
-- Slack webhook). Not: bu değişiklikler Supabase MCP (apply_migration) ile
-- canlıya zaten uygulandı; bu dosya repo geçmişi/reprodüksiyon amaçlı.

CREATE TABLE public.social_posts (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Aynı gün script birden fazla kez çalışsa bile (cron çakışması,
    -- manuel yeniden çalıştırma) tekrar paylaşım yapılmasını engelleyen
    -- dedup anahtarı.
    post_date      date NOT NULL UNIQUE,
    content_type   text NOT NULL CHECK (content_type IN ('word', 'quiz')),
    general_word_id uuid REFERENCES public.general_word_pool(id) ON DELETE SET NULL,
    -- 'quiz' için soru metni + seçenekler + doğru cevap; 'word' için NULL.
    question_text  text,
    options        jsonb,
    correct_answer text,
    telegram_sent  boolean NOT NULL DEFAULT false,
    slack_sent     boolean NOT NULL DEFAULT false,
    created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX social_posts_word_idx ON public.social_posts(general_word_id);

-- Bu tablo herhangi bir kullanıcıya ait değil (genel/pazarlama içeriği) ve
-- hiçbir API endpoint'i üzerinden dışarı açılmıyor — sadece backend'in
-- service_role client'ı (supabase_admin, RLS'i bypass eder) tarafından
-- yazılıp okunuyor. RLS'i yine de aktif edip policy eklemeyerek (varsayılan
-- "hepsini reddet") anon/authenticated erişimini güvenlik ağı olarak kapalı
-- tutuyoruz.
ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;
