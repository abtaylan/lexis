-- 125_lingo_bonus_rounds.sql
--
-- Faz 3j (27 Kasim 2026 Behcet'in kullanici duzeltmesi -- "3 defa 4 harf
-- olacak, sonra bonus kelimesi cikacak, ardindan 3 defa 5 harf olacak,
-- sonra yine bonus kelimesi cikacak, ardindan final bolumu 4-5-6-7 harfli
-- kelime bolumu cikacak"): gercek TRT1 "Lingo Turkiye" formatina daha
-- sadik bir uzunluk/bonus dizisi -- eski basit [4,4,5,5,6,6] dizisinin
-- yerini games.py/duels.py'de (length, is_bonus) ikilisinden olusan 12
-- adimlik yeni LINGO_LENGTH_SEQUENCE aliyor:
--   3x4 harf -> bonus(4 harf) -> 3x5 harf -> bonus(5 harf) ->
--   final: 4,5,6,7 harf (sirayla)
--
-- Tek-oyunculu (solo) modda bonus bilgisi game_sessions.state JSONB'sinde
-- ("lingo_is_bonus") tutuluyor -- yeni kolon GEREKMIYOR (123_lingo_game_
-- mode.sql'de zaten JSONB state kullaniliyordu).
--
-- Duello modunda ise hangi round'un "bonus" oldugu, round URETILIRKEN
-- (duels.py::_generate_lingo_rounds) SABITLENMELI ve SONRADAN HER
-- SORGUDA AYNI KALMALI -- length'ten (len(correct_option)) geri turetilemez
-- cunku ayni uzunluk (orn. 4) hem normal hem bonus adimda tekrar ediyor.
-- Bu yuzden duel_rounds'a KALICI bir boolean kolon ekleniyor (076_duel_
-- wordle_mode.sql / 124_duel_lingo_mode.sql'deki "round uretiminde
-- sabitlenen deger, sorguda oldugu gibi okunur" ilkesiyle AYNI).
ALTER TABLE public.duel_rounds
  ADD COLUMN IF NOT EXISTS lingo_is_bonus boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.duel_rounds.lingo_is_bonus IS
  'Sadece mode=lingo duellolarinda kullanilir: bu round _generate_lingo_rounds tarafindan yeni 12-adimli LINGO_LENGTH_SEQUENCE''in bir "bonus" basamaginda uretildiyse true. Round uretilirken SABITLENIR (duel_rounds.length''ten -- yani kelimenin len()''inden -- GERI TURETILEMEZ, cunku ayni uzunluk hem normal hem bonus basamakta tekrar eder). Bonus round''u tamamlayan katilimcinin puani (LINGO_COMPLETE_POINTS + varsa LINGO_FIRST_FINISH_BONUS) 2 ile carpilir -- bkz. duels.py submit_round_guess_word / _submit_bot_lingo_progress. Diger modlarda hep false kalir.';
