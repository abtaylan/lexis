-- 094_backfill_word_type_from_pool.sql
--
-- Kullanici bildirimi (3 Kasim 2026): "Istatistik" sayfasindaki "Kelime
-- Turune Gore Ogrenme Orani" grafigi neredeyse bos/anlamsiz gorunuyordu.
-- Kok neden: app/api/routes/games.py::_sync_word_progress, genel kelime
-- havuzundan (general_word_pool) kullaniciya kelime eklerken
-- part_of_speech sutununu SECMIYOR ve words.word_type'a hic yazmiyordu --
-- bu da havuzdan (oyun/duello icinden) eklenen hemen hemen her kelimenin
-- word_type=NULL kalmasina, dolayisiyla stats.py::get_analytics
-- tarafindan tek bir "Diger" kovasina toplanmasina yol aciyordu (bkz.
-- app/api/routes/games.py bu migration ile ayni oturumda duzeltildi).
--
-- Bu migration GERIYE DONUK veriyi onarir: word_type'i NULL olan mevcut
-- "words" satirlarini, ayni kelime+source_lang icin general_word_pool'da
-- part_of_speech dolu bir eslesme varsa o deger ile doldurur. Sadece
-- EKLEME/GUNCELLEME yapar (satir silme/veri kaybi yok), eslesme
-- bulunamayan satirlar (havuzun kendisinde de part_of_speech bos olanlar
-- dahil) NULL/"Diger" olarak kalmaya devam eder -- bu guvenli, idempotent
-- bir veri kalitesi duzeltmesidir.

update public.words w
set word_type = gwp.part_of_speech
from public.general_word_pool gwp
where w.word_type is null
  and gwp.part_of_speech is not null
  and lower(w.word) = lower(gwp.word)
  and w.source_lang = gwp.source_lang;
