// src/lib/reportLocale.ts — "Raporum" (Kullanıcı Raporu) sayfası
// (app/(app)/report/page.tsx) için yerel çeviri sözlüğü. rewardsLocale.ts /
// leagueLocale.ts ile aynı desen: merkezi i18n.tsx'e dokunmadan, sayfaya
// özel bir dosyada 10 dilin tamamı. İstatistik & Raporlama V2 öncelik #3,
// madde A — dönemsel (bu hafta/ay) tüm ilerleme özetini bir önceki eşit
// uzunluktaki döneme kıyasla % değişimiyle gösterir (bkz. backend:
// report_service.py::get_user_report).
import type { Locale } from '@/lib/i18n';

export interface ReportStrings {
  title: string;
  subtitle: string;
  weekTab: string;
  monthTab: string;
  loading: string;
  error: string;
  retryBtn: string;
  newLabel: string;
  sectionStudy: string;
  minutesLabel: string;
  sessionsLabel: string;
  sectionStreak: string;
  currentStreakLabel: string;
  longestStreakLabel: string;
  streakUnit: string;
  sectionVocabulary: string;
  totalWordsLabel: string;
  learnedWordsLabel: string;
  newWordsLabel: string;
  sectionGames: string;
  gameSessionsLabel: string;
  avgScoreLabel: string;
  sectionExam: string;
  accuracyLabel: string;
  weakTopicsLabel: string;
  strongTopicsLabel: string;
  noTopicDataLabel: string;
  attemptsUnit: string;
  sectionQuests: string;
  questsCompletedLabel: string;
  questsProgressLabel: string;
  sectionBadges: string;
  badgesTotalLabel: string;
  badgesNewLabel: string;
  sectionLeague: string;
  currentTierLabel: string;
  leagueHistoryLabel: string;
  noLeagueHistoryLabel: string;
  outcomePromoted: string;
  outcomeDemoted: string;
  outcomeStayed: string;
  sectionSubscription: string;
  premiumActiveLabel: string;
  premiumUntilTpl: string;
  freeLabel: string;
  noTierLabel: string;
}

