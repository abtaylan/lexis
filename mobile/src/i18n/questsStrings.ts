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
  milestoneHint: string;
  lockedHint: string;
};

export const QUESTS_STRINGS: Record<Locale, QuestsStrings> = {
  tr: {
    title: 'Görev Haritası', subtitle: 'Dünyaları sırayla keşfet, XP ve rozet kazan.',
    error: 'Bir şeyler ters gitti.', empty: 'Henüz görev tanımlanmamış.',
    completedLabel: 'Tamamlandı', lockedLabel: 'Kilitli', rewardLabel: 'Ödül', badgeRewardLabel: 'rozet',
    startBtn: 'Başla', continueBtn: 'Devam Et',
    milestoneHint: 'Bu bir kilometre taşı — otomatik olarak ilerler. Kelime çalışarak, oyun oynayarak veya düello yaparak XP kazan!', lockedHint: 'Bu görev kilitli. Önce önceki görevleri tamamlaman gerekiyor.',
  },
  en: {
    title: 'Quest Map', subtitle: 'Explore each world in order to earn XP and badges.',
    error: 'Something went wrong.', empty: 'No quests defined yet.',
    completedLabel: 'Completed', lockedLabel: 'Locked', rewardLabel: 'Reward', badgeRewardLabel: 'badge',
    startBtn: 'Start', continueBtn: 'Continue',
    milestoneHint: 'This is a milestone — it progresses automatically. Earn XP by studying words, playing games, or dueling!', lockedHint: 'This quest is locked. Complete the previous quests first.',
  },
  de: {
    title: 'Aufgabenkarte', subtitle: 'Entdecke jede Welt der Reihe nach, um XP und Abzeichen zu verdienen.',
    error: 'Etwas ist schiefgelaufen.', empty: 'Noch keine Aufgaben definiert.',
    completedLabel: 'Abgeschlossen', lockedLabel: 'Gesperrt', rewardLabel: 'Belohnung', badgeRewardLabel: 'Abzeichen',
    startBtn: 'Starten', continueBtn: 'Weiter',
    milestoneHint: 'Dies ist ein Meilenstein — er schreitet automatisch voran. Verdiene XP, indem du Wörter lernst, Spiele spielst oder duellierst!', lockedHint: 'Diese Aufgabe ist gesperrt. Schließe zuerst die vorherigen Aufgaben ab.',
  },
  fr: {
    title: 'Carte des Quêtes', subtitle: 'Explore chaque monde dans l’ordre pour gagner XP et badges.',
    error: "Une erreur s'est produite.", empty: 'Aucune quête définie pour le moment.',
    completedLabel: 'Terminée', lockedLabel: 'Verrouillée', rewardLabel: 'Récompense', badgeRewardLabel: 'badge',
    startBtn: 'Démarrer', continueBtn: 'Continuer',
    milestoneHint: 'Ceci est une étape — elle progresse automatiquement. Gagne de l’XP en étudiant des mots, en jouant ou en duel !', lockedHint: 'Cette quête est verrouillée. Termine d’abord les quêtes précédentes.',
  },
  es: {
    title: 'Mapa de Misiones', subtitle: 'Explora cada mundo en orden para ganar XP e insignias.',
    error: 'Algo salió mal.', empty: 'Todavía no hay misiones definidas.',
    completedLabel: 'Completada', lockedLabel: 'Bloqueada', rewardLabel: 'Recompensa', badgeRewardLabel: 'insignia',
    startBtn: 'Empezar', continueBtn: 'Continuar',
    milestoneHint: 'Esto es un hito — avanza automáticamente. ¡Gana XP estudiando palabras, jugando o en duelos!', lockedHint: 'Esta misión está bloqueada. Completa primero las misiones anteriores.',
  },
  it: {
    title: 'Mappa delle Missioni', subtitle: 'Esplora ogni mondo in ordine per guadagnare XP e distintivi.',
    error: 'Qualcosa è andato storto.', empty: 'Nessuna missione definita al momento.',
    completedLabel: 'Completata', lockedLabel: 'Bloccata', rewardLabel: 'Ricompensa', badgeRewardLabel: 'distintivo',
    startBtn: 'Inizia', continueBtn: 'Continua',
    milestoneHint: 'Questo è un traguardo — avanza automaticamente. Guadagna XP studiando parole, giocando o in duello!', lockedHint: 'Questa missione è bloccata. Completa prima le missioni precedenti.',
  },
  ar: {
    title: 'خريطة المهام', subtitle: 'استكشف كل عالم بالترتيب لكسب نقاط الخبرة والأوسمة.',
    error: 'حدث خطأ ما.', empty: 'لا توجد مهام محددة بعد.',
    completedLabel: 'مكتملة', lockedLabel: 'مقفلة', rewardLabel: 'المكافأة', badgeRewardLabel: 'وسام',
    startBtn: 'ابدأ', continueBtn: 'متابعة',
    milestoneHint: 'هذا معلم بارز — يتقدم تلقائيًا. اكسب نقاط الخبرة بدراسة الكلمات أو اللعب أو المبارزة!', lockedHint: 'هذه المهمة مقفلة. أكمل المهام السابقة أولاً.',
  },
  ru: {
    title: 'Карта заданий', subtitle: 'Исследуй миры по порядку, чтобы получить XP и значки.',
    error: 'Что-то пошло не так.', empty: 'Задания пока не определены.',
    completedLabel: 'Выполнено', lockedLabel: 'Заблокировано', rewardLabel: 'Награда', badgeRewardLabel: 'значок',
    startBtn: 'Начать', continueBtn: 'Продолжить',
    milestoneHint: 'Это веха — она продвигается автоматически. Получай XP, изучая слова, играя или дуэлируя!', lockedHint: 'Это задание заблокировано. Сначала выполни предыдущие задания.',
  },
  ja: {
    title: 'クエストマップ', subtitle: '順番に世界を探検してXPとバッジを獲得しよう。',
    error: '問題が発生しました。', empty: 'まだクエストが定義されていません。',
    completedLabel: '完了', lockedLabel: 'ロック中', rewardLabel: '報酬', badgeRewardLabel: 'バッジ',
    startBtn: '始める', continueBtn: '続ける',
    milestoneHint: 'これはマイルストーンです。自動的に進みます。単語学習、ゲーム、デュエルでXPを獲得しよう!', lockedHint: 'このクエストはロックされています。先に前のクエストを完了してください。',
  },
  pt: {
    title: 'Mapa de Missões', subtitle: 'Explore cada mundo em ordem para ganhar XP e emblemas.',
    error: 'Algo deu errado.', empty: 'Nenhuma missão definida ainda.',
    completedLabel: 'Concluída', lockedLabel: 'Bloqueada', rewardLabel: 'Recompensa', badgeRewardLabel: 'emblema',
    startBtn: 'Começar', continueBtn: 'Continuar',
    milestoneHint: 'Este é um marco — avança automaticamente. Ganhe XP estudando palavras, jogando ou duelando!', lockedHint: 'Esta missão está bloqueada. Conclua as missões anteriores primeiro.',
  },
};
