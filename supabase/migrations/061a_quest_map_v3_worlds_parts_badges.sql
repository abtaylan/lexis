-- Migration 061a: Gorev Haritasi v3 icerik genislemesi -- yeni dunyalar/bolumler/rozetler
INSERT INTO quest_worlds (slug, title_tr, title_en, order_index) VALUES
('world-4', 'Kelime Bahçesi', 'Vocabulary Garden', 4),
('world-5', 'Gramer Ustalığı', 'Grammar Mastery', 5),
('world-6', 'Sınav Maratonu', 'Exam Marathon', 6),
('world-7', 'Efsane Diyarı', 'Legend''s Realm', 7);

INSERT INTO quest_parts (world_id, part_index, title_tr, title_en) VALUES
((SELECT id FROM quest_worlds WHERE slug = 'world-4'), 1, 'Filizlenme', 'Sprouting'),
((SELECT id FROM quest_worlds WHERE slug = 'world-4'), 2, 'Çiçeklenme', 'Blooming'),
((SELECT id FROM quest_worlds WHERE slug = 'world-4'), 3, 'Hasat', 'Harvest'),
((SELECT id FROM quest_worlds WHERE slug = 'world-5'), 1, 'Kelime Türleri', 'Word Classes'),
((SELECT id FROM quest_worlds WHERE slug = 'world-5'), 2, 'Zaman Yolculuğu', 'Tense Journey'),
((SELECT id FROM quest_worlds WHERE slug = 'world-5'), 3, 'Bağlantılar', 'Connections'),
((SELECT id FROM quest_worlds WHERE slug = 'world-5'), 4, 'Koşul ve Modal Dünyası', 'Conditionals & Modals'),
((SELECT id FROM quest_worlds WHERE slug = 'world-5'), 5, 'İleri Yapılar', 'Advanced Structures'),
((SELECT id FROM quest_worlds WHERE slug = 'world-6'), 1, 'YDS Parkuru', 'YDS Track'),
((SELECT id FROM quest_worlds WHERE slug = 'world-6'), 2, 'YÖKDİL Parkuru', 'YOKDIL Track'),
((SELECT id FROM quest_worlds WHERE slug = 'world-6'), 3, 'IELTS Parkuru', 'IELTS Track'),
((SELECT id FROM quest_worlds WHERE slug = 'world-6'), 4, 'TOEFL Parkuru', 'TOEFL Track'),
((SELECT id FROM quest_worlds WHERE slug = 'world-7'), 1, 'Efsane Yolu', 'Path of Legend'),
((SELECT id FROM quest_worlds WHERE slug = 'world-7'), 2, 'Son Sınav', 'The Final Trial');

INSERT INTO badges (code, name_tr, name_en, description_tr, description_en, icon_emoji) VALUES
('vocab_sprout', 'Filiz', 'Sprout', 'Kelime Bahçesi''nin ilk bölümünü tamamladın.', 'You completed the first part of the Vocabulary Garden.', '🌱'),
('vocab_garden_complete', 'Bahçıvan', 'Gardener', 'Kelime Bahçesi''ni (Dünya 4) tamamen bitirdin.', 'You fully completed the Vocabulary Garden (World 4).', '🌻'),
('grammar_apprentice', 'Gramer Çırağı', 'Grammar Apprentice', 'Gramer Ustalığı''nın ilk iki bölümünü tamamladın.', 'You completed the first two parts of Grammar Mastery.', '📘'),
('grammar_scholar', 'Gramer Alimi', 'Grammar Scholar', 'Gramer Ustalığı''nda dört bölümü tamamladın.', 'You completed four parts of Grammar Mastery.', '📚'),
('grammar_master', 'Gramer Ustası', 'Grammar Master', 'Gramer Ustalığı''nı (Dünya 5) tamamen bitirdin -- 30 konunun tamamı.', 'You fully completed Grammar Mastery (World 5) -- all 30 topics.', '🎓'),
('exam_multitasker', 'Çok Yönlü Adayı', 'Multi-Exam Candidate', 'Sınav Maratonu''nda dört farklı sınav türünde de pratik yaptın.', 'You practiced across all four exam types in the Exam Marathon.', '🧭'),
('exam_marathon_complete', 'Maraton Koşucusu', 'Marathon Finisher', 'Sınav Maratonu''nu (Dünya 6) tamamen bitirdin.', 'You fully completed the Exam Marathon (World 6).', '🏃'),
('legend_apprentice', 'Efsane Adayı', 'Aspiring Legend', 'Efsane Diyarı''nın ilk bölümünü tamamladın.', 'You completed the first part of the Legend''s Realm.', '🔮'),
('legend_realm_complete', 'Efsane', 'Legend', 'Efsane Diyarı''nı (Dünya 7) tamamen bitirdin -- Lexis''in en üst rozeti.', 'You fully completed the Legend''s Realm (World 7) -- Lexis''s highest honor.', '🐉');
