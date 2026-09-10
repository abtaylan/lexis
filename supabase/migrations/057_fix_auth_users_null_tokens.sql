-- supabase/migrations/057_fix_auth_users_null_tokens.sql
--
-- Admin panelde "Kullanıcı Listesi" E-posta sütununun boş görünmesi
-- düzeltmesi (10 Eylül 2026) SONRASI ortaya çıkan YENİ hata: backend
-- artık supabase_admin.auth.admin.list_users() çağrısını TÜM sayfaları
-- gezerek (per_page=200, bkz. backend/app/api/routes/admin.py
-- _list_all_auth_users) yapıyor. Bu, GoTrue admin API'sinde şu hatayla
-- 500 dönmesine sebep oldu (Supabase edge/auth logs'tan doğrulandı):
--   "unable to fetch records: sql: Scan error on column index 3, name
--   \"confirmation_token\": converting NULL to string is unsupported"
--
-- KÖK NEDEN: Bu projede bot hesapları (Demir/Bronz/... kademe ligi
-- doldurmak için, bkz. migration 046/052-055) `INSERT INTO auth.users
-- (...)` ile DOĞRUDAN SQL üzerinden oluşturuldu. Bu INSERT'ler
-- confirmation_token/recovery_token/email_change_token_new/email_change
-- gibi metin sütunlarını hiç belirtmedi -- Postgres bunları NULL
-- bıraktı. Ama GoTrue'nun kendi Go kodu bu sütunları HER ZAMAN boş
-- string ('') bekliyor (normal e-posta ile kayıt akışında GoTrue bunu
-- kendisi '' olarak yazıyor) -- NULL gelince sql.Scan bir string'e
-- çeviremeyip patlıyor. Sonuç: /admin/users (TÜM kullanıcıları listeleme)
-- ucu, listede NULL token'lı TEK bir satır bile olsa TÜM isteği 500'e
-- düşürüyor -- bu yüzden E-posta sütunu önceki (sayfalama olmayan,
-- ilk ~50 kullanıcıyı -- çoğunlukla gerçek/normal kayıtlı kullanıcıları
-- -- döndüren) kodda "bazen" çalışıyormuş gibi görünüyordu, artık HİÇ
-- çalışmıyor çünkü artık TÜM 149 kullanıcı (119'u NULL token'lı bot
-- hesabı) tek seferde isteniyor.
--
-- DÜZELTME: Bu 119 satırdaki NULL token sütunlarını GoTrue'nun kendi
-- varsayılanıyla (boş string) eşitliyoruz. Bu, kimlik doğrulama
-- davranışını DEĞİŞTİRMEZ -- bu sütunlar sadece e-posta onayı/şifre
-- sıfırlama/e-posta değişikliği gibi TEK SEFERLİK akışlarda kullanılan
-- geçici token'lar, boş string == "aktif bir token yok" (GoTrue'nun
-- normal kayıt akışında zaten yazdığı değer). Ayrıca ileride benzer bir
-- bot-seed migration'ı yazılırsa AYNI hatayı önlemek için
-- confirmation_token/recovery_token/email_change_token_new/email_change
-- sütunlarının INSERT'te ACIKCA '' olarak verilmesi gerektiği not
-- düşülüyor (bkz. bu dosyanın başlığı).
BEGIN;

UPDATE auth.users SET confirmation_token = '' WHERE confirmation_token IS NULL;
UPDATE auth.users SET recovery_token = '' WHERE recovery_token IS NULL;
UPDATE auth.users SET email_change_token_new = '' WHERE email_change_token_new IS NULL;
UPDATE auth.users SET email_change_token_current = '' WHERE email_change_token_current IS NULL;
UPDATE auth.users SET email_change = '' WHERE email_change IS NULL;
UPDATE auth.users SET phone_change = '' WHERE phone_change IS NULL;
UPDATE auth.users SET phone_change_token = '' WHERE phone_change_token IS NULL;
UPDATE auth.users SET reauthentication_token = '' WHERE reauthentication_token IS NULL;

COMMIT;
