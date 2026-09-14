-- 071_exam_question_suggestion_xp_and_ai_verification.sql
--
-- V2 backlog #10 (12 Eylül 2026 kullanıcı talebi, 14 Eylül'de uygulandı) —
-- "Kullanıcı Soru Önerisi + XP + AI Doğrulama". Temel öneri/moderasyon
-- mekanizması zaten Faz 2'de vardı (commit be46ad3 — POST /questions/suggest
-- + admin pending/approve/reject, bkz. 026_exam_prep_stats_and_content.sql).
-- Bu backlog maddesinin gerçekten eksik olan iki parçası: (1) katkı XP'si,
-- (2) admin'e yardımcı AI ön-kontrolü.
--
-- Kapsam (Behçet ile netleşti, 14 Eylül): XP hem öneri gönderilince (küçük,
-- anlık) hem admin onaylayınca (ek, daha büyük) veriliyor — sadece
-- source_type='user' onaylarında (AI sorularında ödüllenecek bir kullanıcı
-- yok). AI doğrulaması ASLA otomatik onaylamıyor/reddetmiyor — sadece
-- admin'in GET /admin/questions/pending kuyruğunda gördüğü bir "muhtemelen
-- doğru/yanlış/belirsiz" etiketi + kısa not ekliyor, son karar her zaman
-- admin'de kalıyor (bkz. backend/app/services/exam_question_generator.py
-- ::verify_question).

ALTER TABLE public.exam_questions
  ADD COLUMN IF NOT EXISTS ai_verdict text,
  ADD COLUMN IF NOT EXISTS ai_verdict_note text,
  ADD COLUMN IF NOT EXISTS ai_verified_at timestamptz;

ALTER TABLE public.exam_questions
  ADD CONSTRAINT exam_questions_ai_verdict_check
  CHECK (ai_verdict IS NULL OR ai_verdict IN ('likely_correct', 'likely_incorrect', 'uncertain'));

COMMENT ON COLUMN public.exam_questions.ai_verdict IS
  'source_type=user önerileri gönderilirken otomatik AI ön-kontrolü sonucu — admin kuyruğunda gösterilir, ASLA otomatik onay/red tetiklemez.';
COMMENT ON COLUMN public.exam_questions.ai_verdict_note IS
  'AI''nin verdict''ine kısa (Türkçe) gerekçesi, admin''e yönelik.';
COMMENT ON COLUMN public.exam_questions.ai_verified_at IS
  'AI ön-kontrolünün çalıştığı zaman (soru gönderilirken, senkron).';

-- XP: award_xp() üzerinden (bkz. backend/app/services/xp_service.py) —
-- 069_referral_program.sql'deki gibi ham SQL ile seviye/unvan mantığı
-- TEKRARLANMIYOR.
ALTER TYPE public.xp_source_type ADD VALUE IF NOT EXISTS 'exam_question_suggested';
ALTER TYPE public.xp_source_type ADD VALUE IF NOT EXISTS 'exam_question_approved';
