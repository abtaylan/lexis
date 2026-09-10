-- ============================================================
-- LEXIS — Görev ödülleri (XP + rozet) + xp_source_type genişletmesi
-- Migration: 045_quest_rewards_and_xp_source.sql
-- ============================================================
-- Kullanıcı sorusu (10 Eylül 2026): görev tamamlamanın da bir ödülü
-- olmalı (sadece işaretleme yetmiyor). quest_nodes'a reward_xp +
-- reward_badge_code ekleniyor; backend (routes/quests.py) tamamlanınca
-- ikisini de verecek.
--
-- ÖNEMLİ (bugünkü derste TEKRAR uygulanan kural): yeni bir xp_source_type
-- değeri hem Python'a (xp_service.py::XPSourceType/XP_AMOUNTS) HEM DB
-- enum'una AYNI COMMIT'te eklenmeli — 038 migration'ında düzeltilen
-- exam_question/exam_mock_complete hatasının tekrarına düşmemek için.
-- "quest_complete" burada DB enum'una ekleniyor, Python tarafı aynı
-- commit'te (bkz. backend/app/services/xp_service.py).
-- ============================================================

ALTER TYPE public.xp_source_type ADD VALUE IF NOT EXISTS 'quest_complete';

ALTER TABLE public.quest_nodes ADD COLUMN reward_xp integer NOT NULL DEFAULT 0;
ALTER TABLE public.quest_nodes ADD COLUMN reward_badge_code varchar(60) REFERENCES public.badges(code);

UPDATE public.quest_nodes SET reward_xp = 20 WHERE slug = 'xp-100';
UPDATE public.quest_nodes SET reward_xp = 30, reward_badge_code = 'first_duel_win' WHERE slug = 'duel-1';
UPDATE public.quest_nodes SET reward_xp = 50 WHERE slug = 'xp-500';
UPDATE public.quest_nodes SET reward_xp = 50 WHERE slug = 'duel-3';
UPDATE public.quest_nodes SET reward_xp = 100 WHERE slug = 'xp-1000';
