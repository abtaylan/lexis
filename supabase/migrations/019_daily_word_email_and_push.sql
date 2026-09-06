-- 019_daily_word_email_and_push.sql
-- Kullanıcı isteği (6 Eylül 2026): (1) her gün üyelerin kayıtlı e-postasına,
-- günün kelimesini (İngilizce/Türkçe anlam, 2 örnek cümle + çevirisi, YDS/
-- YÖKDİL/TOEFL tarzı dilbilgisi analizi) içeren bir hatırlatma e-postası;
-- (2) mobil uygulamada günde 2 kez (sabah/akşam) kısa, teşvik edici push
-- bildirimi.
--
-- E-posta içeriği daily_word_content tablosunda önceden hazırlanmış (uydurma
-- değil, elle yazılmış ve gramer açısından gözden geçirilmiş) kayıtlar olarak
-- tutulur — job her çalıştığında en son gönderilmemiş (ya da en eski
-- gönderilmiş) kaydı seçip last_sent_at'i günceller, böylece kelimeler
-- sırayla döner ve havuz bitene kadar tekrar etmez.
--
-- Her iki özellik de kullanıcı bazında açık/kapalı olabilsin diye profiles'a
-- iki yeni sütun ekleniyor (varsayılan: açık — mevcut kullanıcı deneyimini
-- bozmaz, dilerse kapatabilir). E-posta için ayrıca girişsiz "tek tık"
-- abonelikten çıkma linki eklendi (bkz. app/core/tokens.py +
-- notifications.py::unsubscribe) — profil ayarlarında henüz görsel bir
-- toggle yok, bu link mailin içindeki tek kapatma yolu (bilinçli, kapsam
-- dışı bırakıldı: web/mobil ayarlar ekranına toggle eklemek sonraki adım).

alter table public.profiles
  add column if not exists email_daily_word_enabled boolean not null default true,
  add column if not exists push_daily_reminder_enabled boolean not null default true;

create table if not exists public.daily_word_content (
  id uuid primary key default gen_random_uuid(),
  word varchar(100) not null,
  meaning_en text not null,
  meaning_tr text not null,
  example_1_en text not null,
  example_1_tr text not null,
  example_2_en text not null,
  example_2_tr text not null,
  grammar_note_tr text not null,
  level varchar(50) not null default 'YDS / YÖKDİL / TOEFL',
  is_active boolean not null default true,
  last_sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists daily_word_content_last_sent_idx on public.daily_word_content(last_sent_at);

-- Bu tabloya sadece backend (service-role) yazıyor/okuyor, kullanıcı
-- tarafından doğrudan erişilmiyor (game/word-pool tablolarının aksine) — bu
-- yüzden RLS açık ama hiçbir public policy yok (varsayılan: herkese kapalı,
-- service-role RLS'i zaten bypass eder).
alter table public.daily_word_content enable row level security;
