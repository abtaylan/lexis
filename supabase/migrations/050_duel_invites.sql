-- ============================================================
-- LEXIS — Arkadaşa düello daveti gönderme
-- Migration: 050_duel_invites.sql
-- ============================================================
-- Kullanıcı isteği (10 Eylül 2026): "düello isteği yollama ekranını
-- göremedim" -> "Evet, arkadaşa davet gönderme ekle". Mevcut
-- public.challenges (016) 1v1 ASENKRON bir modeldir (her taraf kendi
-- zamanında oynar, skorlar sonradan karşılaştırılır) — CANLI, eş zamanlı
-- duel odası (037) modeline uymuyor, bu yüzden challenges'a
-- DOKUNULMADI, challenge_service.py'deki AYNI ilkeyle (sadece arkadaşlar
-- davet edebilir, notify_user ile bildirim) YENİ, küçük bir
-- duel_invites tablosu eklendi.
--
-- Akış: A, arkadaşı B'yi bir düello odasına davet eder
-- (POST /duels/invite) -> arka planda ÖZEL (is_private=true) bir
-- duels odası açılır (normal /duels lobi listesinde GÖRÜNMEZ, bkz.
-- duels.py list_duels güncellemesi) ve davet 'pending' olarak
-- duel_invites'a yazılır. B kabul ederse (accept) normal join_duel
-- mantığıyla odaya eklenir, reddederse/iptal edilirse oda kimse
-- katılmadan 'waiting' durumda kalır (temizlik bilinçli olarak bu
-- fazda YOK — mevcut expire_premium.py/distribute_leaderboard_rewards.py
-- ile aynı desen: gerekirse ayrı bir VPS cron script'i olarak eklenir).
-- ============================================================

ALTER TABLE public.duels ADD COLUMN is_private boolean NOT NULL DEFAULT false;

CREATE TABLE public.duel_invites (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    duel_id       uuid NOT NULL REFERENCES public.duels(id) ON DELETE CASCADE,
    inviter_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    invitee_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status        varchar(10) NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled')),
    created_at    timestamptz NOT NULL DEFAULT now(),
    responded_at  timestamptz,
    CONSTRAINT duel_invites_not_self CHECK (inviter_id <> invitee_id)
);

CREATE INDEX duel_invites_invitee_idx ON public.duel_invites(invitee_id);
CREATE INDEX duel_invites_inviter_idx ON public.duel_invites(inviter_id);
CREATE INDEX duel_invites_duel_id_idx ON public.duel_invites(duel_id);

ALTER TABLE public.duel_invites ENABLE ROW LEVEL SECURITY;

-- challenges_select_involved (016) ile AYNI ilke — sadece davet eden/
-- edilen görebilir (challenges'taki gibi kişisel bir davet, duels'taki
-- gibi herkese açık bir lobi kaydı DEĞİL).
CREATE POLICY "duel_invites_select_involved" ON public.duel_invites
  FOR SELECT USING (auth.uid() = inviter_id OR auth.uid() = invitee_id);
