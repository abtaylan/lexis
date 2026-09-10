// src/i18n/leagueStrings.ts — web'deki app/(app)/league/page.tsx içindeki
// yerel L + TIER_NAMES sözlüklerinden taşındı (10 dilin hepsi, web'deki
// profesyonel çeviriler birebir).
import type { Locale } from './locales';

export type LeagueStrings = {
  title: string;
  error: string;
  youLabel: string;
  xpLabel: string;
  empty: string;
  emptySub: string;
  promoteHint: string;
  demoteHint: string;
};

export const LEAGUE_STRINGS: Record<Locale, LeagueStrings> = {
  tr: {
    title: 'Lig', error: 'Bir şeyler ters gitti.',
    youLabel: 'sen', xpLabel: 'XP',
    empty: 'Henüz bir lig grubuna atanmadın.', emptySub: 'XP kazanmaya başladığında otomatik olarak eklenirsin.',
    promoteHint: 'İlk 3 → terfi', demoteHint: 'Son 3 → düşüş',
  },
  en: {
    title: 'League', error: 'Something went wrong.',
    youLabel: 'you', xpLabel: 'XP',
    empty: "You haven't been placed in a league group yet.", emptySub: "You'll be added automatically once you start earning XP.",
    promoteHint: 'Top 3 → promote', demoteHint: 'Bottom 3 → demote',
  },
  de: {
    title: 'Liga', error: 'Etwas ist schiefgelaufen.',
    youLabel: 'du', xpLabel: 'XP',
    empty: 'Du wurdest noch keiner Ligagruppe zugewiesen.', emptySub: 'Du wirst automatisch hinzugefügt, sobald du XP sammelst.',
    promoteHint: 'Top 3 → Aufstieg', demoteHint: 'Letzte 3 → Abstieg',
  },
  fr: {
    title: 'Ligue', error: "Une erreur s'est produite.",
    youLabel: 'toi', xpLabel: 'XP',
    empty: "Tu n'as pas encore été placé dans un groupe de ligue.", emptySub: 'Tu seras ajouté automatiquement dès que tu gagneras des XP.',
    promoteHint: 'Top 3 → promotion', demoteHint: 'Derniers 3 → relégation',
  },
  es: {
    title: 'Liga', error: 'Algo salió mal.',
    youLabel: 'tú', xpLabel: 'XP',
    empty: 'Todavía no te han asignado a un grupo de liga.', emptySub: 'Se te añadirá automáticamente en cuanto empieces a ganar XP.',
    promoteHint: 'Top 3 → ascenso', demoteHint: 'Últimos 3 → descenso',
  },
  it: {
    title: 'Lega', error: 'Qualcosa è andato storto.',
    youLabel: 'tu', xpLabel: 'XP',
    empty: 'Non sei ancora stato assegnato a un gruppo di lega.', emptySub: 'Sarai aggiunto automaticamente non appena inizierai a guadagnare XP.',
    promoteHint: 'Top 3 → promozione', demoteHint: 'Ultimi 3 → retrocessione',
  },
  ar: {
    title: 'الدوري', error: 'حدث خطأ ما.',
    youLabel: 'أنت', xpLabel: 'XP',
    empty: 'لم يتم تعيينك بعد إلى مجموعة دوري.', emptySub: 'سيتم إضافتك تلقائياً بمجرد أن تبدأ بكسب نقاط الخبرة.',
    promoteHint: 'أفضل 3 → ترقية', demoteHint: 'آخر 3 → هبوط',
  },
  ru: {
    title: 'Лига', error: 'Что-то пошло не так.',
    youLabel: 'ты', xpLabel: 'XP',
    empty: 'Ты ещё не попал в группу лиги.', emptySub: 'Ты будешь добавлен автоматически, как только начнёшь получать XP.',
    promoteHint: 'Топ-3 → повышение', demoteHint: 'Последние 3 → понижение',
  },
  ja: {
    title: 'リーグ', error: '問題が発生しました。',
    youLabel: 'あなた', xpLabel: 'XP',
    empty: 'まだリーググループに配属されていません。', emptySub: 'XPを獲得し始めると自動的に追加されます。',
    promoteHint: '上位3人 → 昇格', demoteHint: '下位3人 → 降格',
  },
  pt: {
    title: 'Liga', error: 'Algo deu errado.',
    youLabel: 'você', xpLabel: 'XP',
    empty: 'Você ainda não foi colocado em um grupo de liga.', emptySub: 'Você será adicionado automaticamente assim que começar a ganhar XP.',
    promoteHint: 'Top 3 → promoção', demoteHint: 'Últimos 3 → rebaixamento',
  },
};

// migration 041_leagues_schema.sql'deki 6 sabit kademeyle birebir eşleşir
// (slug -> tier_index: bronze=0 ... master=5). Yeni bir kademe eklenirse
// HEM o migration'a HEM buraya (HEM web'deki aynı adlı tabloya) eklenmeli.
export const LEAGUE_TIER_NAMES: Record<Locale, Record<string, string>> = {
  tr: { bronze: 'Bronz', silver: 'Gümüş', gold: 'Altın', platinum: 'Platin', diamond: 'Elmas', master: 'Usta' },
  en: { bronze: 'Bronze', silver: 'Silver', gold: 'Gold', platinum: 'Platinum', diamond: 'Diamond', master: 'Master' },
  de: { bronze: 'Bronze', silver: 'Silber', gold: 'Gold', platinum: 'Platin', diamond: 'Diamant', master: 'Meister' },
  fr: { bronze: 'Bronze', silver: 'Argent', gold: 'Or', platinum: 'Platine', diamond: 'Diamant', master: 'Maître' },
  es: { bronze: 'Bronce', silver: 'Plata', gold: 'Oro', platinum: 'Platino', diamond: 'Diamante', master: 'Maestro' },
  it: { bronze: 'Bronzo', silver: 'Argento', gold: 'Oro', platinum: 'Platino', diamond: 'Diamante', master: 'Maestro' },
  ar: { bronze: 'برونزي', silver: 'فضي', gold: 'ذهبي', platinum: 'بلاتيني', diamond: 'ماسي', master: 'أستاذ' },
  ru: { bronze: 'Бронза', silver: 'Серебро', gold: 'Золото', platinum: 'Платина', diamond: 'Алмаз', master: 'Мастер' },
  ja: { bronze: 'ブロンズ', silver: 'シルバー', gold: 'ゴールド', platinum: 'プラチナ', diamond: 'ダイヤモンド', master: 'マスター' },
  pt: { bronze: 'Bronze', silver: 'Prata', gold: 'Ouro', platinum: 'Platina', diamond: 'Diamante', master: 'Mestre' },
};
