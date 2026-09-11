-- ============================================================
-- LEXIS — Rozetler ve Ödüller: katalog taksonomisi
-- Migration: 063_badges_catalog_taxonomy.sql
-- ============================================================
-- V2 öncelik #2 ("Rozetler ve Ödüller Sayfası"): "Rozet ≠ Ödül ayrımı yapan
-- yeni bir taksonomi" isteniyordu. Bu migration badges tablosuna üç yeni
-- alan ekliyor:
--   - kind: 'achievement' (rozet — geçmişte olan bir başarıyı anar) veya
--     'title' (ödül — kazanınca profilde/liderlik tablosunda sergilenebilecek
--     bir unvan). Şu an TÜM mevcut 32 satır gerçek anlamda birer başarı
--     rozeti olduğu için hepsi 'achievement' — 'title' değeri şimdilik hiç
--     kullanılmıyor ama şema ve GET /stats/badges/catalog ucu bunu baştan
--     destekliyor: ileride kozmetik/unvan türünde bir "ödül" eklendiğinde
--     sadece kind='title' ile INSERT etmek yeterli, kod tarafında hiçbir
--     değişiklik gerekmez (kullanıcının notu: "rozetler sayfası bitince
--     yeni rozetleri buraya zaten yerleştirirsin").
--   - category: katalog sayfasında gruplama için (streak/duel/league/
--     leaderboard/quest/quest_world). Yeni bir rozet eklerken bu alan da
--     doldurulmalı ki doğru bölümde görünsün.
--   - requirement_tr / requirement_en: rozet HENÜZ kazanılmamışken
--     kullanıcıya "nasıl kazanılır" bilgisini gösteren, şimdiki zamanda
--     yazılmış kısa metin (mevcut description_* alanları geçmiş zamanda
--     kutlama metni — "Kazandın!" — bu yüzden ayrı bir alan gerekti).
--     Diğer 8 dil için description_* deseniyle aynı fallback (|| requirement_en)
--     frontend'de zaten kullanılıyor, o yüzden şimdilik sadece tr/en dolduruldu.
--
-- Canlıda (Supabase mrxeuxscyztpiuagsumh) uygulandı ve doğrulandı — bu dosya
-- repo+canlı DB senkronu için yazıldı.
-- ============================================================

ALTER TABLE public.badges
  ADD COLUMN IF NOT EXISTS kind varchar(20) NOT NULL DEFAULT 'achievement'
    CHECK (kind IN ('achievement', 'title')),
  ADD COLUMN IF NOT EXISTS category varchar(30) NOT NULL DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS requirement_tr text,
  ADD COLUMN IF NOT EXISTS requirement_en text;

COMMENT ON COLUMN public.badges.kind IS
  'achievement = geçmiş bir başarıyı anan rozet; title = sergilenebilir ödül/unvan (şimdilik hiç yok, ileride eklenecek)';
COMMENT ON COLUMN public.badges.category IS
  'Katalog sayfasında gruplama anahtarı: streak, duel, league, leaderboard, quest, quest_world';

UPDATE public.badges SET category = 'streak', requirement_tr = '7 gün üst üste çalış', requirement_en = 'Study 7 days in a row' WHERE code = 'streak_7';
UPDATE public.badges SET category = 'streak', requirement_tr = '30 gün üst üste çalış', requirement_en = 'Study 30 days in a row' WHERE code = 'streak_30';
UPDATE public.badges SET category = 'streak', requirement_tr = '100 gün üst üste çalış', requirement_en = 'Study 100 days in a row' WHERE code = 'streak_100';
UPDATE public.badges SET category = 'streak', requirement_tr = '365 gün üst üste çalış', requirement_en = 'Study 365 days in a row' WHERE code = 'streak_365';

UPDATE public.badges SET category = 'leaderboard', requirement_tr = 'Haftalık sıralamada 1. ol', requirement_en = 'Finish #1 on the weekly leaderboard' WHERE code = 'weekly_top1';
UPDATE public.badges SET category = 'leaderboard', requirement_tr = 'Haftalık sıralamada ilk 3''e gir', requirement_en = 'Finish in the weekly top 3' WHERE code = 'weekly_top3';
UPDATE public.badges SET category = 'leaderboard', requirement_tr = 'Haftalık sıralamada ilk 10''a gir', requirement_en = 'Finish in the weekly top 10' WHERE code = 'weekly_top10';
UPDATE public.badges SET category = 'leaderboard', requirement_tr = 'Aylık sıralamada 1. ol', requirement_en = 'Finish #1 on the monthly leaderboard' WHERE code = 'monthly_top1';
UPDATE public.badges SET category = 'leaderboard', requirement_tr = 'Aylık sıralamada ilk 3''e gir', requirement_en = 'Finish in the monthly top 3' WHERE code = 'monthly_top3';
UPDATE public.badges SET category = 'leaderboard', requirement_tr = 'Aylık sıralamada ilk 10''a gir', requirement_en = 'Finish in the monthly top 10' WHERE code = 'monthly_top10';

UPDATE public.badges SET category = 'league', requirement_tr = 'Bir lige katıl', requirement_en = 'Join a league' WHERE code = 'league_joined';
UPDATE public.badges SET category = 'league', requirement_tr = 'Gümüş lige terfi et', requirement_en = 'Get promoted to the Silver League' WHERE code = 'league_silver';
UPDATE public.badges SET category = 'league', requirement_tr = 'Altın lige terfi et', requirement_en = 'Get promoted to the Gold League' WHERE code = 'league_gold';
UPDATE public.badges SET category = 'league', requirement_tr = 'Platin lige terfi et', requirement_en = 'Get promoted to the Platinum League' WHERE code = 'league_platinum';
UPDATE public.badges SET category = 'league', requirement_tr = 'Elmas lige terfi et', requirement_en = 'Get promoted to the Diamond League' WHERE code = 'league_diamond';
UPDATE public.badges SET category = 'league', requirement_tr = 'Usta lige terfi et — en üst kademe', requirement_en = 'Get promoted to the Master League — the top tier' WHERE code = 'league_master';

UPDATE public.badges SET category = 'duel', requirement_tr = 'İlk düellonu kazan', requirement_en = 'Win your first duel' WHERE code = 'first_duel_win';
UPDATE public.badges SET category = 'duel', requirement_tr = '10 düello kazan', requirement_en = 'Win 10 duels' WHERE code = 'duel_win_10';
UPDATE public.badges SET category = 'duel', requirement_tr = '50 düello kazan', requirement_en = 'Win 50 duels' WHERE code = 'duel_win_50';
UPDATE public.badges SET category = 'duel', requirement_tr = '25 düelloya katıl', requirement_en = 'Take part in 25 duels' WHERE code = 'duel_veteran_25';
UPDATE public.badges SET category = 'duel', requirement_tr = 'Bir düelloyu tüm sorulara doğru cevap vererek bitir', requirement_en = 'Finish a duel with a perfect score' WHERE code = 'perfect_duel';

UPDATE public.badges SET category = 'quest', requirement_tr = 'Görev haritasında ilk görevini tamamla', requirement_en = 'Complete your first quest' WHERE code = 'first_quest_complete';
UPDATE public.badges SET category = 'quest', requirement_tr = 'Görev haritasının tamamını bitir', requirement_en = 'Complete the entire quest map' WHERE code = 'quest_map_complete';

UPDATE public.badges SET category = 'quest_world', requirement_tr = 'Kelime Bahçesi dünyasına ilk adımını at', requirement_en = 'Take your first step into the Vocabulary Garden world' WHERE code = 'vocab_sprout';
UPDATE public.badges SET category = 'quest_world', requirement_tr = 'Kelime Bahçesi dünyasını tamamla', requirement_en = 'Complete the Vocabulary Garden world' WHERE code = 'vocab_garden_complete';
UPDATE public.badges SET category = 'quest_world', requirement_tr = 'Gramer Ustalığı dünyasına ilk adımını at', requirement_en = 'Take your first step into the Grammar Mastery world' WHERE code = 'grammar_apprentice';
UPDATE public.badges SET category = 'quest_world', requirement_tr = 'Gramer Ustalığı dünyasında ilerle', requirement_en = 'Make progress in the Grammar Mastery world' WHERE code = 'grammar_scholar';
UPDATE public.badges SET category = 'quest_world', requirement_tr = 'Gramer Ustalığı dünyasını tamamla', requirement_en = 'Complete the Grammar Mastery world' WHERE code = 'grammar_master';
UPDATE public.badges SET category = 'quest_world', requirement_tr = 'Sınav Maratonu dünyasında ilerle', requirement_en = 'Make progress in the Exam Marathon world' WHERE code = 'exam_multitasker';
UPDATE public.badges SET category = 'quest_world', requirement_tr = 'Sınav Maratonu dünyasını tamamla', requirement_en = 'Complete the Exam Marathon world' WHERE code = 'exam_marathon_complete';
UPDATE public.badges SET category = 'quest_world', requirement_tr = 'Efsane Diyarı dünyasına ilk adımını at', requirement_en = 'Take your first step into the Legendary Realm world' WHERE code = 'legend_apprentice';
UPDATE public.badges SET category = 'quest_world', requirement_tr = 'Efsane Diyarı dünyasını tamamla', requirement_en = 'Complete the Legendary Realm world' WHERE code = 'legend_realm_complete';
