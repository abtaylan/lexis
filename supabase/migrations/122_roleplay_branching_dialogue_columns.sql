-- 25 Kasim 2026: Roleplay serbest-metin -> dallanan diyalog agaci gecisi.
-- current_node_id: oturumun su anki node'u (roleplay_data.py agac modeli).
-- good_choices: "good" kaliteli secim sayisi (XP/geri bildirim icin, turn_count ile birlikte).
-- NOT: Bu migration Supabase MCP (apply_migration) ile zaten UYGULANDI;
-- bu dosya sadece repo'daki migration gecmisini tutarli tutmak icindir.
ALTER TABLE public.roleplay_sessions
  ADD COLUMN IF NOT EXISTS current_node_id text,
  ADD COLUMN IF NOT EXISTS good_choices integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.roleplay_sessions.current_node_id IS 'Dallanan diyalog agacinda (roleplay_data.py) oturumun su anki node id''si.';
COMMENT ON COLUMN public.roleplay_sessions.good_choices IS 'Oturum boyunca secilen "good" kaliteli secenek sayisi.';
