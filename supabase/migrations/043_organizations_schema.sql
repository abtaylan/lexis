-- ============================================================
-- LEXIS — V2 Faz 3d: B2B / kurumsal ligler — şema temeli
-- Migration: 043_organizations_schema.sql
-- ============================================================
-- Plan notu (§6.3/3d): bu, düello ÖZELLİĞİNİN B2B versiyonu — §1.5'teki
-- "Kurumsal/Dershane B2B Paketi" (toplu lisans SATIŞI) ile KARIŞTIRILMAMALI,
-- ayrı ele alınıyor (ikisi ileride ticari olarak birleşebilir).
--
-- leagues.organization_id BİLİNÇLİ OLARAK nullable — null ise genel/
-- herkese açık lig, doluysa kurum-scope'lu özel lig. Backend (routes/
-- leagues.py) şu an hiçbir yerde organization_id doldurmuyor/kullanmıyor
-- — kurum-scope'lu lig oluşturma ayrı bir alt-adım (bu migration sadece
-- şemayı hazırlıyor, kolonu boş bırakmıyor diye burada ekleniyor).
-- ============================================================

CREATE TABLE public.organizations (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name        varchar(100) NOT NULL,
    plan        varchar(20) NOT NULL DEFAULT 'free',
    created_by  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.organization_members (
    org_id     uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role       varchar(10) NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
    joined_at  timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (org_id, user_id)
);

CREATE INDEX organization_members_user_idx ON public.organization_members(user_id);

ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- Kurum içeriği herkese açık DEĞİL — sadece o kurumun üyeleri kendi
-- kurumlarını/üye listesini görebilir (admin.py'deki RBAC desenine
-- benzer şekilde, gerçek yazma işlemleri zaten backend service-role
-- client'tan geçiyor, bu sadece okuma savunması).
CREATE POLICY "organizations_select_members" ON public.organizations
  FOR SELECT USING (
    id IN (SELECT org_id FROM public.organization_members WHERE user_id = auth.uid())
  );

CREATE POLICY "organization_members_select_same_org" ON public.organization_members
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM public.organization_members WHERE user_id = auth.uid())
  );

ALTER TABLE public.leagues
  ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;

CREATE INDEX leagues_organization_idx ON public.leagues(organization_id);
