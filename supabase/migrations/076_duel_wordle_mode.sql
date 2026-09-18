-- 076_duel_wordle_mode.sql
--
-- V2 -- kullanici istegi (18 Eylul 2026): "adam asmacada arkadaş ekleme
-- varsa ... talonun kafasına vurayım. Düello da bu oyunda olmalı."
-- duels.mode zaten public.game_mode enum'unu kullaniyor (bkz. 037_duels_
-- schema.sql) ve bu enum'da 'wordle' ZATEN VAR (bkz. 006_xp_and_games.sql
-- -- games.py'deki tek-oyunculu adam asmaca modu icin). Yani "yeni bir
-- oyun tipi ekle" adimi icin enum/tip degisikligi GEREKMIYOR -- duels.mode
-- 'wordle' olarak set edilebilir hale getirilmesi (backend kod tarafinda,
-- bu migration'a paralel commit'te) yeterli.
--
-- Eksik olan tek sema parcasi: cok-oyunculu bir wordle duellosunda her
-- katilimcinin AYNI kelimede BAGIMSIZ harf-harf tahmin ilerlemesini
-- (hangi harfleri denedi, kac yanlis hakki kaldi) tutacak bir yer --
-- duel_rounds tek bir satir (tum katilimcilar icin ortak), duel_answers
-- ise (duel_round_id, user_id) basina TEK satir tutan bir tablo (bkz.
-- 037_duels_schema.sql UNIQUE constraint) -- games.py'deki game_sessions.
-- state (jsonb) deseniyle AYNI fikir, ama tek bir satir UZERINDE
-- BIRDEN FAZLA guess-letter cagrisi boyunca INCREMENTAL olarak
-- guncellenecek. Bunun icin YENI bir tablo acmak yerine (games.py'deki
-- oturum-state deseniyle tutarli, ve daha onemlisi duel_answers ZATEN
-- dogru guvenlik seviyesinde -- bkz. asagisi) duel_answers'a iki nullable
-- olmayan (default'lu) kolon eklendi.
--
-- GUVENLIK: duel_answers'in mevcut RLS durumu (hicbir client SELECT
-- policy'si yok, sadece service-role okuyabilir -- bkz. 037_duels_schema.sql
-- yorumu: "bir oyuncunun selected_option'i, round bitmeden once dogru
-- cevabi ele verebilir") bu iki yeni kolon icin de AYNEN gecerli ve
-- YETERLI -- bir oyuncunun canli harf tahminlerini rakibinin REST
-- uzerinden okuyup kopyalamasi da tamamen ayni riski tasir, o yuzden bu
-- tablo BILINCLI OLARAK 067_duel_realtime.sql'deki Realtime publication'a
-- da EKLENMEDI (duel_rounds ile ayni sinir).
ALTER TABLE public.duel_answers
  ADD COLUMN IF NOT EXISTS guessed_letters jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS wrong_guesses integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.duel_answers.guessed_letters IS
  'Sadece mode=wordle duellolarinda kullanilir: bu kullanicinin bu turda simdiye kadar denedigi harfler (kucuk harf, tekrarsiz). Quiz (multiple_choice) modunda hep bos dizi kalir.';
COMMENT ON COLUMN public.duel_answers.wrong_guesses IS
  'Sadece mode=wordle duellolarinda kullanilir: bu kullanicinin bu turdaki yanlis harf tahmini sayisi (games.py MAX_WRONG_GUESSES ile ayni ust sinir, duels.py icinde ayrica tanimli). Quiz modunda hep 0 kalir.';

-- duel_answers.selected_option zaten NULLABLE (text, NOT NULL degil) --
-- wordle modunda tur devam ederken NULL kalir, tur bitince (tamamlandi
-- veya hak tukendi) o turun kelimesi buraya yazilir (kayit/analiz icin,
-- quiz modundaki "kullanicinin isaretledigi sik" ile ayni rolde).
