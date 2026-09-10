// src/i18n/duelsStrings.ts — web'deki app/(app)/duels/page.tsx +
// app/(app)/duels/[id]/page.tsx içindeki yerel L sözlüklerinden taşındı
// (10 dilin hepsi, web'deki profesyonel çeviriler birebir). examStrings.ts'teki
// gibi tek dosyada birden fazla ekran (lobi + oda) için tek bir sözlük tipi.
import type { Locale } from './locales';

export type DuelsStrings = {
  // ── Lobi (duels.tsx) ──
  title: string;
  subtitle: string;
  createBtn: string;
  error: string;
  empty: string;
  emptySub: string;
  playersLabel: string;
  joinBtn: string;

  // ── Oda — bekleme (duel-room.tsx) ──
  waitingTitle: string;
  waitingSub: string;
  startBtn: string;
  needMoreLabel: string;
  leaveBtn: string;
  hostOnlyLabel: string;

  // ── Oda — aktif tur ──
  roundLabel: string;
  answeredLabel: string;
  correctLabel: string;
  wrongLabel: string;
  correctAnswerPrefix: string;
  waitingRoundLabel: string;

  // ── Oda — bitiş ──
  finishedTitle: string;
  backToLobbyBtn: string;

  // ── Oda — ortak ──
  youLabel: string;
  scoreLabel: string;
};

