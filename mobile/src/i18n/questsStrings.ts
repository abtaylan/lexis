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
};

export const QUESTS_STRINGS: Record<Locale, QuestsStrings> = {
  tr: {
    title: 'Görev Haritası', subtitle: 'Sırayla tamamla, XP ve rozet kazan.',
    error: 'Bir şeyler ters gitti.', empty: 'Henüz görev tanımlanmamış.',
    completedLabel: 'Tamamlandı', lockedLabel: 'Kilitli', rewardLabel: 'Ödül', badgeRewardLabel: 'rozet',
  },
  en: {
    title: 'Quest Map', subtitle: 'Complete them in order to earn XP and badges.',
    error: 'Something went wrong.', empty: 'No quests defined yet.',
    completedLabel: 'Completed', lockedLabel: 'Locked', rewardLabel: 'Reward', badgeRewardLabel: 'badge',
  },
  de: {
    title: 'Aufgabenkarte', subtitle: 'Schließe sie der Reihe nach ab, um XP und Abzeichen zu verdienen.',
    error: 'Etwas ist schiefgelaufen.', empty: 'Noch keine Aufgaben definiert.',
    completedLabel: 'Abgeschlossen', lockedLabel: 'Gesperrt', rewardLabel: 'Belohnung', badgeRewardLabel: 'Abzeichen',
  },
  fr: {
    title: 'Carte des Quêtes', subtitle: 'Termine-les dans l’ordre pour gagner XP et badges.',
    error: "Une erreur s'est produite.", empty: 'Aucune quête définie pour le moment.',
    completedLabel: 'Terminée', lockedLabel: 'Verrouillée', rewardLabel: 'Récompense', badgeRewardLabel: 'badge',
  },
  es: {
    title: 'Mapa de Misiones', subtitle: 'Complétalas en orden para ganar XP e insignias.',
    error: 'Algo salió mal.', empty: 'Todavía no hay misiones definidas.',
    completedLabel: 'Completada', lockedLabel: 'Bloqueada', rewardLabel: 'Recompensa', badgeRewardLabel: 'insignia',
  },
  it: {
    title: 'Mappa delle Missioni', subtitle: 'Completale in ordine per guadagnare XP e distintivi.',
    error: 'Qualcosa è andato storto.', empty: 'Nessuna missione definita al momento.',
    completedLabel: 'Completata', lockedLabel: 'Bloccata', rewardLabel: 'Ricompensa', badgeRewardLabel: 'distintivo',
  },
  ar: {
    title: 'خريطة المهام', subtitle: 'أكملها بالترتيب لكسب نقاط الخبرة والأوسمة.',
    error: 'حدث خطأ ما.', empty: 'لا توجد مهام محددة بعد.',
    completedLabel: 'مكتملة', lockedLabel: 'مقفلة', rewardLabel: 'المكافأة', badgeRewardLabel: 'وسام',
  },
  ru: {
    title: 'Карта заданий', subtitle: 'Выполняй по порядку, чтобы получить XP и значки.',
    error: 'Что-то пошло не так.', empty: 'Задания пока не определены.',
    completedLabel: 'Выполнено', lockedLabel: 'Заблокировано', rewardLabel: 'Награда', badgeRewardLabel: 'значок',
  },
  ja: {
    title: 'クエストマップ', subtitle: '順番にクリアしてXPとバッジを獲得しよう。',
    error: '問題が発生しました。', empty: 'まだクエストが定義されていません。',
    completedLabel: '完了', lockedLabel: 'ロック中', rewardLabel: '報酬', badgeRewardLabel: 'バッジ',
  },
  pt: {
    title: 'Mapa de Missões', subtitle: 'Complete-as em ordem para ganhar XP e emblemas.',
    error: 'Algo deu errado.', empty: 'Nenhuma missão definida ainda.',
    completedLabel: 'Concluída', lockedLabel: 'Bloqueada', rewardLabel: 'Recompensa', badgeRewardLabel: 'emblema',
  },
};
