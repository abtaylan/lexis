// src/i18n/questsStrings.ts — web'deki app/(app)/quests/page.tsx içindeki
// yerel L sözlüğünden taşındı (10 dilin hepsi, web'deki profesyonel
// çeviriler birebir).
import type { Locale } from './locales';

export type QuestsStrings = {
  title: string;
  subtitle: string;
  error: string;
  empty: string;
  completedLabel: string;
  lockedLabel: string;
  rewardLabel: string;
  badgeRewardLabel: string;
  startBtn: string;
  continueBtn: string;
};

export const QUESTS_STRINGS: Record<Locale, QuestsStrings> = {
  tr: {
    title: 'Görev Haritası', subtitle: 'Dünyaları sırayla keşfet, XP ve rozet kazan.',
    error: 'Bir şeyler ters gitti.', empty: 'Henüz görev tanımlanmamış.',
    completedLabel: 'Tamamlandı', lockedLabel: 'Kilitli', rewardLabel: 'Ödül', badgeRewardLabel: 'rozet',
    startBtn: 'Başla', continueBtn: 'Devam Et',
  },
  en: {
    title: 'Quest Map', subtitle: 'Explore each world in order to earn XP and badges.',
    error: 'Something went wrong.', empty: 'No quests defined yet.',
    completedLabel: 'Completed', lockedLabel: 'Locked', rewardLabel: 'Reward', badgeRewardLabel: 'badge',
    startBtn: 'Start', continueBtn: 'Continue',
  },
  de: {
    title: 'Aufgabenkarte', subtitle: 'Entdecke jede Welt der Reihe nach, um XP und Abzeichen zu verdienen.',
    error: 'Etwas ist schiefgelaufen.', empty: 'Noch keine Aufgaben definiert.',
    completedLabel: 'Abgeschlossen', lockedLabel: 'Gesperrt', rewardLabel: 'Belohnung', badgeRewardLabel: 'Abzeichen',
    startBtn: 'Starten', continueBtn: 'Weiter',
  },
  fr: {
    title: 'Carte des Quêtes', subtitle: 'Explore chaque monde dans l’ordre pour gagner XP et badges.',
    error: "Une erreur s'est produite.", empty: 'Aucune quête définie pour le moment.',
    completedLabel: 'Terminée', lockedLabel: 'Verrouillée', rewardLabel: 'Récompense', badgeRewardLabel: 'badge',
    startBtn: 'Démarrer', continueBtn: 'Continuer',
  },
  es: {
    title: 'Mapa de Misiones', subtitle: 'Explora cada mundo en orden para ganar XP e insignias.',
    error: 'Algo salió mal.', empty: 'Todavía no hay misiones definidas.',
    completedLabel: 'Completada', lockedLabel: 'Bloqueada', rewardLabel: 'Recompensa', badgeRewardLabel: 'insignia',
    startBtn: 'Empezar', continueBtn: 'Continuar',
  },
  it: {
    title: 'Mappa delle Missioni', subtitle: 'Esplora ogni mondo in ordine per guadagnare XP e distintivi.',
    error: 'Qualcosa è andato storto.', empty: 'Nessuna missione definita al momento.',
    completedLabel: 'Completata', lockedLabel: 'Bloccata', rewardLabel: 'Ricompensa', badgeRewardLabel: 'distintivo',
    startBtn: 'Inizia', continueBtn: 'Continua',
  },
  ar: {
    title: 'خريطة المهام', subtitle: 'استكشف كل عالم بالترتيب لكسب نقاط الخبرة والأوسمة.',
    error: 'حدث خطأ ما.', empty: 'لا توجد مهام محددة بعد.',
    completedLabel: 'مكتملة', lockedLabel: 'مقفلة', rewardLabel: 'المكافأة', badgeRewardLabel: 'وسام',
    startBtn: 'ابدأ', continueBtn: 'متابعة',
  },
  ru: {
    title: 'Карта заданий', subtitle: 'Исследуй миры по порядку, чтобы получить XP и значки.',
    error: 'Что-то пошло не так.', empty: 'Задания пока не определены.',
    completedLabel: 'Выполнено', lockedLabel: 'Заблокировано', rewardLabel: 'Награда', badgeRewardLabel: 'значок',
    startBtn: 'Начать', continueBtn: 'Продолжить',
  },
  ja: {
    title: 'クエストマップ', subtitle: '順番に世界を探検してXPとバッジを獲得しよう。',
    error: '問題が発生しました。', empty: 'まだクエストが定義されていません。',
    completedLabel: '完了', lockedLabel: 'ロック中', rewardLabel: '報酬', badgeRewardLabel: 'バッジ',
    startBtn: '始める', continueBtn: '続ける',
  },
  pt: {
    title: 'Mapa de Missões', subtitle: 'Explore cada mundo em ordem para ganhar XP e emblemas.',
    error: 'Algo deu errado.', empty: 'Nenhuma missão definida ainda.',
    completedLabel: 'Concluída', lockedLabel: 'Bloqueada', rewardLabel: 'Recompensa', badgeRewardLabel: 'emblema',
    startBtn: 'Começar', continueBtn: 'Continuar',
  },
};