export const DUELS_STRINGS: Record<Locale, DuelsStrings> = {
  tr: {
    title: 'Düello', subtitle: 'Aynı anda birden fazla kişiyle canlı kelime yarışması.',
    createBtn: 'Yeni Oda Aç', error: 'Bir şeyler ters gitti.',
    empty: 'Şu an bekleyen oda yok.', emptySub: 'İlk odayı sen aç!',
    playersLabel: 'oyuncu', joinBtn: 'Katıl',
    waitingTitle: 'Bekleme Odası', waitingSub: 'Diğer oyuncular bekleniyor…',
    startBtn: 'Başlat', needMoreLabel: 'Başlamak için en az 2 oyuncu gerekiyor.',
    leaveBtn: 'Odadan Ayrıl', hostOnlyLabel: 'Sadece oda sahibi başlatabilir.',
    roundLabel: 'Tur', answeredLabel: 'Cevap gönderildi, tur bekleniyor…',
    correctLabel: 'Doğru! 🎉', wrongLabel: 'Yanlış.', correctAnswerPrefix: 'Doğru cevap:',
    waitingRoundLabel: 'Sıradaki tur hazırlanıyor…',
    finishedTitle: 'Düello Bitti', backToLobbyBtn: 'Lobiye Dön',
    youLabel: '(sen)', scoreLabel: 'puan',
  },
  en: {
    title: 'Duel', subtitle: 'A live vocabulary competition with multiple players at once.',
    createBtn: 'Create Room', error: 'Something went wrong.',
    empty: 'No waiting rooms right now.', emptySub: 'Be the first to open one!',
    playersLabel: 'players', joinBtn: 'Join',
    waitingTitle: 'Waiting Room', waitingSub: 'Waiting for other players…',
    startBtn: 'Start', needMoreLabel: 'At least 2 players are needed to start.',
    leaveBtn: 'Leave Room', hostOnlyLabel: 'Only the host can start.',
    roundLabel: 'Round', answeredLabel: 'Answer submitted, waiting for the round…',
    correctLabel: 'Correct! 🎉', wrongLabel: 'Wrong.', correctAnswerPrefix: 'Correct answer:',
    waitingRoundLabel: 'Preparing the next round…',
    finishedTitle: 'Duel Over', backToLobbyBtn: 'Back to Lobby',
    youLabel: '(you)', scoreLabel: 'pts',
  },
  de: {
    title: 'Duell', subtitle: 'Ein Live-Vokabelwettbewerb mit mehreren Spielern gleichzeitig.',
    createBtn: 'Raum erstellen', error: 'Etwas ist schiefgelaufen.',
    empty: 'Gerade keine wartenden Räume.', emptySub: 'Eröffne den ersten Raum!',
    playersLabel: 'Spieler', joinBtn: 'Beitreten',
    waitingTitle: 'Warteraum', waitingSub: 'Warten auf weitere Spieler…',
    startBtn: 'Starten', needMoreLabel: 'Es werden mindestens 2 Spieler benötigt.',
    leaveBtn: 'Raum verlassen', hostOnlyLabel: 'Nur der Gastgeber kann starten.',
    roundLabel: 'Runde', answeredLabel: 'Antwort gesendet, warte auf die Runde…',
    correctLabel: 'Richtig! 🎉', wrongLabel: 'Falsch.', correctAnswerPrefix: 'Richtige Antwort:',
    waitingRoundLabel: 'Nächste Runde wird vorbereitet…',
    finishedTitle: 'Duell beendet', backToLobbyBtn: 'Zurück zur Lobby',
    youLabel: '(du)', scoreLabel: 'Pkt.',
  },
  fr: {
    title: 'Duel', subtitle: 'Une compétition de vocabulaire en direct avec plusieurs joueurs à la fois.',
    createBtn: 'Créer une salle', error: "Une erreur s'est produite.",
    empty: "Aucune salle en attente pour l'instant.", emptySub: 'Sois le premier à en ouvrir une !',
    playersLabel: 'joueurs', joinBtn: 'Rejoindre',
    waitingTitle: "Salle d'attente", waitingSub: "En attente d'autres joueurs…",
    startBtn: 'Démarrer', needMoreLabel: 'Au moins 2 joueurs sont nécessaires pour démarrer.',
    leaveBtn: 'Quitter la salle', hostOnlyLabel: "Seul l'hôte peut démarrer.",
    roundLabel: 'Manche', answeredLabel: 'Réponse envoyée, en attente de la manche…',
    correctLabel: 'Correct ! 🎉', wrongLabel: 'Incorrect.', correctAnswerPrefix: 'Bonne réponse :',
    waitingRoundLabel: 'Préparation de la prochaine manche…',
    finishedTitle: 'Duel terminé', backToLobbyBtn: 'Retour au lobby',
    youLabel: '(toi)', scoreLabel: 'pts',
  },
  es: {
    title: 'Duelo', subtitle: 'Una competencia de vocabulario en vivo con varios jugadores a la vez.',
    createBtn: 'Crear sala', error: 'Algo salió mal.',
    empty: 'No hay salas en espera ahora mismo.', emptySub: '¡Sé el primero en abrir una!',
    playersLabel: 'jugadores', joinBtn: 'Unirse',
    waitingTitle: 'Sala de espera', waitingSub: 'Esperando a otros jugadores…',
    startBtn: 'Comenzar', needMoreLabel: 'Se necesitan al menos 2 jugadores para comenzar.',
    leaveBtn: 'Salir de la sala', hostOnlyLabel: 'Solo el anfitrión puede comenzar.',
    roundLabel: 'Ronda', answeredLabel: 'Respuesta enviada, esperando la ronda…',
    correctLabel: '¡Correcto! 🎉', wrongLabel: 'Incorrecto.', correctAnswerPrefix: 'Respuesta correcta:',
    waitingRoundLabel: 'Preparando la siguiente ronda…',
    finishedTitle: 'Duelo terminado', backToLobbyBtn: 'Volver al lobby',
    youLabel: '(tú)', scoreLabel: 'pts',
  },
  it: {
    title: 'Duello', subtitle: 'Una gara di vocabolario dal vivo con più giocatori contemporaneamente.',
    createBtn: 'Crea stanza', error: 'Qualcosa è andato storto.',
    empty: 'Nessuna stanza in attesa al momento.', emptySub: 'Sii il primo ad aprirne una!',
    playersLabel: 'giocatori', joinBtn: 'Partecipa',
    waitingTitle: "Sala d'attesa", waitingSub: 'In attesa di altri giocatori…',
    startBtn: 'Inizia', needMoreLabel: 'Servono almeno 2 giocatori per iniziare.',
    leaveBtn: 'Esci dalla stanza', hostOnlyLabel: "Solo l'host può iniziare.",
    roundLabel: 'Turno', answeredLabel: 'Risposta inviata, in attesa del turno…',
    correctLabel: 'Corretto! 🎉', wrongLabel: 'Sbagliato.', correctAnswerPrefix: 'Risposta corretta:',
    waitingRoundLabel: 'Preparazione del prossimo turno…',
    finishedTitle: 'Duello finito', backToLobbyBtn: 'Torna alla lobby',
    youLabel: '(tu)', scoreLabel: 'pt',
  },
  ar: {
    title: 'مبارزة', subtitle: 'مسابقة مفردات مباشرة مع عدة لاعبين في آن واحد.',
    createBtn: 'إنشاء غرفة', error: 'حدث خطأ ما.',
    empty: 'لا توجد غرف بانتظار حالياً.', emptySub: 'كن أول من يفتح غرفة!',
    playersLabel: 'لاعبين', joinBtn: 'انضمام',
    waitingTitle: 'غرفة الانتظار', waitingSub: 'في انتظار لاعبين آخرين…',
    startBtn: 'ابدأ', needMoreLabel: 'يلزم لاعبان على الأقل للبدء.',
    leaveBtn: 'مغادرة الغرفة', hostOnlyLabel: 'فقط صاحب الغرفة يمكنه البدء.',
    roundLabel: 'جولة', answeredLabel: 'تم إرسال الإجابة، بانتظار الجولة…',
    correctLabel: 'إجابة صحيحة! 🎉', wrongLabel: 'إجابة خاطئة.', correctAnswerPrefix: 'الإجابة الصحيحة:',
    waitingRoundLabel: 'يتم تجهيز الجولة التالية…',
    finishedTitle: 'انتهت المبارزة', backToLobbyBtn: 'العودة إلى الصالة',
    youLabel: '(أنت)', scoreLabel: 'نقطة',
  },
  ru: {
    title: 'Дуэль', subtitle: 'Живое соревнование по словарному запасу с несколькими игроками одновременно.',
    createBtn: 'Создать комнату', error: 'Что-то пошло не так.',
    empty: 'Сейчас нет ожидающих комнат.', emptySub: 'Открой первую комнату!',
    playersLabel: 'игроков', joinBtn: 'Присоединиться',
    waitingTitle: 'Комната ожидания', waitingSub: 'Ожидание других игроков…',
    startBtn: 'Начать', needMoreLabel: 'Для начала нужно как минимум 2 игрока.',
    leaveBtn: 'Покинуть комнату', hostOnlyLabel: 'Начать может только хозяин комнаты.',
    roundLabel: 'Раунд', answeredLabel: 'Ответ отправлен, ожидание раунда…',
    correctLabel: 'Правильно! 🎉', wrongLabel: 'Неправильно.', correctAnswerPrefix: 'Правильный ответ:',
    waitingRoundLabel: 'Подготовка следующего раунда…',
    finishedTitle: 'Дуэль окончена', backToLobbyBtn: 'Вернуться в лобби',
    youLabel: '(ты)', scoreLabel: 'очк.',
  },
  ja: {
    title: 'デュエル', subtitle: '複数のプレイヤーと同時に対戦するライブ単語バトル。',
    createBtn: 'ルームを作成', error: '問題が発生しました。',
    empty: '現在待機中のルームはありません。', emptySub: '最初のルームを開いてみましょう!',
    playersLabel: '人', joinBtn: '参加',
    waitingTitle: '待機ルーム', waitingSub: '他のプレイヤーを待っています…',
    startBtn: '開始', needMoreLabel: '開始するには2人以上のプレイヤーが必要です。',
    leaveBtn: 'ルームを退出', hostOnlyLabel: 'ホストのみ開始できます。',
    roundLabel: 'ラウンド', answeredLabel: '回答を送信しました、ラウンドを待っています…',
    correctLabel: '正解! 🎉', wrongLabel: '不正解。', correctAnswerPrefix: '正解:',
    waitingRoundLabel: '次のラウンドを準備中…',
    finishedTitle: 'デュエル終了', backToLobbyBtn: 'ロビーに戻る',
    youLabel: '(あなた)', scoreLabel: '点',
  },
  pt: {
    title: 'Duelo', subtitle: 'Uma competição de vocabulário ao vivo com vários jogadores ao mesmo tempo.',
    createBtn: 'Criar Sala', error: 'Algo deu errado.',
    empty: 'Nenhuma sala aguardando no momento.', emptySub: 'Seja o primeiro a abrir uma!',
    playersLabel: 'jogadores', joinBtn: 'Entrar',
    waitingTitle: 'Sala de Espera', waitingSub: 'Aguardando outros jogadores…',
    startBtn: 'Iniciar', needMoreLabel: 'São necessários pelo menos 2 jogadores para iniciar.',
    leaveBtn: 'Sair da Sala', hostOnlyLabel: 'Somente o anfitrião pode iniciar.',
    roundLabel: 'Rodada', answeredLabel: 'Resposta enviada, aguardando a rodada…',
    correctLabel: 'Correto! 🎉', wrongLabel: 'Errado.', correctAnswerPrefix: 'Resposta correta:',
    waitingRoundLabel: 'Preparando a próxima rodada…',
    finishedTitle: 'Duelo Encerrado', backToLobbyBtn: 'Voltar ao Lobby',
    youLabel: '(você)', scoreLabel: 'pts',
  },
};
