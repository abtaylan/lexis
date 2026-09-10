-- Faz 3e: round-servis uçları için duel'in şu an hangi turda olduğunu
-- takip eden sütun. Round ilerlemesi backend tarafından (advance ucu ile)
-- sıralı şekilde yönetiliyor — duel_rounds.round_index 0'dan round_count-1'e
-- kadar önceden (start_duel'de) üretiliyor, current_round_index bunlardan
-- hangisinin "canlı" olduğunu gösteriyor.
ALTER TABLE public.duels ADD COLUMN current_round_index integer NOT NULL DEFAULT 0;
