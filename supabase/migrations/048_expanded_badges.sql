-- ============================================================
-- LEXIS — Rozet kataloğu genişletmesi (Faz 3f)
-- Migration: 048_expanded_badges.sql
-- ============================================================
-- Kullanıcı isteği (10 Eylül 2026): "Rozet çeşitlerini göremedim" —
-- mevcut katalog (044) sadece düello (3) ve lig terfisi (5) rozetleri
-- içeriyordu; görev haritasında SADECE 1 görev (duel-1) bir rozete
-- bağlıydı. Bu migration 5 yeni rozet ekliyor; VERME mantığı backend'de
-- (quests.py / leagues.py trigger'ı / duels.py) — award_badge()
-- idempotent olduğu için burada sadece katalog var.
-- ============================================================

INSERT INTO public.badges (code, name_tr, name_en, name_de, name_fr, name_es, name_it, name_ar, name_ru, name_ja, name_pt, description_tr, description_en, description_de, description_fr, description_es, description_it, description_ar, description_ru, description_ja, description_pt, icon_emoji) VALUES
  ('league_joined', 'Lige Katıldın', 'League Joined', 'Liga beigetreten', 'Ligue Rejointe', 'Te Uniste a la Liga', 'Entrato in Lega', 'انضممت إلى الدوري', 'Присоединился к Лиге', 'リーグ参加', 'Entrou na Liga',
   'Haftalık liglere ilk kez katıldın!', 'You joined the weekly leagues for the first time!', 'Du bist zum ersten Mal den wöchentlichen Ligen beigetreten!', 'Tu as rejoint les ligues hebdomadaires pour la première fois !', '¡Te uniste a las ligas semanales por primera vez!', 'Sei entrato per la prima volta nelle leghe settimanali!', 'انضممت لأول مرة إلى الدوريات الأسبوعية!', 'Ты впервые присоединился к еженедельным лигам!', '初めて週間リーグに参加しました!', 'Você entrou nas ligas semanais pela primeira vez!',
   '🚩'),
  ('first_quest_complete', 'İlk Görev', 'First Quest', 'Erste Aufgabe', 'Première Quête', 'Primera Misión', 'Prima Missione', 'المهمة الأولى', 'Первое Задание', '初めてのクエスト', 'Primeira Missão',
   'Görev haritasındaki ilk adımını tamamladın!', 'You completed your first step on the quest map!', 'Du hast deinen ersten Schritt auf der Aufgabenkarte abgeschlossen!', 'Tu as terminé ta première étape sur la carte des quêtes !', '¡Completaste tu primer paso en el mapa de misiones!', 'Hai completato il tuo primo passo sulla mappa delle missioni!', 'أكملت خطوتك الأولى في خريطة المهام!', 'Ты выполнил первый шаг на карте заданий!', 'クエストマップの最初のステップを完了しました!', 'Você completou seu primeiro passo no mapa de missões!',
   '🌟'),
  ('quest_map_complete', 'Harita Ustası', 'Map Master', 'Kartenmeister', 'Maître de la Carte', 'Maestro del Mapa', 'Maestro della Mappa', 'سيد الخريطة', 'Мастер Карты', 'マップマスター', 'Mestre do Mapa',
   'Görev haritasındaki tüm görevleri tamamladın!', 'You completed every quest on the map!', 'Du hast alle Aufgaben auf der Karte abgeschlossen!', 'Tu as terminé toutes les quêtes de la carte !', '¡Completaste todas las misiones del mapa!', 'Hai completato tutte le missioni della mappa!', 'أكملت جميع المهام في الخريطة!', 'Ты выполнил все задания на карте!', 'マップのすべてのクエストを完了しました!', 'Você completou todas as missões do mapa!',
   '🗺️'),
  ('perfect_duel', 'Kusursuz Düello', 'Flawless Duel', 'Makelloses Duell', 'Duel Parfait', 'Duelo Perfecto', 'Duello Perfetto', 'مبارزة مثالية', 'Безупречная Дуэль', 'パーフェクトデュエル', 'Duelo Perfeito',
   'Bir düelloyu tüm sorulara doğru cevap vererek kazandın!', 'You won a duel by answering every question correctly!', 'Du hast ein Duell gewonnen, indem du jede Frage richtig beantwortet hast!', 'Tu as remporté un duel en répondant correctement à toutes les questions !', '¡Ganaste un duelo respondiendo correctamente a todas las preguntas!', 'Hai vinto un duello rispondendo correttamente a tutte le domande!', 'فزت بمبارزة من خلال الإجابة الصحيحة على جميع الأسئلة!', 'Ты выиграл дуэль, правильно ответив на все вопросы!', 'すべての質問に正解してデュエルに勝利しました!', 'Você venceu um duelo respondendo corretamente a todas as perguntas!',
   '💯'),
  ('duel_veteran_25', 'Düello Gazisi', 'Duel Veteran', 'Duell-Veteran', 'Vétéran du Duel', 'Veterano del Duelo', 'Veterano del Duello', 'محارب المبارزات', 'Ветеран Дуэлей', 'デュエルの猛者', 'Veterano do Duelo',
   '25 düelloya katıldın!', 'You took part in 25 duels!', 'Du hast an 25 Duellen teilgenommen!', 'Tu as participé à 25 duels !', '¡Participaste en 25 duelos!', 'Hai partecipato a 25 duelli!', 'شاركت في 25 مبارزة!', 'Ты принял участие в 25 дуэлях!', '25回のデュエルに参加しました!', 'Você participou de 25 duelos!',
   '🎖️');

-- ------------------------------------------------------------
-- İlk lig kaydında "league_joined" rozeti — bkz. migration 047'deki
-- handle_new_profile_league_enrollment() trigger fonksiyonu, burada
-- genişletiliyor.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_profile_league_enrollment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.ensure_active_league_membership(NEW.id, COALESCE(NEW.current_league_tier, 'bronze'));

  IF COALESCE(NEW.is_bot, false) = false THEN
    INSERT INTO public.user_badges (user_id, badge_code)
    VALUES (NEW.id, 'league_joined')
    ON CONFLICT (user_id, badge_code) WHERE (period_key IS NULL) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- Geriye dönük: migration 047'de zaten kaydedilmiş gerçek kullanıcılara da ver.
INSERT INTO public.user_badges (user_id, badge_code)
SELECT p.id, 'league_joined' FROM public.profiles p
JOIN public.league_memberships lm ON lm.user_id = p.id
WHERE p.is_bot = false
ON CONFLICT (user_id, badge_code) WHERE (period_key IS NULL) DO NOTHING;
