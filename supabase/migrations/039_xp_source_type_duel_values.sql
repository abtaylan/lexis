-- Faz 3f: Gerçek Zamanlı Düello için XP kaynak tiplerinin önceden
-- tanımlanması (backend/app/services/xp_service.py::XPSourceType /
-- XP_AMOUNTS ile birlikte, AYNI COMMIT içinde — 038 migration'ında
-- düzeltilen Python/DB enum senkronizasyon hatasının hemen tekrarına
-- düşmemek için). Round-servis uçları henüz bu değerleri KULLANMIYOR
-- (bkz. duels.py modül docstring'i, alt-faz 3e) — flashcard_review /
-- schedule_complete / daily_goal_bonus emsaliyle tutarlı, önceden
-- eklenen ama henüz çağrılmayan değerler.
ALTER TYPE public.xp_source_type ADD VALUE IF NOT EXISTS 'duel_participation';
ALTER TYPE public.xp_source_type ADD VALUE IF NOT EXISTS 'duel_win';
