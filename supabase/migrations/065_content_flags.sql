-- 065_content_flags.sql
--
-- İstatistik & Raporlama V2 öncelik #3, Faz 3 madde C — "Veri doğruluğu/
-- güvenilirlik paneli". Faz 1/2'de zaten var olan içerik doğruluk analitiği
-- (exam_question_stats / system_word_stats / user_word_stats, bkz. migration
-- 026 + 062, admin_platform.py /content-accuracy/*) sadece "doğruluk oranına
-- göre sırala" sağlıyordu — düşük doğruluk hem "öğrenciler için gerçekten
-- zor" hem de "içerik muhtemelen HATALI (yanlış cevap anahtarı, hatalı
-- çeviri)" anlamına gelebilir, ikisini ayırt etmiyordu.
--
-- Bu migration, otomatik ANOMALİ TESPİTİ + admin inceleme iş akışı için
-- content_flags tablosunu ekliyor:
--   - Sorular (exam_questions): option_counts (migration 026) üzerinden,
--     "correct_option"tan daha çok seçilen bir yanlış şık varsa
--     reason='dominant_wrong_option' (cevap anahtarı hatalı olabilir sinyali,
--     sadece "zor soru"dan çok daha güçlü bir kanıt). Yoksa ama doğruluk çok
--     düşükse reason='low_accuracy'.
--   - Kelimeler (system_word_stats/user_word_stats): option_counts verisi
--     yok (game_attempts sadece is_correct tutuyor), bu yüzden tek sinyal
--     çok düşük doğruluk + yeterli deneme sayısı → reason='low_accuracy'.
--
-- Tarama backend/app/services/content_flag_service.py::scan_content_flags()
-- ile MANUEL tetikleniyor (admin panelde "Tara" butonu) — periyodik/cron
-- otomasyonu bilinçli olarak kapsam dışı bırakıldı, o Faz 3 madde E'nin işi
-- ("zaman bazlı periyodik snapshot+cron").
--
-- Diğer admin-only tablolarla aynı desen (bkz. 013_admin_platform.sql):
-- sadece backend'in service-role client'ı (supabase_admin, RLS bypass)
-- yazıyor; normal kullanıcı/anon erişimi kapalı, admin/admin_readonly
-- sadece SELECT yapabiliyor.

CREATE TABLE public.content_flags (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_type    TEXT NOT NULL CHECK (content_type IN ('exam_question', 'system_word', 'user_word')),
    content_id      UUID NOT NULL,
    reason          TEXT NOT NULL CHECK (reason IN ('dominant_wrong_option', 'low_accuracy')),
    metric_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
    status          TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'fixed', 'dismissed')),
    detected_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_at     TIMESTAMPTZ,
    reviewed_by     UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    admin_note      TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (content_type, content_id)
);

COMMENT ON TABLE public.content_flags IS
    'İçerik doğruluğu/güvenilirliği için otomatik tespit edilen anomaliler (olası hatalı soru/kelime). content_type+content_id başına tek satır — tarama tekrar çalıştığında open kayıtların metric_snapshot''ı güncellenir, fixed/dismissed kayıtlara dokunulmaz (admin kararına saygı).';
COMMENT ON COLUMN public.content_flags.reason IS
    'dominant_wrong_option: option_counts''ta correct_option''tan daha çok seçilen bir yanlış şık var (cevap anahtarı hatalı olabilir). low_accuracy: yeterli deneme sayısına rağmen doğruluk oranı eşiğin çok altında.';
COMMENT ON COLUMN public.content_flags.metric_snapshot IS
    'Tespit anındaki ölçümler (total_attempts, accuracy_ratio, option_counts vb.) — admin panelde gösterim için, gerçek zamanlı view''lardan tekrar sorgulamaya gerek kalmasın diye anlık görüntü.';

CREATE INDEX idx_content_flags_status ON public.content_flags(status);
CREATE INDEX idx_content_flags_content_type ON public.content_flags(content_type);
CREATE INDEX idx_content_flags_detected_at ON public.content_flags(detected_at DESC);

CREATE TRIGGER content_flags_set_updated_at
    BEFORE UPDATE ON public.content_flags
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE public.content_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "content_flags_admin_select" ON public.content_flags
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('admin', 'admin_readonly')
        )
    );
