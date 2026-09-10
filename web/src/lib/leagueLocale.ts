// src/lib/leagueLocale.ts — Lig sayfaları (app/(app)/league/page.tsx +
// app/(app)/league/[id]/page.tsx) arasında paylaşılan yerel metinler ve
// yardımcılar. Faz 3f (10 Eylül 2026): "Lig sayfasına girince tüm
// ligleri listele, lige tıklayınca o ligin içindeki user'ları sıralamayı
// puan durumunu falan göreyim" isteğiyle detay sayfası eklenince,
// tekrarlanan L/TIER_NAMES sözlüğünün tek kaynağı burası oldu.
import type { Locale } from '@/lib/i18n';

// migration 041_leagues_schema.sql'deki 6 sabit kademeyle birebir eşleşir
// (slug -> tier_index: bronze=0 ... master=5). Yeni bir kademe eklenirse
// HEM o migration'a HEM buraya eklenmeli.
export const TIER_NAMES: Record<Locale, Record<string, string>> = {
  tr: { bronze: 'Bronz', silver: 'Gümüş', gold: 'Altın', platinum: 'Platin', diamond: 'Elmas', master: 'Usta', iron: 'Demir', emerald: 'Zümrüt', ruby: 'Yakut', grandmaster: 'Üstat', champion: 'Şampiyon', legend: 'Efsane' },
  en: { bronze: 'Bronze', silver: 'Silver', gold: 'Gold', platinum: 'Platinum', diamond: 'Diamond', master: 'Master', iron: 'Iron', emerald: 'Emerald', ruby: 'Ruby', grandmaster: 'Grandmaster', champion: 'Champion', legend: 'Legend' },
  de: { bronze: 'Bronze', silver: 'Silber', gold: 'Gold', platinum: 'Platin', diamond: 'Diamant', master: 'Meister', iron: 'Eisen', emerald: 'Smaragd', ruby: 'Rubin', grandmaster: 'Großmeister', champion: 'Champion', legend: 'Legende' },
  fr: { bronze: 'Bronze', silver: 'Argent', gold: 'Or', platinum: 'Platine', diamond: 'Diamant', master: 'Maître', iron: 'Fer', emerald: 'Émeraude', ruby: 'Rubis', grandmaster: 'Grand Maître', champion: 'Champion', legend: 'Légende' },
  es: { bronze: 'Bronce', silver: 'Plata', gold: 'Oro', platinum: 'Platino', diamond: 'Diamante', master: 'Maestro', iron: 'Hierro', emerald: 'Esmeralda', ruby: 'Rubí', grandmaster: 'Gran Maestro', champion: 'Campeón', legend: 'Leyenda' },
  it: { bronze: 'Bronzo', silver: 'Argento', gold: 'Oro', platinum: 'Platino', diamond: 'Diamante', master: 'Maestro', iron: 'Ferro', emerald: 'Smeraldo', ruby: 'Rubino', grandmaster: 'Gran Maestro', champion: 'Campione', legend: 'Leggenda' },
  ar: { bronze: 'برونزي', silver: 'فضي', gold: 'ذهبي', platinum: 'بلاتيني', diamond: 'ماسي', master: 'أستاذ', iron: 'حديدي', emerald: 'زمردي', ruby: 'ياقوتي', grandmaster: 'أستاذ كبير', champion: 'بطل', legend: 'أسطورة' },
  ru: { bronze: 'Бронза', silver: 'Серебро', gold: 'Золото', platinum: 'Платина', diamond: 'Алмаз', master: 'Мастер', iron: 'Железо', emerald: 'Изумруд', ruby: 'Рубин', grandmaster: 'Грандмастер', champion: 'Чемпион', legend: 'Легенда' },
  ja: { bronze: 'ブロンズ', silver: 'シルバー', gold: 'ゴールド', platinum: 'プラチナ', diamond: 'ダイヤモンド', master: 'マスター', iron: 'アイアン', emerald: 'エメラルド', ruby: 'ルビー', grandmaster: 'グランドマスター', champion: 'チャンピオン', legend: 'レジェンド' },
  pt: { bronze: 'Bronze', silver: 'Prata', gold: 'Ouro', platinum: 'Platina', diamond: 'Diamante', master: 'Mestre', iron: 'Ferro', emerald: 'Esmeralda', ruby: 'Rubi', grandmaster: 'Grão-Mestre', champion: 'Campeão', legend: 'Lenda' },
};

