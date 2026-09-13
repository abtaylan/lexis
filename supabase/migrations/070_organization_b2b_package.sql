-- ============================================================
-- LEXIS — Öncelik #9: Kurumsal/Dershane B2B Satış Paketi — şema
-- Migration: 070_organization_b2b_package.sql
-- ============================================================
-- 13 Eylül 2026: madde 9 kapsamı netleşti (Behçet ile konuşuldu) —
-- ödeme/tahsilat MANUEL/fatura bazlı kalacak (web'de iyzico zaten
-- kapalı, GVK mük. 20/B istisnası sadece mobil IAP'i kapsıyor, B2B
-- geliri bu istisnanın dışında ayrı muhasebeleşiyor — bu yüzden bir
-- ödeme entegrasyonu EKLENMEDİ, bilinçli sınır). Bunun yerine mevcut
-- admin-only kurum oluşturma akışının (bkz. migration'sız 13 Eylül
-- routes/organizations.py değişikliği) üzerine "paket" kavramını
-- (plan adı + üye limiti + abonelik bitiş tarihi + admin'in kendi
-- takip notu) ekliyoruz — admin müşteriyle anlaşıp faturayı kendisi
-- kesiyor, buraya sadece sonucu giriyor.
--
-- `plan` kolonu zaten vardı (migration 043, varchar(20) default
-- 'free') ama hiçbir yerde okunmuyor/kullanılmıyordu — artık admin'in
-- serbest girdiği bir paket adı olarak kullanılıyor (ör. "Temel",
-- "Dershane Yıllık"), CHECK kısıtı YOK (esnek kalsın, farklı
-- müşterilerle farklı anlaşmalar olabilir).
-- ============================================================

ALTER TABLE public.organizations
  ADD COLUMN member_limit integer,
  ADD COLUMN expires_at   timestamptz,
  ADD COLUMN notes        text;

COMMENT ON COLUMN public.organizations.member_limit IS
  'Pakete dahil azami üye sayısı — NULL ise sınırsız. invite_member bu sınırı kontrol eder (bkz. routes/organizations.py).';
COMMENT ON COLUMN public.organizations.expires_at IS
  'Abonelik/anlaşma bitiş tarihi — NULL ise süresiz. Sadece yeni üye davetini engeller (bkz. invite_member); mevcut üyelerin erişimi kesilmez, admin panelde "süresi doldu" olarak işaretlenir.';
COMMENT ON COLUMN public.organizations.notes IS
  'Admin''in kendi takibi için serbest not (sözleşme/fatura no, iletişim kişisi/telefon vb.) — sadece admin panelde görünür, kurum üyelerine hiçbir uçtan gösterilmez.';
