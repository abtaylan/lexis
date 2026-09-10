-- ============================================================
-- LEXIS — V2 Faz 3c: Görev haritası (quest map) — SUNUCU taraflı ilerleme
-- Migration: 042_quest_map_schema.sql
-- ============================================================
-- Plan notu (§6.3/3c): Gramer Rehberi'nin harita UI'ı görsel desen olarak
-- yeniden kullanılabilir AMA ilerleme SUNUCUDA tutulmalı (localStorage
-- YETERSİZ — rekabet/lig bağlamı var). Bu migration SADECE şema; görev
-- İÇERİĞİ (hangi görevler, kaç tane, tam metinler) BİLİNÇLİ OLARAK ayrı
-- bir alt-adım (plan'ın kendi notu) — burada mekanizmayı kanıtlayacak
-- küçük, makul bir başlangıç seti seed edildi (kolayca genişletilir/
-- düzenlenir, migration gerektirmez çünkü requirement_type serbest metin).
--
-- requirement_type BİLİNÇLİ OLARAK CHECK enum DEĞİL (serbest varchar) —
-- backend'deki _evaluate_requirement() yeni tipleri Python tarafında
-- ekleyebilsin diye (ör. ileride "streak_days" eklenecek — bkz.
-- routes/quests.py yorumu), DB migration'ı beklemeden.
-- ============================================================

CREATE TABLE public.quest_nodes (
    id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    slug               varchar(60) NOT NULL UNIQUE,
    title_tr           varchar(100) NOT NULL,
    title_en           varchar(100) NOT NULL,
    description_tr     text,
    description_en     text,
    -- requirement_type + requirement_count: _evaluate_requirement()'ın
    -- anladığı bir tip olmalı (bkz. routes/quests.py). Şu an desteklenen:
    -- 'xp_total' (profiles.total_xp), 'duel_wins' (xp_events'te
    -- source_type='duel_win' sayısı).
    requirement_type   varchar(30) NOT NULL,
    requirement_count  integer NOT NULL CHECK (requirement_count > 0),
    order_index        integer NOT NULL,
    is_active          boolean NOT NULL DEFAULT true,
    created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX quest_nodes_order_idx ON public.quest_nodes(order_index);

INSERT INTO public.quest_nodes (slug, title_tr, title_en, description_tr, description_en, requirement_type, requirement_count, order_index) VALUES
  ('xp-100',   'İlk Adım',        'First Step',    'Toplam 100 XP kazan.',              'Earn a total of 100 XP.',              'xp_total',  100,  1),
  ('duel-1',   'İlk Zafer',       'First Victory',  'Bir düello kazan.',                  'Win one duel.',                        'duel_wins', 1,    2),
  ('xp-500',   'Kelime Avcısı',   'Word Hunter',    'Toplam 500 XP kazan.',              'Earn a total of 500 XP.',              'xp_total',  500,  3),
  ('duel-3',   'Düello Ustası',   'Duel Master',    '3 düello kazan.',                    'Win 3 duels.',                         'duel_wins', 3,    4),
  ('xp-1000',  'Azimli Öğrenci',  'Dedicated Learner', 'Toplam 1000 XP kazan.',          'Earn a total of 1000 XP.',             'xp_total',  1000, 5);

ALTER TABLE public.quest_nodes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "quest_nodes_select_all" ON public.quest_nodes
  FOR SELECT USING (true);

CREATE TABLE public.user_quest_progress (
    user_id        uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    quest_node_id  uuid NOT NULL REFERENCES public.quest_nodes(id) ON DELETE CASCADE,
    completed_at   timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, quest_node_id)
);

ALTER TABLE public.user_quest_progress ENABLE ROW LEVEL SECURITY;

-- Kişisel ilerleme — duels/leagues'teki "select true" desenden FARKLI
-- olarak, başkasının görev tamamlama geçmişini herkese açmak için bir
-- sebep yok; sadece kendi satırlarını görebilir.
CREATE POLICY "user_quest_progress_select_own" ON public.user_quest_progress
  FOR SELECT USING (auth.uid() = user_id);
