-- 086_ad_reward_xp.sql
--
-- Odullu reklam (AdMob rewarded) izleyen kullaniciya kucuk bonus XP
-- (api/routes/ads.py). xp_events.source_type bir Postgres ENUM'u oldugu icin
-- (Python Literal'iyle ayri ayri senkron tutulmali -- bkz. 084) yeni kaynak
-- degeri burada eklenir.
ALTER TYPE public.xp_source_type ADD VALUE IF NOT EXISTS 'ad_reward';
