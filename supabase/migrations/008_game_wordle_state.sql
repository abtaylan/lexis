-- 008_game_wordle_state.sql
-- Adam asmaca (wordle/hangman) modu icin oturum-bazli aktif tur durumu.
-- next-word ile secilen hedef kelime, tahmin edilen harfler ve yanlis
-- tahmin sayisi bu alanda tutulur; tur bitince temizlenir.

alter table game_sessions add column state jsonb not null default '{}'::jsonb;

comment on column game_sessions.state is
  'Mod-ozel aktif tur durumu (orn. wordle modu icin: current_word_id, current_general_word_id, guessed_letters, wrong_guesses). Round bitince temizlenir.';