export const LEAGUE_L: Record<Locale, Record<string, string>> = {
  tr: {
    title: 'Lig', subtitleWeek: 'hafta',
    loading: 'Yükleniyor…', error: 'Bir şeyler ters gitti.', refreshBtn: 'Yenile',
    youLabel: 'sen', xpLabel: 'XP', rankLabel: 'Sıra', userLabel: 'Kullanıcı',
    empty: 'Henüz bir lig grubuna atanmadın.', emptySub: 'XP kazanmaya başladığında otomatik olarak eklenirsin.',
    promoteHint: 'Terfi bölgesi', demoteHint: 'Düşme bölgesi',
    allLeaguesTitle: 'Tüm Ligler', membersSuffix: 'üye', groupLabel: 'Grup', yourGroupBadge: 'Senin Ligin',
    backBtn: 'Lige Dön', detailError: 'Bu lig grubu bulunamadı.', prevLeagueLabel: 'Alt Lig', nextLeagueLabel: 'Üst Lig',
    gamesWonLabel: 'Oyun', duelsWonLabel: 'Düello', flashcardsLabel: 'Kartlar',
    customLeaguesBtn: 'Özel Ligler',
  },
  en: {
    title: 'League', subtitleWeek: 'week',
    loading: 'Loading…', error: 'Something went wrong.', refreshBtn: 'Refresh',
    youLabel: 'you', xpLabel: 'XP', rankLabel: 'Rank', userLabel: 'User',
    empty: "You haven't been placed in a league group yet.", emptySub: "You'll be added automatically once you start earning XP.",
    promoteHint: 'Promotion zone', demoteHint: 'Relegation zone',
    allLeaguesTitle: 'All Leagues', membersSuffix: 'members', groupLabel: 'Group', yourGroupBadge: 'Your League',
    backBtn: 'Back to League', detailError: 'This league group could not be found.', prevLeagueLabel: 'Lower League', nextLeagueLabel: 'Upper League',
    gamesWonLabel: 'Games', duelsWonLabel: 'Duels', flashcardsLabel: 'Cards',
    customLeaguesBtn: 'Custom Leagues',
  },
  de: {
    title: 'Liga', subtitleWeek: 'Woche',
    loading: 'Wird geladen…', error: 'Etwas ist schiefgelaufen.', refreshBtn: 'Aktualisieren',
    youLabel: 'du', xpLabel: 'XP', rankLabel: 'Rang', userLabel: 'Benutzer',
    empty: 'Du wurdest noch keiner Ligagruppe zugewiesen.', emptySub: 'Du wirst automatisch hinzugefügt, sobald du XP sammelst.',
    promoteHint: 'Aufstiegszone', demoteHint: 'Abstiegszone',
    allLeaguesTitle: 'Alle Ligen', membersSuffix: 'Mitglieder', groupLabel: 'Gruppe', yourGroupBadge: 'Deine Liga',
    backBtn: 'Zurück zur Liga', detailError: 'Diese Ligagruppe wurde nicht gefunden.', prevLeagueLabel: 'Niedrigere Liga', nextLeagueLabel: 'Höhere Liga',
    gamesWonLabel: 'Spiele', duelsWonLabel: 'Duelle', flashcardsLabel: 'Karten',
    customLeaguesBtn: 'Eigene Ligen',
  },
  fr: {
    title: 'Ligue', subtitleWeek: 'semaine',
    loading: 'Chargement…', error: "Une erreur s'est produite.", refreshBtn: 'Actualiser',
    youLabel: 'toi', xpLabel: 'XP', rankLabel: 'Rang', userLabel: 'Utilisateur',
    empty: "Tu n'as pas encore été placé dans un groupe de ligue.", emptySub: 'Tu seras ajouté automatiquement dès que tu gagneras des XP.',
    promoteHint: 'Zone de promotion', demoteHint: 'Zone de relégation',
    allLeaguesTitle: 'Toutes les Ligues', membersSuffix: 'membres', groupLabel: 'Groupe', yourGroupBadge: 'Ta Ligue',
    backBtn: 'Retour à la ligue', detailError: "Ce groupe de ligue est introuvable.", prevLeagueLabel: 'Ligue inférieure', nextLeagueLabel: 'Ligue supérieure',
    gamesWonLabel: 'Jeux', duelsWonLabel: 'Duels', flashcardsLabel: 'Cartes',
    customLeaguesBtn: 'Ligues personnalisées',
  },
  es: {
    title: 'Liga', subtitleWeek: 'semana',
    loading: 'Cargando…', error: 'Algo salió mal.', refreshBtn: 'Actualizar',
    youLabel: 'tú', xpLabel: 'XP', rankLabel: 'Puesto', userLabel: 'Usuario',
    empty: 'Todavía no te han asignado a un grupo de liga.', emptySub: 'Se te añadirá automáticamente en cuanto empieces a ganar XP.',
    promoteHint: 'Zona de ascenso', demoteHint: 'Zona de descenso',
    allLeaguesTitle: 'Todas las Ligas', membersSuffix: 'miembros', groupLabel: 'Grupo', yourGroupBadge: 'Tu Liga',
    backBtn: 'Volver a la liga', detailError: 'No se encontró este grupo de liga.', prevLeagueLabel: 'Liga inferior', nextLeagueLabel: 'Liga superior',
    gamesWonLabel: 'Juegos', duelsWonLabel: 'Duelos', flashcardsLabel: 'Tarjetas',
    customLeaguesBtn: 'Ligas personalizadas',
  },
  it: {
    title: 'Lega', subtitleWeek: 'settimana',
    loading: 'Caricamento…', error: 'Qualcosa è andato storto.', refreshBtn: 'Aggiorna',
    youLabel: 'tu', xpLabel: 'XP', rankLabel: 'Posizione', userLabel: 'Utente',
    empty: 'Non sei ancora stato assegnato a un gruppo di lega.', emptySub: 'Sarai aggiunto automaticamente non appena inizierai a guadagnare XP.',
    promoteHint: 'Zona promozione', demoteHint: 'Zona retrocessione',
    allLeaguesTitle: 'Tutte le Leghe', membersSuffix: 'membri', groupLabel: 'Gruppo', yourGroupBadge: 'La Tua Lega',
    backBtn: 'Torna alla lega', detailError: 'Questo gruppo di lega non è stato trovato.', prevLeagueLabel: 'Lega inferiore', nextLeagueLabel: 'Lega superiore',
    gamesWonLabel: 'Giochi', duelsWonLabel: 'Duelli', flashcardsLabel: 'Schede',
    customLeaguesBtn: 'Leghe personalizzate',
  },
  ar: {
    title: 'الدوري', subtitleWeek: 'أسبوع',
    loading: 'جارٍ التحميل…', error: 'حدث خطأ ما.', refreshBtn: 'تحديث',
    youLabel: 'أنت', xpLabel: 'XP', rankLabel: 'الترتيب', userLabel: 'المستخدم',
    empty: 'لم يتم تعيينك بعد إلى مجموعة دوري.', emptySub: 'سيتم إضافتك تلقائياً بمجرد أن تبدأ بكسب نقاط الخبرة.',
    promoteHint: 'منطقة الترقية', demoteHint: 'منطقة الهبوط',
    allLeaguesTitle: 'كل الدوريات', membersSuffix: 'عضو', groupLabel: 'مجموعة', yourGroupBadge: 'دوريك',
    backBtn: 'العودة إلى الدوري', detailError: 'لم يتم العثور على مجموعة الدوري هذه.', prevLeagueLabel: 'الدوري الأدنى', nextLeagueLabel: 'الدوري الأعلى',
    gamesWonLabel: 'الألعاب', duelsWonLabel: 'المبارزات', flashcardsLabel: 'البطاقات',
    customLeaguesBtn: 'دوريات خاصة',
  },
  ru: {
    title: 'Лига', subtitleWeek: 'неделя',
    loading: 'Загрузка…', error: 'Что-то пошло не так.', refreshBtn: 'Обновить',
    youLabel: 'ты', xpLabel: 'XP', rankLabel: 'Место', userLabel: 'Пользователь',
    empty: 'Ты ещё не попал в группу лиги.', emptySub: 'Ты будешь добавлен автоматически, как только начнёшь получать XP.',
    promoteHint: 'Зона повышения', demoteHint: 'Зона понижения',
    allLeaguesTitle: 'Все Лиги', membersSuffix: 'участников', groupLabel: 'Группа', yourGroupBadge: 'Твоя Лига',
    backBtn: 'Назад к лиге', detailError: 'Эта группа лиги не найдена.', prevLeagueLabel: 'Лига ниже', nextLeagueLabel: 'Лига выше',
    gamesWonLabel: 'Игры', duelsWonLabel: 'Дуэли', flashcardsLabel: 'Карточки',
    customLeaguesBtn: 'Свои лиги',
  },
  ja: {
    title: 'リーグ', subtitleWeek: '週',
    loading: '読み込み中…', error: '問題が発生しました。', refreshBtn: '更新',
    youLabel: 'あなた', xpLabel: 'XP', rankLabel: '順位', userLabel: 'ユーザー',
    empty: 'まだリーググループに配属されていません。', emptySub: 'XPを獲得し始めると自動的に追加されます。',
    promoteHint: '昇格ゾーン', demoteHint: '降格ゾーン',
    allLeaguesTitle: 'すべてのリーグ', membersSuffix: '人', groupLabel: 'グループ', yourGroupBadge: 'あなたのリーグ',
    backBtn: 'リーグに戻る', detailError: 'このリーググループは見つかりませんでした。', prevLeagueLabel: '下位リーグ', nextLeagueLabel: '上位リーグ',
    gamesWonLabel: 'ゲーム', duelsWonLabel: 'デュエル', flashcardsLabel: 'カード',
    customLeaguesBtn: 'カスタムリーグ',
  },
  pt: {
    title: 'Liga', subtitleWeek: 'semana',
    loading: 'Carregando…', error: 'Algo deu errado.', refreshBtn: 'Atualizar',
    youLabel: 'você', xpLabel: 'XP', rankLabel: 'Posição', userLabel: 'Usuário',
    empty: 'Você ainda não foi colocado em um grupo de liga.', emptySub: 'Você será adicionado automaticamente assim que começar a ganhar XP.',
    promoteHint: 'Zona de promoção', demoteHint: 'Zona de rebaixamento',
    allLeaguesTitle: 'Todas as Ligas', membersSuffix: 'membros', groupLabel: 'Grupo', yourGroupBadge: 'Sua Liga',
    backBtn: 'Voltar à liga', detailError: 'Este grupo de liga não foi encontrado.', prevLeagueLabel: 'Liga inferior', nextLeagueLabel: 'Liga superior',
    gamesWonLabel: 'Jogos', duelsWonLabel: 'Duelos', flashcardsLabel: 'Cartões',
    customLeaguesBtn: 'Ligas personalizadas',
  },
};

