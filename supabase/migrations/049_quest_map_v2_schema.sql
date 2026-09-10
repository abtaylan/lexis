-- ============================================================
-- LEXIS — Görev haritası v2: dünya/parça/içerik tipi (temel şema)
-- Migration: 049_quest_map_v2_schema.sql
-- ============================================================
-- Kullanıcı isteği (10 Eylül 2026): görev haritası şu an sadece dikey,
-- tek bir liste (5 görev, hepsi "aggregate" — xp_total/duel_wins gibi
-- arka planda canlı sayılan gereksinimler). İstenen: (1) bir "harita"
-- görünümü — her biri birkaç görevden oluşan PARÇALARA (part) bölünmüş,
-- parça bitince bir sonrakinin açıldığı, bir harita (world) bitince
-- YENİ bir haritaya geçilen yapı (ör. 50 parça/harita); (2) tıklanınca
-- İÇİNE girilen, oyun/quiz/flashcard/düello/gramer/soru-çözme gibi
-- FARKLI İÇERİK TÜRLERİ olan görevler — şu anki "arka planda canlı
-- kontrol" modelinin YANINDA, onu değiştirmeden.
--
-- BU MIGRATION SADECE ŞEMA (bilinçli sınır — 042'deki AYNI karar
-- tekrarlanıyor): quest_worlds/quest_parts tabloları + quest_nodes'a
-- content_type/content_ref/world_id/part_id/difficulty_index eklendi.
-- content_type='aggregate' MEVCUT davranışı (quests.py::_evaluate_
-- requirement) DEĞİŞTİRMEDEN korur — yeni tipler (quiz/flashcard/game/
-- duel/grammar_topic/question_practice) için içerik/route bağlama
-- AYRI bir adım (frontend harita UI'ı ile birlikte).
--
-- content_ref jsonb (ör. {"game_mode":"multiple_choice"} veya
-- {"grammar_topic_slug":"present-simple"} veya {"exam_type":"yds"}) —
-- content_type'a göre backend'in yorumlayacağı, migration gerektirmeyen
-- serbest yapı (042'deki requirement_type'ın serbest-metin felsefesiyle
-- AYNI).
-- ============================================================

CREATE TABLE public.quest_worlds (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    slug         varchar(60) NOT NULL UNIQUE,
    title_tr     varchar(100) NOT NULL,
    title_en     varchar(100) NOT NULL,
    order_index  integer NOT NULL,
    is_active    boolean NOT NULL DEFAULT true,
    created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX quest_worlds_order_idx ON public.quest_worlds(order_index);
ALTER TABLE public.quest_worlds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "quest_worlds_select_all" ON public.quest_worlds FOR SELECT USING (true);

CREATE TABLE public.quest_parts (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    world_id     uuid NOT NULL REFERENCES public.quest_worlds(id) ON DELETE CASCADE,
    part_index   integer NOT NULL,
    title_tr     varchar(100) NOT NULL,
    title_en     varchar(100) NOT NULL,
    is_active    boolean NOT NULL DEFAULT true,
    created_at   timestamptz NOT NULL DEFAULT now(),
    UNIQUE (world_id, part_index)
);
ALTER TABLE public.quest_parts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "quest_parts_select_all" ON public.quest_parts FOR SELECT USING (true);

ALTER TABLE public.quest_nodes ADD COLUMN world_id uuid REFERENCES public.quest_worlds(id) ON DELETE SET NULL;
ALTER TABLE public.quest_nodes ADD COLUMN part_id uuid REFERENCES public.quest_parts(id) ON DELETE SET NULL;
ALTER TABLE public.quest_nodes ADD COLUMN content_type varchar(30) NOT NULL DEFAULT 'aggregate';
ALTER TABLE public.quest_nodes ADD COLUMN content_ref jsonb;
ALTER TABLE public.quest_nodes ADD COLUMN difficulty_index integer NOT NULL DEFAULT 1;

-- Geriye dönük: mevcut 5 görev -> "Dünya 1 / Bölüm 1".
INSERT INTO public.quest_worlds (slug, title_tr, title_en, order_index) VALUES
  ('world-1', 'Dünya 1', 'World 1', 1);

INSERT INTO public.quest_parts (world_id, part_index, title_tr, title_en)
SELECT id, 1, 'Bölüm 1', 'Part 1' FROM public.quest_worlds WHERE slug = 'world-1';

UPDATE public.quest_nodes SET
  world_id = (SELECT id FROM public.quest_worlds WHERE slug = 'world-1'),
  part_id = (SELECT qp.id FROM public.quest_parts qp JOIN public.quest_worlds qw ON qw.id = qp.world_id WHERE qw.slug = 'world-1' AND qp.part_index = 1),
  content_type = 'aggregate';
