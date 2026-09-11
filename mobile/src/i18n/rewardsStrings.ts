// src/i18n/rewardsStrings.ts — web'deki lib/rewardsLocale.ts ile birebir
// aynı çeviriler (10 dilin hepsi). app/(app)/rewards.tsx için.
import type { Locale } from './locales';

export type RewardsStrings = {
  title: string; subtitle: string;
  loading: string; error: string; retryBtn: string;
  earnedCountTpl: string;
  achievementsTab: string; titlesTab: string;
  lockedLabel: string; earnedLabel: string;
  section_quest: string; section_streak: string; section_duel: string;
  section_league: string; section_leaderboard: string; section_level: string;
  titlesEmpty: string;
  backBtn: string;
};

// badges.category değerleriyle birebir eşleşir (bkz. migration
// 063_badges_catalog_taxonomy.sql). quest_world, quest ile aynı görsel
// bölümde ("Görev Haritası") gösteriliyor.
export const CATEGORY_SECTION: Record<string, string> = {
  quest: 'quest',
  quest_world: 'quest',
  streak: 'streak',
  duel: 'duel',
  league: 'league',
  leaderboard: 'leaderboard',
  // kind='title' (Ödüller sekmesi) — bkz. migration 064_title_rewards.sql.
  level: 'level',
};

export const CATEGORY_ORDER = ['quest', 'streak', 'duel', 'league', 'leaderboard', 'level'];