// Faz 3 devamı (10 Eylül 2026 — "ligden çıkma ve düşme sıralaması...
// neye göre çıkıp düşecekler, süre mi ölçüt olacak"): haftanın ne
// kadar süre sonra kapanacağını (ve terfi/düşmenin işleneceğini)
// lokalize, insan-okunur şekilde gösterir. Gerçek kapanış mantığı
// bkz. backend/league_weekly_rollover.py (saatlik cron).
export function formatTimeRemaining(endIso: string, locale: Locale): string {
  try {
    const diffMs = new Date(endIso).getTime() - Date.now();
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
    if (diffMs <= 0) return rtf.format(0, 'hour');
    const diffMinutes = Math.round(diffMs / 60000);
    if (diffMinutes < 60) return rtf.format(diffMinutes, 'minute');
    const diffHours = Math.round(diffMs / 3600000);
    if (diffHours < 24) return rtf.format(diffHours, 'hour');
    const diffDays = Math.round(diffMs / 86400000);
    return rtf.format(diffDays, 'day');
  } catch {
    return '';
  }
}

export function formatDateRange(startIso: string, endIso: string, locale: Locale): string {
  try {
    const start = new Date(startIso);
    const end = new Date(endIso);
    const fmt = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' });
    return `${fmt.format(start)} – ${fmt.format(end)}`;
  } catch {
    return '';
  }
}
