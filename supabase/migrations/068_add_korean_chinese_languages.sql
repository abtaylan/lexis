-- 068_add_korean_chinese_languages.sql
--
-- V2 öncelik #7 (12 Eylül 2026) — "Yeni Diller (Korece + Çince)". Bu proje
-- öğrenilebilir/native dilleri TAMAMEN `languages` tablosundan sürüyor
-- (bkz. backend/app/api/routes/languages.py::list_languages — web/mobil
-- kayıt ekranındaki dil seçici buradan GERÇEK ZAMANLI çekiyor, ayrıca
-- HİÇBİR sabit kod listesi yok) — yani bu INSERT tek başına Korece ve
-- Çince'yi hem öğrenilebilir hedef dil (learning_lang) hem ana dil
-- (native_lang) olarak seçilebilir yapıyor, web/mobil tarafında EK KOD
-- DEĞİŞİKLİĞİ GEREKMİYOR.
--
-- 'ko' değeri zaten 004_multilang.sql'de örnek/gelecek-planı olarak
-- yorum satırında duruyordu (bkz. o migration'ın "gelecekte eklenebilecek
-- diller" notu) — aynı isim/bayrak buradan aynen kullanıldı.
--
-- BİLİNÇLİ SINIR (12 Eylül 2026 karar): general_word_pool (kelime tahmin
-- oyunu + düello ortak kelime havuzu) içeriği bu migration'la GELMİYOR —
-- seed_general_word_pool.py'ye 'ko'/'zh' TARGET_LANGS olarak eklendi
-- (aynı commit) ama bu script CANLI sözlük API'lerine (Cambridge/
-- dictionaryapi.dev/MyMemory) ihtiyaç duyuyor ve bu ortamdan (device_bash)
-- ağ kısıtı yüzünden çalıştırılamıyor — Behçet'in kendi makinesinden
-- `python seed_general_word_pool.py ko` / `... zh` ile çalıştırması
-- gerekiyor (git push/eas build ile AYNI, tekrar eden kısıt deseni).
-- İçerik doldurulana kadar bu iki dil için düello/kelime-tahmin oyunu
-- "yeterli kelime havuzu yok" hatası verir (kod zaten bunu net şekilde
-- ele alıyor, bkz. duels.py::start_duel) — kişisel kelime listesi
-- (words tablosu, sözlük API'siyle canlı arama) EKSİKSİZ çalışır, ona
-- bağlı değil. Sınav Hazırlık İçerik Motoru (grammar_topics/exam_questions)
-- zaten SADECE learning_lang='en' için var (İngilizce sınav hazırlığına
-- özel bir özellik) — bu iki yeni dille hiç ilgisi yok, etkilenmiyor.
INSERT INTO languages (code, name_native, name_en, flag_emoji, is_active) VALUES
    ('ko', '한국어', 'Korean', '🇰🇷', true),
    ('zh', '中文', 'Chinese', '🇨🇳', true)
ON CONFLICT (code) DO NOTHING;
