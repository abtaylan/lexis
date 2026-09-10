-- ============================================================
-- LEXIS — league_tiers RLS'i aç
-- Migration: 058_league_tiers_rls.sql
-- ============================================================
-- Supabase advisory: public.league_tiers tablosunda RLS kapalıydı.
-- Tablo herkese açık okunması gereken statik veridir (kademe slug/isim
-- eşlemesi, hassas veri yok — leagues.leagues_select_all ile aynı
-- gerekçe), bu yüzden düşük riskliydi ama formalite olarak kapatılması
-- gerekiyordu (bkz. LEXIS_DEVIR_2026-09-10.md §2, §4).
-- ============================================================

ALTER TABLE public.league_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "league_tiers_select_all" ON public.league_tiers
  FOR SELECT USING (true);
