-- 124_duel_lingo_mode.sql
--
-- Faz 3i (26 Kasim 2026 kullanici istegi -- "sadece sisteme karsi degil,
-- sistemdeki kullanicilarla da oynanacak"): mode='lingo' icin duello
-- (gercek kullanicilar arasinda) altyapisi. 123_lingo_game_mode.sql'de
-- "SONRAKI FAZ" olarak dokumante edilen plan birebir bu -- o migration'da
-- bilincli olarak ertelenmisti, bu kullanici mesaji erteleme gerekcesini
-- (ayri bir oturum) gecersiz kildi.
--
-- duels.mode zaten public.game_mode enum'unu kullaniyor (037_duels_schema.
-- sql) ve bu enum'da 'lingo' ZATEN VAR (123_lingo_game_mode.sql'de
-- eklendi) -- yani burada enum/tip degisikligi GEREKMIYOR, 076_duel_
-- wordle_mode.sql'in 'wordle' icin yaptigi tespitle AYNI durum.
--
-- Eksik olan tek sema parcasi, 076'daki ile BIREBIR AYNI gerekceyle:
-- cok-oyunculu bir lingo duellosunda her katilimcinin AYNI kelimede
-- BAGIMSIZ tam-kelime tahmin ilerlemesini (hangi kelimeleri denedi +
-- geri bildirimleri, kalan "kasa" puani) tutacak bir yer. duel_rounds
-- tek bir satir (tum katilimcilar icin ortak kelime), duel_answers ise
-- (duel_round_id, user_id) basina TEK satir (bkz. 037_duels_schema.sql
-- UNIQUE constraint) -- wordle'daki guessed_letters/wrong_guesses
-- deseniyle AYNI fikir, ama bu sefer "tahmin edilen harfler listesi"
-- yerine "tahmin edilen TAM KELIMELER + her birinin pozisyon bazli geri
-- bildirimi" (games.py::_lingo_feedback ile AYNI format) saklaniyor.
--
-- GUVENLIK: duel_answers'in mevcut RLS durumu (hicbir client SELECT
-- policy'si yok, sadece service-role okuyabilir) bu iki yeni kolon icin
-- de AYNEN gecerli ve YETERLI -- bir oyuncunun canli kelime tahminlerini
-- rakibinin REST uzerinden okuyup kopyalamasi, wordle'daki harf tahminini
-- kopyalamasiyla AYNI riski tasir. 076'daki ile AYNI gerekceyle bu tablo
-- 067_duel_realtime.sql'deki Realtime publication'a da EKLENMEDI.
ALTER TABLE public.duel_answers
  ADD COLUMN IF NOT EXISTS lingo_guesses jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS lingo_pot integer NOT NULL DEFAULT 10;

COMMENT ON COLUMN public.duel_answers.lingo_guesses IS
  'Sadece mode=lingo duellolarinda kullanilir: bu kullanicinin bu turda simdiye kadar gonderdigi tam-kelime tahminlerinin tam gecmisi, [{"word": "...", "feedback": ["correct"|"present"|"absent", ...]}, ...] seklinde (games.py::_lingo_feedback / duels.py::_lingo_feedback ile AYNI format). Diger modlarda hep bos dizi kalir.';
COMMENT ON COLUMN public.duel_answers.lingo_pot IS
  'Sadece mode=lingo duellolarinda kullanilir: bu kullanicinin bu turdaki kalan "kasa" puani (duels.py LINGO_START_POT=10 ile baslar, her tahminde 1 azalir -- games.py tek-oyunculu Lingo moduyla AYNI mekanik). Diger modlarda varsayilan degerinde (10) kalir ama kullanilmaz.';

-- duel_answers.selected_option zaten NULLABLE -- lingo modunda tur devam
-- ederken NULL kalir, tur bitince (kelime bulundu veya hak/kasa tukendi)
-- o turun kelimesi buraya yazilir (kayit/analiz icin, wordle moduyla AYNI
-- rolde).
