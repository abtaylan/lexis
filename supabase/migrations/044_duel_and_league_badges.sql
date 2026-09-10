-- ============================================================
-- LEXIS — Düello/Lig rozetleri (kullanıcı sorusu, 10 Eylül 2026:
-- "XP'den ziyade ödül/madalya hazır mı?")
-- Migration: 044_duel_and_league_badges.sql
-- ============================================================
-- Mevcut rozet altyapısı (badges + user_badges + badge_service.award_badge,
-- bkz. distribute_leaderboard_rewards.py) sadece streak (7/30/100/365) ve
-- haftalık/aylık liderlik tablosu ödülleri için kullanılıyordu — düello
-- galibiyeti VE lig terfisi için hiç rozet YOKTU (sadece XP veriliyordu).
-- Bu migration katalog satırlarını ekliyor; asıl VERME mantığı
-- backend'de (bkz. duels.py::advance_round + lig rollover scheduled
-- task'ının güncellenmiş SQL'i) — award_badge() zaten idempotent olduğu
-- için burada sadece katalog var, mantık ayrı commit'te.
-- ============================================================

INSERT INTO public.badges (code, name_tr, name_en, name_de, name_fr, name_es, name_it, name_ar, name_ru, name_ja, name_pt, description_tr, description_en, description_de, description_fr, description_es, description_it, description_ar, description_ru, description_ja, description_pt, icon_emoji) VALUES
  ('first_duel_win', 'İlk Zafer', 'First Victory', 'Erster Sieg', 'Première Victoire', 'Primera Victoria', 'Prima Vittoria', 'النصر الأول', 'Первая Победа', '初勝利', 'Primeira Vitória',
   'İlk düello galibiyetini kazandın!', 'You won your first duel!', 'Du hast dein erstes Duell gewonnen!', 'Tu as remporté ton premier duel !', '¡Ganaste tu primer duelo!', 'Hai vinto il tuo primo duello!', 'فزت بأول مبارزة لك!', 'Ты выиграл свою первую дуэль!', '初めてのデュエルに勝利しました!', 'Você venceu seu primeiro duelo!',
   '⚔️'),
  ('duel_win_10', 'Düello Ustası', 'Duel Master', 'Duell-Meister', 'Maître du Duel', 'Maestro del Duelo', 'Maestro del Duello', 'سيد المبارزات', 'Мастер Дуэлей', 'デュエルマスター', 'Mestre do Duelo',
   '10 düello kazandın!', 'You won 10 duels!', 'Du hast 10 Duelle gewonnen!', 'Tu as remporté 10 duels !', '¡Ganaste 10 duelos!', 'Hai vinto 10 duelli!', 'فزت بـ 10 مبارزات!', 'Ты выиграл 10 дуэлей!', '10回のデュエルに勝利しました!', 'Você venceu 10 duelos!',
   '🛡️'),
  ('duel_win_50', 'Düello Şampiyonu', 'Duel Champion', 'Duell-Champion', 'Champion du Duel', 'Campeón del Duelo', 'Campione del Duello', 'بطل المبارزات', 'Чемпион Дуэлей', 'デュエルチャンピオン', 'Campeão do Duelo',
   '50 düello kazandın!', 'You won 50 duels!', 'Du hast 50 Duelle gewonnen!', 'Tu as remporté 50 duels !', '¡Ganaste 50 duelos!', 'Hai vinto 50 duelli!', 'فزت بـ 50 مبارزة!', 'Ты выиграл 50 дуэлей!', '50回のデュエルに勝利しました!', 'Você venceu 50 duelos!',
   '👑'),
  ('league_silver', 'Gümüş Lig', 'Silver League', 'Silberliga', 'Ligue Argent', 'Liga de Plata', 'Lega Argento', 'الدوري الفضي', 'Серебряная Лига', 'シルバーリーグ', 'Liga de Prata',
   'Gümüş lige terfi ettin!', 'You were promoted to the Silver League!', 'Du wurdest in die Silberliga befördert!', 'Tu as été promu en Ligue Argent !', '¡Fuiste ascendido a la Liga de Plata!', 'Sei stato promosso alla Lega Argento!', 'تمت ترقيتك إلى الدوري الفضي!', 'Тебя повысили до Серебряной Лиги!', 'シルバーリーグに昇格しました!', 'Você foi promovido para a Liga de Prata!',
   '🥈'),
  ('league_gold', 'Altın Lig', 'Gold League', 'Goldliga', 'Ligue Or', 'Liga de Oro', 'Lega Oro', 'الدوري الذهبي', 'Золотая Лига', 'ゴールドリーグ', 'Liga de Ouro',
   'Altın lige terfi ettin!', 'You were promoted to the Gold League!', 'Du wurdest in die Goldliga befördert!', 'Tu as été promu en Ligue Or !', '¡Fuiste ascendido a la Liga de Oro!', 'Sei stato promosso alla Lega Oro!', 'تمت ترقيتك إلى الدوري الذهبي!', 'Тебя повысили до Золотой Лиги!', 'ゴールドリーグに昇格しました!', 'Você foi promovido para a Liga de Ouro!',
   '🥇'),
  ('league_platinum', 'Platin Lig', 'Platinum League', 'Platin-Liga', 'Ligue Platine', 'Liga de Platino', 'Lega Platino', 'دوري البلاتين', 'Платиновая Лига', 'プラチナリーグ', 'Liga de Platina',
   'Platin lige terfi ettin!', 'You were promoted to the Platinum League!', 'Du wurdest in die Platin-Liga befördert!', 'Tu as été promu en Ligue Platine !', '¡Fuiste ascendido a la Liga de Platino!', 'Sei stato promosso alla Lega Platino!', 'تمت ترقيتك إلى دوري البلاتين!', 'Тебя повысили до Платиновой Лиги!', 'プラチナリーグに昇格しました!', 'Você foi promovido para a Liga de Platina!',
   '💠'),
  ('league_diamond', 'Elmas Lig', 'Diamond League', 'Diamantliga', 'Ligue Diamant', 'Liga de Diamante', 'Lega Diamante', 'دوري الماس', 'Бриллиантовая Лига', 'ダイヤモンドリーグ', 'Liga de Diamante',
   'Elmas lige terfi ettin!', 'You were promoted to the Diamond League!', 'Du wurdest in die Diamantliga befördert!', 'Tu as été promu en Ligue Diamant !', '¡Fuiste ascendido a la Liga de Diamante!', 'Sei stato promosso alla Lega Diamante!', 'تمت ترقيتك إلى دوري الماس!', 'Тебя повысили до Бриллиантовой Лиги!', 'ダイヤモンドリーグに昇格しました!', 'Você foi promovido para a Liga de Diamante!',
   '💎'),
  ('league_master', 'Usta Lig', 'Master League', 'Meisterliga', 'Ligue Maître', 'Liga Maestra', 'Lega Maestro', 'دوري الأساتذة', 'Лига Мастеров', 'マスターリーグ', 'Liga Mestre',
   'Usta lige terfi ettin — en üst kademe!', 'You were promoted to the Master League — the top tier!', 'Du wurdest in die Meisterliga befördert — die höchste Stufe!', 'Tu as été promu en Ligue Maître — le plus haut niveau !', '¡Fuiste ascendido a la Liga Maestra, el nivel más alto!', 'Sei stato promosso alla Lega Maestro, il livello più alto!', 'تمت ترقيتك إلى دوري الأساتذة، أعلى مستوى!', 'Тебя повысили до Лиги Мастеров — высшего уровня!', 'マスターリーグ(最高峰)に昇格しました!', 'Você foi promovido para a Liga Mestre, o nível mais alto!',
   '🏆');
