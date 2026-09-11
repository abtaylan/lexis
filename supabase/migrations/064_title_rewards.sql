-- ============================================================
-- LEXIS — Ödüller (title/kozmetik ödüller): seviye unvanları
-- Migration: 064_title_rewards.sql
-- ============================================================
-- Rozetler ve Ödüller sayfasındaki "Ödüller" sekmesi şimdiye kadar boştu
-- (badges.kind='title' hiç satır yoktu, bkz. migration 063). Bu migration
-- ilk "title" satırlarını ekliyor: profiles.level'e (xp_service.py'deki
-- level_from_total_xp formülü) dayalı, kalıcı/kozmetik seviye unvanları.
-- Achievement rozetlerinden farkı: bunlar tek bir olayı anmıyor, kullanıcının
-- GÜNCEL rütbesini/prestijini temsil ediyor (ama award_badge() altyapısı
-- aynı — bir kez kazanılır, kalıcıdır; XP hiç azalmadığı için sorun değil).
--
-- Awarding: backend/app/services/xp_service.py::award_xp() içine eklenen
-- _award_level_titles() — her XP kazanımında seviye atlanmışsa, atlanan
-- ARALIKTAKİ tüm eşikleri (büyük bir XP artışı birden fazla eşiği aynı anda
-- geçebilir) award_badge() ile verir. Migration uygulandığında halihazırda
-- eşiği geçmiş kullanıcılar için canlıda ayrıca bir SQL backfill çalıştırıldı
-- (bu dosyada değil, tek seferlik elle çalıştırıldı — repo'da izi yok, ama
-- award_xp() hook'u bundan sonraki tüm kazanımlar için kalıcı çözüm).
--
-- category='level' — frontend'de (rewardsLocale.ts / rewardsStrings.ts)
-- CATEGORY_SECTION + CATEGORY_ORDER'a 'level' eklenip "Seviye" bölüm adı
-- tanımlandı (aynı commit'te).
-- ============================================================

INSERT INTO public.badges (
  code, kind, category, icon_emoji,
  name_tr, name_en, name_de, name_fr, name_es, name_it, name_ar, name_ru, name_ja, name_pt,
  description_tr, description_en, description_de, description_fr, description_es, description_it,
  description_ar, description_ru, description_ja, description_pt,
  requirement_tr, requirement_en
) VALUES
  ('level_3', 'title', 'level', '🌱',
   'Kelime Çırağı', 'Word Apprentice', 'Wortlehrling', 'Apprenti des Mots', 'Aprendiz de Palabras', 'Apprendista di Parole', 'متدرب الكلمات', 'Ученик Слов', '単語見習い', 'Aprendiz de Palavras',
   'Seviye 3''e ulaştın.', 'You reached level 3.', 'Du hast Level 3 erreicht.', 'Tu as atteint le niveau 3.', 'Alcanzaste el nivel 3.', 'Hai raggiunto il livello 3.', 'وصلت إلى المستوى 3.', 'Ты достиг 3 уровня.', 'レベル3に到達しました。', 'Chegaste ao nível 3.',
   'Seviye 3''e ulaş', 'Reach level 3'),
  ('level_5', 'title', 'level', '📖',
   'Kelime Avcısı', 'Word Hunter', 'Wortjäger', 'Chasseur de Mots', 'Cazador de Palabras', 'Cacciatore di Parole', 'صياد الكلمات', 'Охотник за Словами', '単語ハンター', 'Caçador de Palavras',
   'Seviye 5''e ulaştın.', 'You reached level 5.', 'Du hast Level 5 erreicht.', 'Tu as atteint le niveau 5.', 'Alcanzaste el nivel 5.', 'Hai raggiunto il livello 5.', 'وصلت إلى المستوى 5.', 'Ты достиг 5 уровня.', 'レベル5に到達しました。', 'Chegaste ao nível 5.',
   'Seviye 5''e ulaş', 'Reach level 5'),
  ('level_10', 'title', 'level', '🎓',
   'Kelime Ustası', 'Word Master', 'Wortmeister', 'Maître des Mots', 'Maestro de Palabras', 'Maestro delle Parole', 'سيد الكلمات', 'Мастер Слов', '単語マスター', 'Mestre das Palavras',
   'Seviye 10''a ulaştın.', 'You reached level 10.', 'Du hast Level 10 erreicht.', 'Tu as atteint le niveau 10.', 'Alcanzaste el nivel 10.', 'Hai raggiunto il livello 10.', 'وصلت إلى المستوى 10.', 'Ты достиг 10 уровня.', 'レベル10に到達しました。', 'Chegaste ao nível 10.',
   'Seviye 10''a ulaş', 'Reach level 10'),
  ('level_15', 'title', 'level', '🗣️',
   'Dilbilimci', 'Linguist', 'Linguist', 'Linguiste', 'Lingüista', 'Linguista', 'لغوي', 'Лингвист', '言語学者', 'Linguista',
   'Seviye 15''e ulaştın.', 'You reached level 15.', 'Du hast Level 15 erreicht.', 'Tu as atteint le niveau 15.', 'Alcanzaste el nivel 15.', 'Hai raggiunto il livello 15.', 'وصلت إلى المستوى 15.', 'Ты достиг 15 уровня.', 'レベル15に到達しました。', 'Chegaste ao nível 15.',
   'Seviye 15''e ulaş', 'Reach level 15'),
  ('level_20', 'title', 'level', '🌐',
   'Poliglot Adayı', 'Polyglot Candidate', 'Polyglott-Anwärter', 'Candidat Polyglotte', 'Candidato a Políglota', 'Candidato Poliglotta', 'مرشح متعدد اللغات', 'Кандидат в Полиглоты', 'ポリグロット候補', 'Candidato a Poliglota',
   'Seviye 20''ye ulaştın.', 'You reached level 20.', 'Du hast Level 20 erreicht.', 'Tu as atteint le niveau 20.', 'Alcanzaste el nivel 20.', 'Hai raggiunto il livello 20.', 'وصلت إلى المستوى 20.', 'Ты достиг 20 уровня.', 'レベル20に到達しました。', 'Chegaste ao nível 20.',
   'Seviye 20''ye ulaş', 'Reach level 20'),
  ('level_30', 'title', 'level', '👑',
   'Dil Üstadı', 'Language Grandmaster', 'Sprach-Großmeister', 'Grand Maître des Langues', 'Gran Maestro de Idiomas', 'Gran Maestro delle Lingue', 'الأستاذ الأكبر للغة', 'Гроссмейстер Языка', '言語グランドマスター', 'Grão-Mestre de Idiomas',
   'Seviye 30''a ulaştın.', 'You reached level 30.', 'Du hast Level 30 erreicht.', 'Tu as atteint le niveau 30.', 'Alcanzaste el nivel 30.', 'Hai raggiunto il livello 30.', 'وصلت إلى المستوى 30.', 'Ты достиг 30 уровня.', 'レベル30に到達しました。', 'Chegaste ao nível 30.',
   'Seviye 30''a ulaş', 'Reach level 30'),
  ('level_40', 'title', 'level', '⚡',
   'Lexis Gurusu', 'Lexis Guru', 'Lexis-Guru', 'Gourou Lexis', 'Gurú de Lexis', 'Guru di Lexis', 'خبير Lexis', 'Гуру Lexis', 'Lexisグル', 'Guru da Lexis',
   'Seviye 40''a ulaştın.', 'You reached level 40.', 'Du hast Level 40 erreicht.', 'Tu as atteint le niveau 40.', 'Alcanzaste el nivel 40.', 'Hai raggiunto il livello 40.', 'وصلت إلى المستوى 40.', 'Ты достиг 40 уровня.', 'レベル40に到達しました。', 'Chegaste ao nível 40.',
   'Seviye 40''a ulaş', 'Reach level 40'),
  ('level_50', 'title', 'level', '🏆',
   'Lexis Efsanesi', 'Lexis Legend', 'Lexis-Legende', 'Légende Lexis', 'Leyenda de Lexis', 'Leggenda di Lexis', 'أسطورة Lexis', 'Легенда Lexis', 'Lexisレジェンド', 'Lenda da Lexis',
   'Seviye 50''ye ulaştın.', 'You reached level 50.', 'Du hast Level 50 erreicht.', 'Tu as atteint le niveau 50.', 'Alcanzaste el nivel 50.', 'Hai raggiunto il livello 50.', 'وصلت إلى المستوى 50.', 'Ты достиг 50 уровня.', 'レベル50に到達しました。', 'Chegaste ao nível 50.',
   'Seviye 50''ye ulaş', 'Reach level 50');