// backend'in weak_topics/strong_topics döndürdüğü topic_tag ham anahtarları
// için sabit bir çeviri sözlüğü yok (bkz. topic_practice_attempts.topic_tag) —
// sayfa bunları başlık harfi büyütülmüş + alt çizgiler boşlukla değiştirilmiş
// hâliyle gösteriyor, bu yüzden burada ayrıca bir alan yok.
export const REPORT_L: Record<Locale, ReportStrings> = {
  tr: {
    title: 'Raporum', subtitle: 'İlerlemenin dönemsel özeti — bu dönem, bir önceki döneme kıyasla.',
    weekTab: 'Bu Hafta', monthTab: 'Bu Ay',
    loading: 'Yükleniyor…', error: 'Rapor yüklenemedi.', retryBtn: 'Tekrar dene',
    newLabel: 'Yeni',
    sectionStudy: 'Çalışma Süresi', minutesLabel: 'dakika', sessionsLabel: 'oturum',
    sectionStreak: 'Seri', currentStreakLabel: 'Güncel seri', longestStreakLabel: 'En uzun seri', streakUnit: 'gün',
    sectionVocabulary: 'Kelime Hazinesi', totalWordsLabel: 'Toplam kelime', learnedWordsLabel: 'Öğrenilmiş',
    newWordsLabel: 'Bu dönem eklenen',
    sectionGames: 'Oyun Performansı', gameSessionsLabel: 'oyun oturumu', avgScoreLabel: 'Ortalama skor',
    sectionExam: 'Sınav / Konu Doğruluğu', accuracyLabel: 'Doğruluk oranı',
    weakTopicsLabel: 'Geliştirilmesi gereken konular', strongTopicsLabel: 'Güçlü konular',
    noTopicDataLabel: 'Henüz yeterli veri yok.', attemptsUnit: 'deneme',
    sectionQuests: 'Görev Haritası', questsCompletedLabel: 'Tamamlanan görev', questsProgressLabel: 'Genel ilerleme',
    sectionBadges: 'Rozetler', badgesTotalLabel: 'Toplam kazanılan', badgesNewLabel: 'Bu dönem kazanılan',
    sectionLeague: 'Lig', currentTierLabel: 'Güncel kademe', leagueHistoryLabel: 'Son haftalar',
    noLeagueHistoryLabel: 'Henüz bir lig geçmişin yok.',
    outcomePromoted: 'Terfi', outcomeDemoted: 'Düşüş', outcomeStayed: 'Aynı kademe',
    sectionSubscription: 'Abonelik', premiumActiveLabel: 'Premium aktif',
    premiumUntilTpl: '{date} tarihine kadar', freeLabel: 'Ücretsiz plan', noTierLabel: 'Henüz bir lige katılmadın',
  },
  en: {
    title: 'My Report', subtitle: 'A period-over-period summary of your progress.',
    weekTab: 'This Week', monthTab: 'This Month',
    loading: 'Loading…', error: 'Could not load the report.', retryBtn: 'Try again',
    newLabel: 'New',
    sectionStudy: 'Study Time', minutesLabel: 'minutes', sessionsLabel: 'sessions',
    sectionStreak: 'Streak', currentStreakLabel: 'Current streak', longestStreakLabel: 'Longest streak', streakUnit: 'days',
    sectionVocabulary: 'Vocabulary', totalWordsLabel: 'Total words', learnedWordsLabel: 'Learned',
    newWordsLabel: 'Added this period',
    sectionGames: 'Game Performance', gameSessionsLabel: 'game sessions', avgScoreLabel: 'Average score',
    sectionExam: 'Exam / Topic Accuracy', accuracyLabel: 'Accuracy rate',
    weakTopicsLabel: 'Topics to improve', strongTopicsLabel: 'Strong topics',
    noTopicDataLabel: 'Not enough data yet.', attemptsUnit: 'attempts',
    sectionQuests: 'Quest Map', questsCompletedLabel: 'Quests completed', questsProgressLabel: 'Overall progress',
    sectionBadges: 'Badges', badgesTotalLabel: 'Total earned', badgesNewLabel: 'Earned this period',
    sectionLeague: 'League', currentTierLabel: 'Current tier', leagueHistoryLabel: 'Recent weeks',
    noLeagueHistoryLabel: 'No league history yet.',
    outcomePromoted: 'Promoted', outcomeDemoted: 'Demoted', outcomeStayed: 'Stayed',
    sectionSubscription: 'Subscription', premiumActiveLabel: 'Premium active',
    premiumUntilTpl: 'until {date}', freeLabel: 'Free plan', noTierLabel: "You haven't joined a league yet",
  },
  de: {
    title: 'Mein Bericht', subtitle: 'Eine Zusammenfassung deines Fortschritts im Zeitvergleich.',
    weekTab: 'Diese Woche', monthTab: 'Dieser Monat',
    loading: 'Lädt…', error: 'Bericht konnte nicht geladen werden.', retryBtn: 'Erneut versuchen',
    newLabel: 'Neu',
    sectionStudy: 'Lernzeit', minutesLabel: 'Minuten', sessionsLabel: 'Sitzungen',
    sectionStreak: 'Serie', currentStreakLabel: 'Aktuelle Serie', longestStreakLabel: 'Längste Serie', streakUnit: 'Tage',
    sectionVocabulary: 'Wortschatz', totalWordsLabel: 'Wörter gesamt', learnedWordsLabel: 'Gelernt',
    newWordsLabel: 'In diesem Zeitraum hinzugefügt',
    sectionGames: 'Spielleistung', gameSessionsLabel: 'Spielsitzungen', avgScoreLabel: 'Durchschnittliche Punktzahl',
    sectionExam: 'Prüfungs-/Themengenauigkeit', accuracyLabel: 'Genauigkeit',
    weakTopicsLabel: 'Zu verbessernde Themen', strongTopicsLabel: 'Starke Themen',
    noTopicDataLabel: 'Noch nicht genug Daten.', attemptsUnit: 'Versuche',
    sectionQuests: 'Aufgabenkarte', questsCompletedLabel: 'Abgeschlossene Aufgaben', questsProgressLabel: 'Gesamtfortschritt',
    sectionBadges: 'Abzeichen', badgesTotalLabel: 'Insgesamt verdient', badgesNewLabel: 'In diesem Zeitraum verdient',
    sectionLeague: 'Liga', currentTierLabel: 'Aktuelle Stufe', leagueHistoryLabel: 'Letzte Wochen',
    noLeagueHistoryLabel: 'Noch keine Liga-Historie.',
    outcomePromoted: 'Aufgestiegen', outcomeDemoted: 'Abgestiegen', outcomeStayed: 'Gleiche Stufe',
    sectionSubscription: 'Abonnement', premiumActiveLabel: 'Premium aktiv',
    premiumUntilTpl: 'bis {date}', freeLabel: 'Kostenloser Plan', noTierLabel: 'Du bist noch keiner Liga beigetreten',
  },
  fr: {
    title: 'Mon rapport', subtitle: "Un résumé de tes progrès, période par période.",
    weekTab: 'Cette semaine', monthTab: 'Ce mois-ci',
    loading: 'Chargement…', error: 'Impossible de charger le rapport.', retryBtn: 'Réessayer',
    newLabel: 'Nouveau',
    sectionStudy: "Temps d'étude", minutesLabel: 'minutes', sessionsLabel: 'sessions',
    sectionStreak: 'Série', currentStreakLabel: 'Série actuelle', longestStreakLabel: 'Plus longue série', streakUnit: 'jours',
    sectionVocabulary: 'Vocabulaire', totalWordsLabel: 'Mots au total', learnedWordsLabel: 'Appris',
    newWordsLabel: 'Ajoutés cette période',
    sectionGames: 'Performance aux jeux', gameSessionsLabel: 'sessions de jeu', avgScoreLabel: 'Score moyen',
    sectionExam: "Précision aux examens / sujets", accuracyLabel: 'Taux de précision',
    weakTopicsLabel: 'Sujets à améliorer', strongTopicsLabel: 'Points forts',
    noTopicDataLabel: 'Pas encore assez de données.', attemptsUnit: 'essais',
    sectionQuests: 'Carte des Quêtes', questsCompletedLabel: 'Quêtes terminées', questsProgressLabel: 'Progression globale',
    sectionBadges: 'Badges', badgesTotalLabel: 'Total obtenu', badgesNewLabel: 'Obtenus cette période',
    sectionLeague: 'Ligue', currentTierLabel: 'Niveau actuel', leagueHistoryLabel: 'Semaines récentes',
    noLeagueHistoryLabel: 'Pas encore d\'historique de ligue.',
    outcomePromoted: 'Promu', outcomeDemoted: 'Rétrogradé', outcomeStayed: 'Niveau inchangé',
    sectionSubscription: 'Abonnement', premiumActiveLabel: 'Premium actif',
    premiumUntilTpl: "jusqu'au {date}", freeLabel: 'Plan gratuit', noTierLabel: "Tu n'as pas encore rejoint de ligue",
  },
  es: {
    title: 'Mi informe', subtitle: 'Un resumen de tu progreso, periodo tras periodo.',
    weekTab: 'Esta semana', monthTab: 'Este mes',
    loading: 'Cargando…', error: 'No se pudo cargar el informe.', retryBtn: 'Reintentar',
    newLabel: 'Nuevo',
    sectionStudy: 'Tiempo de estudio', minutesLabel: 'minutos', sessionsLabel: 'sesiones',
    sectionStreak: 'Racha', currentStreakLabel: 'Racha actual', longestStreakLabel: 'Racha más larga', streakUnit: 'días',
    sectionVocabulary: 'Vocabulario', totalWordsLabel: 'Palabras totales', learnedWordsLabel: 'Aprendidas',
    newWordsLabel: 'Añadidas en este periodo',
    sectionGames: 'Rendimiento en juegos', gameSessionsLabel: 'sesiones de juego', avgScoreLabel: 'Puntuación media',
    sectionExam: 'Precisión de examen / tema', accuracyLabel: 'Tasa de precisión',
    weakTopicsLabel: 'Temas a mejorar', strongTopicsLabel: 'Temas fuertes',
    noTopicDataLabel: 'Aún no hay suficientes datos.', attemptsUnit: 'intentos',
    sectionQuests: 'Mapa de Misiones', questsCompletedLabel: 'Misiones completadas', questsProgressLabel: 'Progreso general',
    sectionBadges: 'Insignias', badgesTotalLabel: 'Total obtenidas', badgesNewLabel: 'Obtenidas en este periodo',
    sectionLeague: 'Liga', currentTierLabel: 'Nivel actual', leagueHistoryLabel: 'Semanas recientes',
    noLeagueHistoryLabel: 'Aún no tienes historial de liga.',
    outcomePromoted: 'Ascendido', outcomeDemoted: 'Descendido', outcomeStayed: 'Mismo nivel',
    sectionSubscription: 'Suscripción', premiumActiveLabel: 'Premium activo',
    premiumUntilTpl: 'hasta el {date}', freeLabel: 'Plan gratuito', noTierLabel: 'Aún no te has unido a una liga',
  },
  it: {
    title: 'Il mio report', subtitle: 'Un riepilogo dei tuoi progressi, periodo su periodo.',
    weekTab: 'Questa settimana', monthTab: 'Questo mese',
    loading: 'Caricamento…', error: 'Impossibile caricare il report.', retryBtn: 'Riprova',
    newLabel: 'Nuovo',
    sectionStudy: 'Tempo di studio', minutesLabel: 'minuti', sessionsLabel: 'sessioni',
    sectionStreak: 'Serie', currentStreakLabel: 'Serie attuale', longestStreakLabel: 'Serie più lunga', streakUnit: 'giorni',
    sectionVocabulary: 'Vocabolario', totalWordsLabel: 'Parole totali', learnedWordsLabel: 'Apprese',
    newWordsLabel: 'Aggiunte in questo periodo',
    sectionGames: 'Prestazioni nei giochi', gameSessionsLabel: 'sessioni di gioco', avgScoreLabel: 'Punteggio medio',
    sectionExam: 'Precisione esami / argomenti', accuracyLabel: 'Tasso di precisione',
    weakTopicsLabel: 'Argomenti da migliorare', strongTopicsLabel: 'Punti di forza',
    noTopicDataLabel: 'Non ci sono ancora abbastanza dati.', attemptsUnit: 'tentativi',
    sectionQuests: 'Mappa delle Missioni', questsCompletedLabel: 'Missioni completate', questsProgressLabel: 'Progresso complessivo',
    sectionBadges: 'Badge', badgesTotalLabel: 'Totale ottenuti', badgesNewLabel: 'Ottenuti in questo periodo',
    sectionLeague: 'Lega', currentTierLabel: 'Livello attuale', leagueHistoryLabel: 'Settimane recenti',
    noLeagueHistoryLabel: 'Ancora nessuna cronologia di lega.',
    outcomePromoted: 'Promosso', outcomeDemoted: 'Retrocesso', outcomeStayed: 'Stesso livello',
    sectionSubscription: 'Abbonamento', premiumActiveLabel: 'Premium attivo',
    premiumUntilTpl: 'fino al {date}', freeLabel: 'Piano gratuito', noTierLabel: 'Non hai ancora partecipato a una lega',
  },
  ar: {
    title: 'تقريري', subtitle: 'ملخص لتقدمك مقارنة بالفترة السابقة.',
    weekTab: 'هذا الأسبوع', monthTab: 'هذا الشهر',
    loading: 'جارٍ التحميل…', error: 'تعذر تحميل التقرير.', retryBtn: 'إعادة المحاولة',
    newLabel: 'جديد',
    sectionStudy: 'وقت الدراسة', minutesLabel: 'دقيقة', sessionsLabel: 'جلسة',
    sectionStreak: 'السلسلة', currentStreakLabel: 'السلسلة الحالية', longestStreakLabel: 'أطول سلسلة', streakUnit: 'يوم',
    sectionVocabulary: 'المفردات', totalWordsLabel: 'إجمالي الكلمات', learnedWordsLabel: 'تم تعلمها',
    newWordsLabel: 'أُضيفت في هذه الفترة',
    sectionGames: 'أداء الألعاب', gameSessionsLabel: 'جلسة لعب', avgScoreLabel: 'متوسط النتيجة',
    sectionExam: 'دقة الاختبار / الموضوع', accuracyLabel: 'نسبة الدقة',
    weakTopicsLabel: 'مواضيع تحتاج تحسين', strongTopicsLabel: 'مواضيع قوية',
    noTopicDataLabel: 'لا توجد بيانات كافية بعد.', attemptsUnit: 'محاولة',
    sectionQuests: 'خريطة المهام', questsCompletedLabel: 'المهام المكتملة', questsProgressLabel: 'التقدم العام',
    sectionBadges: 'الأوسمة', badgesTotalLabel: 'إجمالي المكتسب', badgesNewLabel: 'مكتسب في هذه الفترة',
    sectionLeague: 'الدوري', currentTierLabel: 'المستوى الحالي', leagueHistoryLabel: 'الأسابيع الأخيرة',
    noLeagueHistoryLabel: 'لا يوجد سجل دوري بعد.',
    outcomePromoted: 'ترقية', outcomeDemoted: 'هبوط', outcomeStayed: 'نفس المستوى',
    sectionSubscription: 'الاشتراك', premiumActiveLabel: 'Premium نشط',
    premiumUntilTpl: 'حتى {date}', freeLabel: 'خطة مجانية', noTierLabel: 'لم تنضم إلى دوري بعد',
  },
  ru: {
    title: 'Мой отчёт', subtitle: 'Сводка твоего прогресса по сравнению с прошлым периодом.',
    weekTab: 'Эта неделя', monthTab: 'Этот месяц',
    loading: 'Загрузка…', error: 'Не удалось загрузить отчёт.', retryBtn: 'Повторить',
    newLabel: 'Новое',
    sectionStudy: 'Время учёбы', minutesLabel: 'минут', sessionsLabel: 'сессий',
    sectionStreak: 'Серия', currentStreakLabel: 'Текущая серия', longestStreakLabel: 'Самая длинная серия', streakUnit: 'дней',
    sectionVocabulary: 'Словарный запас', totalWordsLabel: 'Всего слов', learnedWordsLabel: 'Выучено',
    newWordsLabel: 'Добавлено за этот период',
    sectionGames: 'Результаты в играх', gameSessionsLabel: 'игровых сессий', avgScoreLabel: 'Средний счёт',
    sectionExam: 'Точность экзаменов / тем', accuracyLabel: 'Точность',
    weakTopicsLabel: 'Темы для улучшения', strongTopicsLabel: 'Сильные темы',
    noTopicDataLabel: 'Пока недостаточно данных.', attemptsUnit: 'попыток',
    sectionQuests: 'Карта заданий', questsCompletedLabel: 'Заданий выполнено', questsProgressLabel: 'Общий прогресс',
    sectionBadges: 'Значки', badgesTotalLabel: 'Всего получено', badgesNewLabel: 'Получено за этот период',
    sectionLeague: 'Лига', currentTierLabel: 'Текущий уровень', leagueHistoryLabel: 'Последние недели',
    noLeagueHistoryLabel: 'Пока нет истории лиги.',
    outcomePromoted: 'Повышение', outcomeDemoted: 'Понижение', outcomeStayed: 'Без изменений',
    sectionSubscription: 'Подписка', premiumActiveLabel: 'Premium активен',
    premiumUntilTpl: 'до {date}', freeLabel: 'Бесплатный план', noTierLabel: 'Ты ещё не вступил в лигу',
  },
  ja: {
    title: 'マイレポート', subtitle: '前期間と比較した進捗のまとめ。',
    weekTab: '今週', monthTab: '今月',
    loading: '読み込み中…', error: 'レポートを読み込めませんでした。', retryBtn: '再試行',
    newLabel: '新規',
    sectionStudy: '学習時間', minutesLabel: '分', sessionsLabel: 'セッション',
    sectionStreak: '連続記録', currentStreakLabel: '現在の連続記録', longestStreakLabel: '最長記録', streakUnit: '日',
    sectionVocabulary: '語彙', totalWordsLabel: '合計単語数', learnedWordsLabel: '習得済み',
    newWordsLabel: 'この期間に追加',
    sectionGames: 'ゲーム成績', gameSessionsLabel: 'ゲームセッション', avgScoreLabel: '平均スコア',
    sectionExam: '試験・トピック正答率', accuracyLabel: '正答率',
    weakTopicsLabel: '改善が必要なトピック', strongTopicsLabel: '得意なトピック',
    noTopicDataLabel: 'まだ十分なデータがありません。', attemptsUnit: '回',
    sectionQuests: 'クエストマップ', questsCompletedLabel: '完了したクエスト', questsProgressLabel: '全体の進捗',
    sectionBadges: 'バッジ', badgesTotalLabel: '合計獲得数', badgesNewLabel: 'この期間の獲得数',
    sectionLeague: 'リーグ', currentTierLabel: '現在のティア', leagueHistoryLabel: '直近の週',
    noLeagueHistoryLabel: 'まだリーグ履歴がありません。',
    outcomePromoted: '昇格', outcomeDemoted: '降格', outcomeStayed: '変動なし',
    sectionSubscription: 'サブスクリプション', premiumActiveLabel: 'プレミアム有効',
    premiumUntilTpl: '{date} まで', freeLabel: '無料プラン', noTierLabel: 'まだリーグに参加していません',
  },
  pt: {
    title: 'Meu Relatório', subtitle: 'Um resumo do teu progresso, período após período.',
    weekTab: 'Esta Semana', monthTab: 'Este Mês',
    loading: 'A carregar…', error: 'Não foi possível carregar o relatório.', retryBtn: 'Tentar novamente',
    newLabel: 'Novo',
    sectionStudy: 'Tempo de Estudo', minutesLabel: 'minutos', sessionsLabel: 'sessões',
    sectionStreak: 'Sequência', currentStreakLabel: 'Sequência atual', longestStreakLabel: 'Sequência mais longa', streakUnit: 'dias',
    sectionVocabulary: 'Vocabulário', totalWordsLabel: 'Total de palavras', learnedWordsLabel: 'Aprendidas',
    newWordsLabel: 'Adicionadas neste período',
    sectionGames: 'Desempenho em Jogos', gameSessionsLabel: 'sessões de jogo', avgScoreLabel: 'Pontuação média',
    sectionExam: 'Precisão de Exame / Tópico', accuracyLabel: 'Taxa de precisão',
    weakTopicsLabel: 'Tópicos a melhorar', strongTopicsLabel: 'Pontos fortes',
    noTopicDataLabel: 'Ainda não há dados suficientes.', attemptsUnit: 'tentativas',
    sectionQuests: 'Mapa de Missões', questsCompletedLabel: 'Missões concluídas', questsProgressLabel: 'Progresso geral',
    sectionBadges: 'Insígnias', badgesTotalLabel: 'Total conquistado', badgesNewLabel: 'Conquistado neste período',
    sectionLeague: 'Liga', currentTierLabel: 'Nível atual', leagueHistoryLabel: 'Semanas recentes',
    noLeagueHistoryLabel: 'Ainda sem histórico de liga.',
    outcomePromoted: 'Promovido', outcomeDemoted: 'Rebaixado', outcomeStayed: 'Mesmo nível',
    sectionSubscription: 'Assinatura', premiumActiveLabel: 'Premium ativo',
    premiumUntilTpl: 'até {date}', freeLabel: 'Plano gratuito', noTierLabel: 'Ainda não entraste numa liga',
  },
};