export const REWARDS_STRINGS: Record<Locale, RewardsStrings> = {
  tr: {
    title: 'Rozetler ve Ödüller', subtitle: 'Kazandıkların ve kazanabileceklerin — hepsi burada.',
    loading: 'Yükleniyor…', error: 'Rozetler yüklenemedi.', retryBtn: 'Tekrar dene',
    earnedCountTpl: '{earned} / {total} kazanıldı',
    achievementsTab: 'Rozetler', titlesTab: 'Ödüller',
    lockedLabel: 'Kilitli', earnedLabel: 'Kazanıldı',
    section_quest: 'Görev Haritası', section_streak: 'Seri', section_duel: 'Düello',
    section_league: 'Lig', section_leaderboard: 'Sıralama', section_level: 'Seviye',
    titlesEmpty: 'Yakında — unvan ve kozmetik ödüller bu bölüme eklenecek.',
    backBtn: 'Geri',
  },
  en: {
    title: 'Badges and Rewards', subtitle: 'Everything you have earned — and everything you can.',
    loading: 'Loading…', error: 'Could not load badges.', retryBtn: 'Try again',
    earnedCountTpl: '{earned} / {total} earned',
    achievementsTab: 'Badges', titlesTab: 'Rewards',
    lockedLabel: 'Locked', earnedLabel: 'Earned',
    section_quest: 'Quest Map', section_streak: 'Streak', section_duel: 'Duel',
    section_league: 'League', section_leaderboard: 'Leaderboard', section_level: 'Level',
    titlesEmpty: 'Coming soon — titles and cosmetic rewards will appear here.',
    backBtn: 'Back',
  },
  de: {
    title: 'Abzeichen und Belohnungen', subtitle: 'Alles, was du verdient hast — und alles, was du noch verdienen kannst.',
    loading: 'Lädt…', error: 'Abzeichen konnten nicht geladen werden.', retryBtn: 'Erneut versuchen',
    earnedCountTpl: '{earned} / {total} verdient',
    achievementsTab: 'Abzeichen', titlesTab: 'Belohnungen',
    lockedLabel: 'Gesperrt', earnedLabel: 'Verdient',
    section_quest: 'Aufgabenkarte', section_streak: 'Serie', section_duel: 'Duell',
    section_league: 'Liga', section_leaderboard: 'Bestenliste', section_level: 'Level',
    titlesEmpty: 'Demnächst — Titel und kosmetische Belohnungen erscheinen hier.',
    backBtn: 'Zurück',
  },
  fr: {
    title: 'Badges et récompenses', subtitle: 'Tout ce que tu as gagné — et tout ce que tu peux encore gagner.',
    loading: 'Chargement…', error: 'Impossible de charger les badges.', retryBtn: 'Réessayer',
    earnedCountTpl: '{earned} / {total} obtenus',
    achievementsTab: 'Badges', titlesTab: 'Récompenses',
    lockedLabel: 'Verrouillé', earnedLabel: 'Obtenu',
    section_quest: 'Carte des Quêtes', section_streak: 'Série', section_duel: 'Duel',
    section_league: 'Ligue', section_leaderboard: 'Classement', section_level: 'Niveau',
    titlesEmpty: 'Bientôt disponible — les titres et récompenses cosmétiques arriveront ici.',
    backBtn: 'Retour',
  },
  es: {
    title: 'Insignias y recompensas', subtitle: 'Todo lo que has ganado, y todo lo que aún puedes ganar.',
    loading: 'Cargando…', error: 'No se pudieron cargar las insignias.', retryBtn: 'Reintentar',
    earnedCountTpl: '{earned} / {total} obtenidas',
    achievementsTab: 'Insignias', titlesTab: 'Recompensas',
    lockedLabel: 'Bloqueada', earnedLabel: 'Obtenida',
    section_quest: 'Mapa de Misiones', section_streak: 'Racha', section_duel: 'Duelo',
    section_league: 'Liga', section_leaderboard: 'Clasificación', section_level: 'Nivel',
    titlesEmpty: 'Próximamente — los títulos y recompensas cosméticas aparecerán aquí.',
    backBtn: 'Atrás',
  },
  it: {
    title: 'Badge e ricompense', subtitle: 'Tutto ciò che hai guadagnato — e tutto ciò che puoi ancora guadagnare.',
    loading: 'Caricamento…', error: 'Impossibile caricare i badge.', retryBtn: 'Riprova',
    earnedCountTpl: '{earned} / {total} ottenuti',
    achievementsTab: 'Badge', titlesTab: 'Ricompense',
    lockedLabel: 'Bloccato', earnedLabel: 'Ottenuto',
    section_quest: 'Mappa delle Missioni', section_streak: 'Serie', section_duel: 'Duello',
    section_league: 'Lega', section_leaderboard: 'Classifica', section_level: 'Livello',
    titlesEmpty: 'Prossimamente — titoli e ricompense cosmetiche appariranno qui.',
    backBtn: 'Indietro',
  },
  ar: {
    title: 'الأوسمة والمكافآت', subtitle: 'كل ما حصلت عليه — وكل ما يمكنك الحصول عليه بعد.',
    loading: 'جارٍ التحميل…', error: 'تعذر تحميل الأوسمة.', retryBtn: 'إعادة المحاولة',
    earnedCountTpl: '{earned} / {total} تم الحصول عليها',
    achievementsTab: 'الأوسمة', titlesTab: 'المكافآت',
    lockedLabel: 'مُقفل', earnedLabel: 'تم الحصول عليه',
    section_quest: 'خريطة المهام', section_streak: 'السلسلة', section_duel: 'المبارزة',
    section_league: 'الدوري', section_leaderboard: 'الترتيب', section_level: 'المستوى',
    titlesEmpty: 'قريباً — ستظهر الألقاب والمكافآت التجميلية هنا.',
    backBtn: 'رجوع',
  },
  ru: {
    title: 'Значки и награды', subtitle: 'Всё, что ты уже заработал, — и всё, что ещё можешь заработать.',
    loading: 'Загрузка…', error: 'Не удалось загрузить значки.', retryBtn: 'Повторить',
    earnedCountTpl: '{earned} / {total} получено',
    achievementsTab: 'Значки', titlesTab: 'Награды',
    lockedLabel: 'Заблокировано', earnedLabel: 'Получено',
    section_quest: 'Карта заданий', section_streak: 'Серия', section_duel: 'Дуэль',
    section_league: 'Лига', section_leaderboard: 'Таблица лидеров', section_level: 'Уровень',
    titlesEmpty: 'Скоро здесь появятся титулы и косметические награды.',
    backBtn: 'Назад',
  },
  ja: {
    title: 'バッジと報酬', subtitle: 'あなたが獲得したもの、そしてこれから獲得できるもの。',
    loading: '読み込み中…', error: 'バッジを読み込めませんでした。', retryBtn: '再試行',
    earnedCountTpl: '{earned} / {total} 個獲得',
    achievementsTab: 'バッジ', titlesTab: '報酬',
    lockedLabel: 'ロック中', earnedLabel: '獲得済み',
    section_quest: 'クエストマップ', section_streak: '連続記録', section_duel: 'デュエル',
    section_league: 'リーグ', section_leaderboard: 'ランキング', section_level: 'レベル',
    titlesEmpty: '近日公開 — 称号やコスメティック報酬がここに表示されます。',
    backBtn: '戻る',
  },
  pt: {
    title: 'Insígnias e Recompensas', subtitle: 'Tudo o que já ganhaste — e tudo o que ainda podes ganhar.',
    loading: 'A carregar…', error: 'Não foi possível carregar as insígnias.', retryBtn: 'Tentar novamente',
    earnedCountTpl: '{earned} / {total} conquistadas',
    achievementsTab: 'Insígnias', titlesTab: 'Recompensas',
    lockedLabel: 'Bloqueada', earnedLabel: 'Conquistada',
    section_quest: 'Mapa de Missões', section_streak: 'Sequência', section_duel: 'Duelo',
    section_league: 'Liga', section_leaderboard: 'Classificação', section_level: 'Nível',
    titlesEmpty: 'Em breve — títulos e recompensas cosméticas vão aparecer aqui.',
    backBtn: 'Voltar',
  },
};
