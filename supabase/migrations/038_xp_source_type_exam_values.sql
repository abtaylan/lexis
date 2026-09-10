-- Faz 3f öncesi tespit edilen canlı hata düzeltmesi:
-- backend/app/api/routes/exams.py, award_xp() çağrılarında
-- source_type="exam_question" (satır ~327) ve source_type="exam_mock_complete"
-- (satır ~395) kullanıyor; xp_service.py::XPSourceType Literal'ında ve
-- XP_AMOUNTS sözlüğünde bu iki değer zaten TANIMLI, ANCAK Postgres
-- xp_source_type ENUM'unda hiç eklenmemişti (006/010 migration'larında yok).
-- Sonuç: xp_events.source_type bu enum'a bağlı olduğu için, her doğru sınav
-- cevabı ve her tamamlanan deneme sınavında award_xp() içindeki
-- xp_events INSERT'i "invalid input value for enum xp_source_type" hatasıyla
-- patlıyor ve kullanıcıya 500/503 dönüyor. Bu, 19 Ağustos 2026'da yaşanan
-- ve giderilen AYNI hata sınıfının tekrarı (Python tarafı güncellenmiş,
-- DB enum'u unutulmuş).
ALTER TYPE public.xp_source_type ADD VALUE IF NOT EXISTS 'exam_question';
ALTER TYPE public.xp_source_type ADD VALUE IF NOT EXISTS 'exam_mock_complete';
