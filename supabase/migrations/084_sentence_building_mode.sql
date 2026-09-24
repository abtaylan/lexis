-- 084_sentence_building_mode.sql
--
-- "Cumle Kurma" (24 Eylul 2026, Madde 2 -- ucuncu secim, roleplay/gunluk
-- kelime avindan sonra): kullanici, general_word_pool.example'da zaten
-- kayitli TEMIZ (kisa, tam) ornek cumleleri karisik kelime sirasiyla
-- gorur, dogru sirayla dizmeye calisir. YENI bir tablo/servis YOK --
-- games.py'deki MEVCUT game_sessions/game_attempts/XP/seri altyapisina
-- YEDINCI bir mod olarak eklendi (wordle'in ayni altyapiyi state jsonb
-- alaniyla genislettigi desenle AYNI mantik, burada state bile
-- gerekmiyor -- dogru sira zaten next-word yanitinda istemciye
-- gonderiliyor, tipki word_to_meaning yonunde kelimenin kendisinin
-- gonderilmesi gibi, dogruluk istemci tarafinda kontrol edilip
-- self-report ediliyor -- diger butun mod'larla AYNI guven modeli).
--
-- game_sessions.mode / xp_events.source_type ENUM'lari (Postgres tipleri,
-- Python Literal/Enum'larla AYRI ayri senkron tutulmasi gereken, migration
-- 038/039/069/071/082/083'te tekrar eden hata sinifi) burada da IKISI
-- BIRDEN, TEK migration'da guncelleniyor.
ALTER TYPE public.game_mode ADD VALUE IF NOT EXISTS 'sentence_building';
ALTER TYPE public.xp_source_type ADD VALUE IF NOT EXISTS 'game_sentence_building';
