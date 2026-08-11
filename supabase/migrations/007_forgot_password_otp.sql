-- 007_forgot_password_otp.sql
-- "Şifremi unuttum" akışı için otp_codes.purpose kısıtını genişletir.
-- reset-password OTP kodları da artık aynı otp_codes tablosunda tutulabiliyor.

ALTER TABLE otp_codes DROP CONSTRAINT otp_codes_purpose_check;
ALTER TABLE otp_codes ADD CONSTRAINT otp_codes_purpose_check
  CHECK (purpose = ANY (ARRAY['login'::text, 'register'::text, 'reset_password'::text]));
  
