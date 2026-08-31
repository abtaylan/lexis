// src/i18n/dashboardStrings.ts — web'deki XPBar.tsx (XP_LABELS) ve
// Leaderboard.tsx (LB_LABELS) yerel sözlüklerinden birebir taşındı.
import type { Locale } from './locales';

export const XP_LABELS: Record<Locale, { level: string; toNextLevel: string }> = {
  tr: { level: 'Seviye', toNextLevel: 'sonraki seviyeye' },
  en: { level: 'Level', toNextLevel: 'to next level' },
  de: { level: 'Level', toNextLevel: 'bis zum nächsten Level' },
  fr: { level: 'Niveau', toNextLevel: "jusqu'au niveau suivant" },
  es: { level: 'Nivel', toNextLevel: 'para el siguiente nivel' },
  it: { level: 'Livello', toNextLevel: 'al prossimo livello' },
  ar: { level: 'المستوى', toNextLevel: 'للمستوى التالي' },
  ru: { level: 'Уровень', toNextLevel: 'до следующего уровня' },
  ja: { level: 'レベル', toNextLevel: '次のレベルまで' },
  pt: { level: 'Nível', toNextLevel: 'para o próximo nível' },
};

export const LB_LABELS: Record<
  Locale,
  { title: string; tabAll: string; tabWeekly: string; tabMonthly: string; you: string; points: string; empty: string; loading: string; error: string }
> = {
  tr: { title: 'Sıralama', tabAll: 'Genel', tabWeekly: 'Haftalık', tabMonthly: 'Aylık', you: 'Sen', points: 'puan', empty: 'Bu dönemde henüz kimse puan kazanmamış.', loading: 'Yükleniyor…', error: 'Sıralama yüklenemedi.' },
  en: { title: 'Leaderboard', tabAll: 'Overall', tabWeekly: 'Weekly', tabMonthly: 'Monthly', you: 'You', points: 'pts', empty: 'No one has scored yet this period.', loading: 'Loading…', error: 'Could not load the leaderboard.' },
  de: { title: 'Bestenliste', tabAll: 'Gesamt', tabWeekly: 'Wöchentlich', tabMonthly: 'Monatlich', you: 'Du', points: 'Pkt.', empty: 'In diesem Zeitraum hat noch niemand Punkte erzielt.', loading: 'Lädt…', error: 'Bestenliste konnte nicht geladen werden.' },
  fr: { title: 'Classement', tabAll: 'Général', tabWeekly: 'Hebdomadaire', tabMonthly: 'Mensuel', you: 'Toi', points: 'pts', empty: "Personne n'a encore marqué de points cette période.", loading: 'Chargement…', error: "Le classement n'a pas pu être chargé." },
  es: { title: 'Clasificación', tabAll: 'General', tabWeekly: 'Semanal', tabMonthly: 'Mensual', you: 'Tú', points: 'pts', empty: 'Nadie ha sumado puntos todavía en este período.', loading: 'Cargando…', error: 'No se pudo cargar la clasificación.' },
  it: { title: 'Classifica', tabAll: 'Generale', tabWeekly: 'Settimanale', tabMonthly: 'Mensile', you: 'Tu', points: 'pt', empty: 'Nessuno ha ancora ottenuto punti in questo periodo.', loading: 'Caricamento…', error: 'Impossibile caricare la classifica.' },
  ar: { title: 'لوحة المتصدرين', tabAll: 'عام', tabWeekly: 'أسبوعي', tabMonthly: 'شهري', you: 'أنت', points: 'نقطة', empty: 'لم يسجّل أحد نقاطًا بعد في هذه الفترة.', loading: 'جارٍ التحميل…', error: 'تعذّر تحميل لوحة المتصدرين.' },
  ru: { title: 'Рейтинг', tabAll: 'Общий', tabWeekly: 'Неделя', tabMonthly: 'Месяц', you: 'Вы', points: 'очк.', empty: 'В этом периоде пока никто не набрал очков.', loading: 'Загрузка…', error: 'Не удалось загрузить рейтинг.' },
  ja: { title: 'ランキング', tabAll: '総合', tabWeekly: '週間', tabMonthly: '月間', you: 'あなた', points: 'pt', empty: 'この期間はまだ誰もポイントを獲得していません。', loading: '読み込み中…', error: 'ランキングを読み込めませんでした。' },
  pt: { title: 'Classificação', tabAll: 'Geral', tabWeekly: 'Semanal', tabMonthly: 'Mensal', you: 'Tu', points: 'pts', empty: 'Ainda ninguém pontuou neste período.', loading: 'A carregar…', error: 'Não foi possível carregar a classificação.' },
};

// web'deki components/layout/BadgeShowcase.tsx BADGE_LABELS ile birebir aynı.
export const BADGE_LABELS: Record<Locale, { title: string; empty: string; loading: string }> = {
  tr: { title: 'Rozetlerim', empty: 'Henüz rozet kazanmadın — çalışmaya devam!', loading: 'Yükleniyor…' },
  en: { title: 'My Badges', empty: "You haven't earned a badge yet — keep going!", loading: 'Loading…' },
  de: { title: 'Meine Abzeichen', empty: 'Du hast noch kein Abzeichen verdient — mach weiter!', loading: 'Lädt…' },
  fr: { title: 'Mes badges', empty: "Tu n'as pas encore gagné de badge — continue !", loading: 'Chargement…' },
  es: { title: 'Mis insignias', empty: 'Aún no has ganado ninguna insignia — ¡sigue así!', loading: 'Cargando…' },
  it: { title: 'I miei badge', empty: 'Non hai ancora guadagnato un badge — continua così!', loading: 'Caricamento…' },
  ar: { title: 'أوسمتي', empty: 'لم تحصل على وسام بعد — واصل التقدم!', loading: 'جارٍ التحميل…' },
  ru: { title: 'Мои значки', empty: 'Вы ещё не заработали значок — продолжайте!', loading: 'Загрузка…' },
  ja: { title: 'マイバッジ', empty: 'まだバッジを獲得していません — がんばって!', loading: '読み込み中…' },
  pt: { title: 'As Minhas Insígnias', empty: 'Ainda não ganhaste nenhuma insígnia — continua!', loading: 'A carregar…' },
};
