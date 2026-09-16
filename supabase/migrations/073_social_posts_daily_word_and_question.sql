-- Migration: 073_social_posts_daily_word_and_question
-- Proje: Lexis (mrxeuxscyztpiuagsumh)
-- Kapsam: kullanıcı isteği (16 Eylül 2026) — Telegram/Slack/WhatsApp'a her gün
-- HEM "günün kelimesi" HEM bir soru (quiz/sınav sorusu dönüşümlü) düşmeli;
-- önceki tasarımda günde tek bir içerik türü dönüşümlü paylaşılıyordu (word ->
-- quiz -> exam_question -> word -> ...), bu yüzden bazı günler kelime hiç
-- gelmiyordu. post_date üzerindeki tekil kısıt gevşetiliyor: artık aynı gün
-- için biri "word" biri "quiz"/"exam_question" olmak üzere İKİ satır olabilir.
-- Not: bu değişiklik Supabase MCP (apply_migration) ile canlıya zaten
-- uygulandı; bu dosya repo geçmişi/reprodüksiyon amaçlı.

ALTER TABLE public.social_posts
    DROP CONSTRAINT social_posts_post_date_key;

ALTER TABLE public.social_posts
    ADD CONSTRAINT social_posts_post_date_content_type_key UNIQUE (post_date, content_type);
