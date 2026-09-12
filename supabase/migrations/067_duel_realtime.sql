-- 067_duel_realtime.sql
--
-- V2 öncelik #5 (12 Eylül 2026) — "Gerçek Zamanlı Düello": şu ana kadar
-- web/mobil düello ekranı sadece 2 saniyede bir REST polling ile
-- (GET /duels/{id}) güncelleniyordu (bkz. web/src/app/(app)/duels/[id]/
-- page.tsx — tick()). Bu migration, Supabase Realtime'ı devreye sokarak
-- bir state değişikliği olduğunda istemcilerin ANINDA (polling
-- aralığını beklemeden) tetiklenmesini sağlıyor.
--
-- GÜVENLİK — BİLİNÇLİ SINIR: sadece `duels` ve `duel_participants`
-- tabloları publication'a eklendi. `duel_rounds` (correct_option sütununu
-- düz metin tutuyor) ve `duel_answers` KESİNLİKLE eklenmedi — bkz.
-- backend/app/schemas/duels.py::DuelStatusResponse/DuelRoundPublic
-- docstring'leri: "doğru cevap istemciye asla round bitmeden gönderilmez"
-- kuralı zaten bu iki tablonun RLS'ini client'a kapalı tutuyor (bkz.
-- migration 037); Realtime bir publication seviyesinde çalışıp RLS'i
-- (yayıncı rolü için) UYGULAMAZ türünden bir mekanizma değil, ama satır
-- düzeyinde değil TABLO düzeyinde açılıyor — yani bu iki tabloyu asla
-- publication'a eklememek, correct_option'ın yanlışlıkla toplu olarak
-- sızmasını engellemenin tek güvenli yolu.
--
-- `duels` ve `duel_participants` zaten dünyaya açık "SELECT USING (true)"
-- RLS politikalarına sahip (bkz. migration 037/050) — yani bu migration
-- HİÇBİR RLS değişikliği yapmıyor, sadece zaten anon key ile okunabilen
-- iki tabloyu Realtime'a ekliyor. Frontend tasarımı: Realtime payload'ı
-- doğrudan veri kaynağı olarak GÜVENİLMİYOR — herhangi bir INSERT/UPDATE
-- event'i sadece mevcut, yetkilendirmeyi zaten REST tarafında yapan
-- GET /duels/{id} çağrısını (tick()) hemen tetiklemek için bir sinyal
-- olarak kullanılıyor ("wake up and refetch" deseni).
--
-- İdempotent: tablo publication'da zaten varsa hata vermeden atlar
-- (migration'ın yanlışlıkla iki kez çalıştırılması durumuna karşı).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'duels'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.duels;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'duel_participants'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.duel_participants;
  END IF;
END $$;
