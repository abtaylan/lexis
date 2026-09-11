// src/lib/orgReportLocale.ts — Kurum Raporu sayfası
// (app/(app)/organizations/[orgId]/report/page.tsx) için yerel çeviri
// sözlüğü. reportLocale.ts (Kullanıcı Raporu) ile aynı desen.
import type { Locale } from '@/lib/i18n';

export interface OrgReportStrings {
  title: string;
  subtitle: string;
  weekTab: string;
  monthTab: string;
  loading: string;
  error: string;
  forbiddenError: string;
  retryBtn: string;
  newLabel: string;
  memberCountLabel: string;
  activeMemberCountLabel: string;
  sectionStudy: string;
  minutesLabel: string;
  sessionsLabel: string;
  sectionAccuracy: string;
  accuracyLabel: string;
  sectionVocabulary: string;
  newWordsLabel: string;
  sectionTopLearners: string;
  noTopLearnersLabel: string;
  xpUnit: string;
  sectionWeakTopics: string;
  noWeakTopicsLabel: string;
  attemptsUnit: string;
  sectionBadges: string;
  badgesEarnedLabel: string;
}

export const ORG_REPORT_L: Record<Locale, OrgReportStrings> = {
  tr: {
    title: 'Kurum Raporu', subtitle: 'Kurumunuzun bu dönemki genel ilerlemesi — bir önceki döneme kıyasla.',
    weekTab: 'Bu Hafta', monthTab: 'Bu Ay',
    loading: 'Yükleniyor…', error: 'Rapor yüklenemedi.',
    forbiddenError: 'Bu raporu görmek için kurum yöneticisi olmanız gerekiyor.',
    retryBtn: 'Tekrar dene', newLabel: 'Yeni',
    memberCountLabel: 'Toplam üye', activeMemberCountLabel: 'Bu dönem aktif üye',
    sectionStudy: 'Çalışma Süresi', minutesLabel: 'dakika (kurum toplamı)', sessionsLabel: 'oturum',
    sectionAccuracy: 'Doğruluk Oranı', accuracyLabel: 'Kurum genelinde doğruluk',
    sectionVocabulary: 'Kelime Hazinesi', newWordsLabel: 'Bu dönem eklenen kelime (toplam)',
    sectionTopLearners: 'En Aktif Üyeler', noTopLearnersLabel: 'Bu dönem henüz XP kazanan üye yok.', xpUnit: 'XP',
    sectionWeakTopics: 'Kurum Genelinde Zayıf Konular', noWeakTopicsLabel: 'Henüz yeterli veri yok.', attemptsUnit: 'deneme',
    sectionBadges: 'Rozetler', badgesEarnedLabel: 'Bu dönem kazanılan rozet (kurum toplamı)',
  },
  en: {
    title: 'Organization Report', subtitle: "Your organization's overall progress this period, compared to the previous one.",
    weekTab: 'This Week', monthTab: 'This Month',
    loading: 'Loading…', error: 'Could not load the report.',
    forbiddenError: 'You need to be an organization manager to view this report.',
    retryBtn: 'Try again', newLabel: 'New',
    memberCountLabel: 'Total members', activeMemberCountLabel: 'Active members this period',
    sectionStudy: 'Study Time', minutesLabel: 'minutes (org total)', sessionsLabel: 'sessions',
    sectionAccuracy: 'Accuracy Rate', accuracyLabel: 'Org-wide accuracy',
    sectionVocabulary: 'Vocabulary', newWordsLabel: 'Words added this period (total)',
    sectionTopLearners: 'Top Learners', noTopLearnersLabel: 'No member has earned XP this period yet.', xpUnit: 'XP',
    sectionWeakTopics: 'Weakest Topics Org-Wide', noWeakTopicsLabel: 'Not enough data yet.', attemptsUnit: 'attempts',
    sectionBadges: 'Badges', badgesEarnedLabel: 'Badges earned this period (org total)',
  },
  de: {
    title: 'Organisationsbericht', subtitle: 'Der Gesamtfortschritt deiner Organisation in diesem Zeitraum im Vergleich zum vorherigen.',
    weekTab: 'Diese Woche', monthTab: 'Dieser Monat',
    loading: 'Lädt…', error: 'Bericht konnte nicht geladen werden.',
    forbiddenError: 'Du musst Organisationsmanager sein, um diesen Bericht zu sehen.',
    retryBtn: 'Erneut versuchen', newLabel: 'Neu',
    memberCountLabel: 'Mitglieder insgesamt', activeMemberCountLabel: 'Aktive Mitglieder in diesem Zeitraum',
    sectionStudy: 'Lernzeit', minutesLabel: 'Minuten (Organisation gesamt)', sessionsLabel: 'Sitzungen',
    sectionAccuracy: 'Genauigkeit', accuracyLabel: 'Organisationsweite Genauigkeit',
    sectionVocabulary: 'Wortschatz', newWordsLabel: 'In diesem Zeitraum hinzugefügte Wörter (gesamt)',
    sectionTopLearners: 'Aktivste Mitglieder', noTopLearnersLabel: 'Noch kein Mitglied hat in diesem Zeitraum XP verdient.', xpUnit: 'XP',
    sectionWeakTopics: 'Schwächste Themen (organisationsweit)', noWeakTopicsLabel: 'Noch nicht genug Daten.', attemptsUnit: 'Versuche',
    sectionBadges: 'Abzeichen', badgesEarnedLabel: 'In diesem Zeitraum verdiente Abzeichen (Organisation gesamt)',
  },
  fr: {
    title: "Rapport d'organisation", subtitle: "La progression globale de ton organisation sur cette période, comparée à la précédente.",
    weekTab: 'Cette semaine', monthTab: 'Ce mois-ci',
    loading: 'Chargement…', error: 'Impossible de charger le rapport.',
    forbiddenError: 'Tu dois être gestionnaire de l\'organisation pour voir ce rapport.',
    retryBtn: 'Réessayer', newLabel: 'Nouveau',
    memberCountLabel: 'Membres au total', activeMemberCountLabel: 'Membres actifs cette période',
    sectionStudy: "Temps d'étude", minutesLabel: "minutes (total de l'organisation)", sessionsLabel: 'sessions',
    sectionAccuracy: 'Taux de précision', accuracyLabel: "Précision à l'échelle de l'organisation",
    sectionVocabulary: 'Vocabulaire', newWordsLabel: 'Mots ajoutés cette période (total)',
    sectionTopLearners: 'Membres les plus actifs', noTopLearnersLabel: "Aucun membre n'a encore gagné d'XP cette période.", xpUnit: 'XP',
    sectionWeakTopics: "Sujets les plus faibles de l'organisation", noWeakTopicsLabel: 'Pas encore assez de données.', attemptsUnit: 'essais',
    sectionBadges: 'Badges', badgesEarnedLabel: "Badges obtenus cette période (total de l'organisation)",
  },
  es: {
    title: 'Informe de la Organización', subtitle: 'El progreso general de tu organización en este periodo, comparado con el anterior.',
    weekTab: 'Esta semana', monthTab: 'Este mes',
    loading: 'Cargando…', error: 'No se pudo cargar el informe.',
    forbiddenError: 'Debes ser administrador de la organización para ver este informe.',
    retryBtn: 'Reintentar', newLabel: 'Nuevo',
    memberCountLabel: 'Miembros totales', activeMemberCountLabel: 'Miembros activos este periodo',
    sectionStudy: 'Tiempo de estudio', minutesLabel: 'minutos (total de la organización)', sessionsLabel: 'sesiones',
    sectionAccuracy: 'Tasa de precisión', accuracyLabel: 'Precisión de toda la organización',
    sectionVocabulary: 'Vocabulario', newWordsLabel: 'Palabras añadidas este periodo (total)',
    sectionTopLearners: 'Miembros más activos', noTopLearnersLabel: 'Ningún miembro ha ganado XP este periodo todavía.', xpUnit: 'XP',
    sectionWeakTopics: 'Temas más débiles de la organización', noWeakTopicsLabel: 'Aún no hay suficientes datos.', attemptsUnit: 'intentos',
    sectionBadges: 'Insignias', badgesEarnedLabel: 'Insignias obtenidas este periodo (total de la organización)',
  },
  it: {
    title: "Report dell'Organizzazione", subtitle: "L'andamento generale della tua organizzazione in questo periodo, rispetto al precedente.",
    weekTab: 'Questa settimana', monthTab: 'Questo mese',
    loading: 'Caricamento…', error: 'Impossibile caricare il report.',
    forbiddenError: 'Devi essere un amministratore dell\'organizzazione per vedere questo report.',
    retryBtn: 'Riprova', newLabel: 'Nuovo',
    memberCountLabel: 'Membri totali', activeMemberCountLabel: 'Membri attivi in questo periodo',
    sectionStudy: 'Tempo di studio', minutesLabel: "minuti (totale organizzazione)", sessionsLabel: 'sessioni',
    sectionAccuracy: 'Tasso di precisione', accuracyLabel: "Precisione a livello di organizzazione",
    sectionVocabulary: 'Vocabolario', newWordsLabel: 'Parole aggiunte in questo periodo (totale)',
    sectionTopLearners: 'Membri più attivi', noTopLearnersLabel: 'Nessun membro ha ancora guadagnato XP in questo periodo.', xpUnit: 'XP',
    sectionWeakTopics: "Argomenti più deboli dell'organizzazione", noWeakTopicsLabel: 'Non ci sono ancora abbastanza dati.', attemptsUnit: 'tentativi',
    sectionBadges: 'Badge', badgesEarnedLabel: "Badge ottenuti in questo periodo (totale organizzazione)",
  },
  ar: {
    title: 'تقرير المؤسسة', subtitle: 'التقدم العام لمؤسستك في هذه الفترة، مقارنة بالفترة السابقة.',
    weekTab: 'هذا الأسبوع', monthTab: 'هذا الشهر',
    loading: 'جارٍ التحميل…', error: 'تعذر تحميل التقرير.',
    forbiddenError: 'يجب أن تكون مديرًا في المؤسسة لعرض هذا التقرير.',
    retryBtn: 'إعادة المحاولة', newLabel: 'جديد',
    memberCountLabel: 'إجمالي الأعضاء', activeMemberCountLabel: 'الأعضاء النشطون هذه الفترة',
    sectionStudy: 'وقت الدراسة', minutesLabel: 'دقيقة (إجمالي المؤسسة)', sessionsLabel: 'جلسة',
    sectionAccuracy: 'نسبة الدقة', accuracyLabel: 'الدقة على مستوى المؤسسة',
    sectionVocabulary: 'المفردات', newWordsLabel: 'الكلمات المضافة هذه الفترة (الإجمالي)',
    sectionTopLearners: 'الأعضاء الأكثر نشاطًا', noTopLearnersLabel: 'لم يكتسب أي عضو XP بعد في هذه الفترة.', xpUnit: 'XP',
    sectionWeakTopics: 'أضعف المواضيع على مستوى المؤسسة', noWeakTopicsLabel: 'لا توجد بيانات كافية بعد.', attemptsUnit: 'محاولة',
    sectionBadges: 'الأوسمة', badgesEarnedLabel: 'الأوسمة المكتسبة هذه الفترة (إجمالي المؤسسة)',
  },
  ru: {
    title: 'Отчёт организации', subtitle: 'Общий прогресс твоей организации за этот период по сравнению с предыдущим.',
    weekTab: 'Эта неделя', monthTab: 'Этот месяц',
    loading: 'Загрузка…', error: 'Не удалось загрузить отчёт.',
    forbiddenError: 'Чтобы увидеть этот отчёт, нужно быть менеджером организации.',
    retryBtn: 'Повторить', newLabel: 'Новое',
    memberCountLabel: 'Всего участников', activeMemberCountLabel: 'Активные участники за этот период',
    sectionStudy: 'Время учёбы', minutesLabel: 'минут (всего по организации)', sessionsLabel: 'сессий',
    sectionAccuracy: 'Точность', accuracyLabel: 'Точность по всей организации',
    sectionVocabulary: 'Словарный запас', newWordsLabel: 'Слов добавлено за этот период (всего)',
    sectionTopLearners: 'Самые активные участники', noTopLearnersLabel: 'Пока ни один участник не заработал XP за этот период.', xpUnit: 'XP',
    sectionWeakTopics: 'Самые слабые темы по организации', noWeakTopicsLabel: 'Пока недостаточно данных.', attemptsUnit: 'попыток',
    sectionBadges: 'Значки', badgesEarnedLabel: 'Значков получено за этот период (всего по организации)',
  },
  ja: {
    title: '組織レポート', subtitle: '前期間と比較した、あなたの組織全体の今期の進捗。',
    weekTab: '今週', monthTab: '今月',
    loading: '読み込み中…', error: 'レポートを読み込めませんでした。',
    forbiddenError: 'このレポートを見るには組織の管理者である必要があります。',
    retryBtn: '再試行', newLabel: '新規',
    memberCountLabel: '総メンバー数', activeMemberCountLabel: '今期のアクティブメンバー',
    sectionStudy: '学習時間', minutesLabel: '分（組織合計）', sessionsLabel: 'セッション',
    sectionAccuracy: '正答率', accuracyLabel: '組織全体の正答率',
    sectionVocabulary: '語彙', newWordsLabel: '今期追加された単語（合計）',
    sectionTopLearners: '最も活発なメンバー', noTopLearnersLabel: '今期まだXPを獲得したメンバーはいません。', xpUnit: 'XP',
    sectionWeakTopics: '組織全体の弱いトピック', noWeakTopicsLabel: 'まだ十分なデータがありません。', attemptsUnit: '回',
    sectionBadges: 'バッジ', badgesEarnedLabel: '今期獲得したバッジ（組織合計）',
  },
  pt: {
    title: 'Relatório da Organização', subtitle: 'O progresso geral da tua organização neste período, em comparação com o anterior.',
    weekTab: 'Esta Semana', monthTab: 'Este Mês',
    loading: 'A carregar…', error: 'Não foi possível carregar o relatório.',
    forbiddenError: 'Precisas de ser administrador da organização para ver este relatório.',
    retryBtn: 'Tentar novamente', newLabel: 'Novo',
    memberCountLabel: 'Total de membros', activeMemberCountLabel: 'Membros ativos neste período',
    sectionStudy: 'Tempo de Estudo', minutesLabel: 'minutos (total da organização)', sessionsLabel: 'sessões',
    sectionAccuracy: 'Taxa de Precisão', accuracyLabel: 'Precisão em toda a organização',
    sectionVocabulary: 'Vocabulário', newWordsLabel: 'Palavras adicionadas neste período (total)',
    sectionTopLearners: 'Membros Mais Ativos', noTopLearnersLabel: 'Ainda nenhum membro ganhou XP neste período.', xpUnit: 'XP',
    sectionWeakTopics: 'Tópicos Mais Fracos da Organização', noWeakTopicsLabel: 'Ainda não há dados suficientes.', attemptsUnit: 'tentativas',
    sectionBadges: 'Insígnias', badgesEarnedLabel: 'Insígnias conquistadas neste período (total da organização)',
  },
};
