'use client';

// app/(app)/duels/[id]/page.tsx — V2 §6.3 Faz 3a/3e: Düello odası.
// Bekleme odası (katılımcı listesi + başlat) -> aktif tur (tanım + 4
// seçenek, canlı sayaç) -> bitiş (final skor tablosu).
//
// GÜNCELLEME (12 Eylül 2026, V2 öncelik #5 — "Gerçek Zamanlı Düello"):
// artık Supabase Realtime de devrede — `duels` ve `duel_participants`
// tabloları publication'a eklendi (bkz. supabase/migrations/
// 067_duel_realtime.sql). Realtime BURADA VERİ KAYNAĞI OLARAK
// KULLANILMIYOR (payload'a güvenilmiyor) — sadece "bir şey değişti,
// hemen tick() çağır" sinyali olarak kullanılıyor ("wake up and
// refetch" deseni): yetkilendirme/iş kuralları hâlâ tamamen mevcut
// REST tick() çağrısında. POLL_MS bu yüzden 2sn'den ~8sn'e çıkarıldı —
// hızlı yol artık Realtime, polling sadece güvenlik ağı (bağlantı
// koptuğunda/olay kaçırıldığında). `duel_rounds`/`duel_answers`
// BİLİNÇLİ OLARAK publication'a eklenmedi — bkz. backend/app/schemas/
// duels.py::DuelStatusResponse/DuelRoundPublic docstring'leri
// (correct_option asla client'a round bitmeden gönderilmez).
// BİLİNÇLİ SINIR: mobil tarafta @supabase/supabase-js henüz kurulu
// değil (npx expo install ... kullanıcının kendi terminalinden
// çalıştırması gerekiyor) — mobil şimdilik sadece polling ile devam
// ediyor, bu web-only bir iyileştirme.
// Backend: /api/v1/duels/* (bkz. backend/app/api/routes/duels.py)

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AxiosError } from 'axios';
import { Swords, Loader2, Play, LogOut, Check, X, Trophy, ArrowLeft, Heart } from 'lucide-react';
import { duelsApi } from '@/lib/api';
import { useAuth } from '@/store/auth';
import { useLocale, type Locale } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';
import type { DuelStatusResponse, DuelRoundPublic, DuelGuessLetterResponse, DuelLingoGuessResponse } from '@/types';

function errorDetail(err: unknown): string | undefined {
  if (err instanceof AxiosError) {
    return (err.response?.data as { detail?: string } | undefined)?.detail;
  }
  return undefined;
}

const L: Record<Locale, Record<string, string>> = {
  tr: {
    loading: 'Yükleniyor…', error: 'Bir şeyler ters gitti.',
    waitingTitle: 'Bekleme Odası', waitingSub: 'Diğer oyuncular bekleniyor…',
    startBtn: 'Başlat', needMoreLabel: 'Başlamak için en az 2 oyuncu gerekiyor.',
    backToListBtn: 'Listeye dön',
    leaveBtn: 'Odadan Ayrıl', hostOnlyLabel: 'Sadece oda sahibi başlatabilir.',
    roundLabel: 'Tur', answeredLabel: 'Cevap gönderildi, tur bekleniyor…',
    correctLabel: 'Doğru! 🎉', wrongLabel: 'Yanlış.', correctAnswerPrefix: 'Doğru cevap:',
    finishedTitle: 'Düello Bitti', backToLobbyBtn: 'Lobiye Dön',
    youLabel: '(sen)', scoreLabel: 'puan', waitingRoundLabel: 'Sıradaki tur hazırlanıyor…',
    livesLabel: 'Can', wordleCompleteLabel: 'Kelimeyi tamamladın! 🎉',
    wordleFirstFinishLabel: 'İlk bitiren sensin! +bonus 🏆', wordleFailedLabel: 'Hakların bitti.', lingoPotLabel: 'Kasa', lingoGuessesLeftTpl: '{n} hakkın kaldı', lingoInputPlaceholder: '{n} harfli kelimeyi yaz…', lingoSubmitBtn: 'Tahmin Et', lingoInvalidLengthTpl: 'Tahminin {n} harfli olmalı.', lingoCompleteLabel: 'Kelimeyi tamamladın! 🎉', lingoFirstFinishLabel: 'İlk bitiren sensin! +bonus 🏆', lingoFailedLabel: 'Kasan bitti.',
  },
  en: {
    loading: 'Loading…', error: 'Something went wrong.',
    waitingTitle: 'Waiting Room', waitingSub: 'Waiting for other players…',
    startBtn: 'Start', needMoreLabel: 'At least 2 players are needed to start.',
    backToListBtn: 'Back to list',
    leaveBtn: 'Leave Room', hostOnlyLabel: 'Only the host can start.',
    roundLabel: 'Round', answeredLabel: 'Answer submitted, waiting for the round…',
    correctLabel: 'Correct! 🎉', wrongLabel: 'Wrong.', correctAnswerPrefix: 'Correct answer:',
    finishedTitle: 'Duel Over', backToLobbyBtn: 'Back to Lobby',
    youLabel: '(you)', scoreLabel: 'pts', waitingRoundLabel: 'Preparing the next round…',
    livesLabel: 'Lives', wordleCompleteLabel: 'You completed the word! 🎉',
    wordleFirstFinishLabel: 'First to finish! +bonus 🏆', wordleFailedLabel: 'Out of guesses.', lingoPotLabel: 'Pot', lingoGuessesLeftTpl: '{n} guesses left', lingoInputPlaceholder: 'Type a {n}-letter word…', lingoSubmitBtn: 'Guess', lingoInvalidLengthTpl: 'Your guess must be {n} letters.', lingoCompleteLabel: 'You completed the word! 🎉', lingoFirstFinishLabel: 'First to finish! +bonus 🏆', lingoFailedLabel: 'Out of guesses.',
  },
  de: {
    loading: 'Wird geladen…', error: 'Etwas ist schiefgelaufen.',
    waitingTitle: 'Warteraum', waitingSub: 'Warten auf weitere Spieler…',
    startBtn: 'Starten', needMoreLabel: 'Es werden mindestens 2 Spieler benötigt.',
    backToListBtn: 'Zurück zur Liste',
    leaveBtn: 'Raum verlassen', hostOnlyLabel: 'Nur der Gastgeber kann starten.',
    roundLabel: 'Runde', answeredLabel: 'Antwort gesendet, warte auf die Runde…',
    correctLabel: 'Richtig! 🎉', wrongLabel: 'Falsch.', correctAnswerPrefix: 'Richtige Antwort:',
    finishedTitle: 'Duell beendet', backToLobbyBtn: 'Zurück zur Lobby',
    youLabel: '(du)', scoreLabel: 'Pkt.', waitingRoundLabel: 'Nächste Runde wird vorbereitet…',
    livesLabel: 'Leben', wordleCompleteLabel: 'Du hast das Wort vervollständigt! 🎉',
    wordleFirstFinishLabel: 'Zuerst fertig! +Bonus 🏆', wordleFailedLabel: 'Keine Versuche mehr.', lingoPotLabel: 'Topf', lingoGuessesLeftTpl: 'Noch {n} Versuche', lingoInputPlaceholder: 'Gib ein {n}-buchstabiges Wort ein…', lingoSubmitBtn: 'Raten', lingoInvalidLengthTpl: 'Dein Wort muss {n} Buchstaben haben.', lingoCompleteLabel: 'Du hast das Wort vervollständigt! 🎉', lingoFirstFinishLabel: 'Zuerst fertig! +Bonus 🏆', lingoFailedLabel: 'Kein Guthaben mehr.',
  },
  fr: {
    loading: 'Chargement…', error: "Une erreur s'est produite.",
    waitingTitle: "Salle d'attente", waitingSub: "En attente d'autres joueurs…",
    startBtn: 'Démarrer', needMoreLabel: 'Au moins 2 joueurs sont nécessaires pour démarrer.',
    backToListBtn: 'Retour à la liste',
    leaveBtn: 'Quitter la salle', hostOnlyLabel: "Seul l'hôte peut démarrer.",
    roundLabel: 'Manche', answeredLabel: 'Réponse envoyée, en attente de la manche…',
    correctLabel: 'Correct ! 🎉', wrongLabel: 'Incorrect.', correctAnswerPrefix: 'Bonne réponse :',
    finishedTitle: 'Duel terminé', backToLobbyBtn: 'Retour au lobby',
    youLabel: '(toi)', scoreLabel: 'pts', waitingRoundLabel: 'Préparation de la prochaine manche…',
    livesLabel: 'Vies', wordleCompleteLabel: 'Tu as complété le mot ! 🎉',
    wordleFirstFinishLabel: 'Premier à terminer ! +bonus 🏆', wordleFailedLabel: "Plus d'essais.", lingoPotLabel: 'Cagnotte', lingoGuessesLeftTpl: 'Il te reste {n} essais', lingoInputPlaceholder: 'Tape un mot de {n} lettres…', lingoSubmitBtn: 'Deviner', lingoInvalidLengthTpl: 'Ton mot doit faire {n} lettres.', lingoCompleteLabel: 'Tu as complété le mot ! 🎉', lingoFirstFinishLabel: 'Premier à terminer ! +bonus 🏆', lingoFailedLabel: 'Cagnotte épuisée.',
  },
  es: {
    loading: 'Cargando…', error: 'Algo salió mal.',
    waitingTitle: 'Sala de espera', waitingSub: 'Esperando a otros jugadores…',
    startBtn: 'Comenzar', needMoreLabel: 'Se necesitan al menos 2 jugadores para comenzar.',
    backToListBtn: 'Volver a la lista',
    leaveBtn: 'Salir de la sala', hostOnlyLabel: 'Solo el anfitrión puede comenzar.',
    roundLabel: 'Ronda', answeredLabel: 'Respuesta enviada, esperando la ronda…',
    correctLabel: '¡Correcto! 🎉', wrongLabel: 'Incorrecto.', correctAnswerPrefix: 'Respuesta correcta:',
    finishedTitle: 'Duelo terminado', backToLobbyBtn: 'Volver al lobby',
    youLabel: '(tú)', scoreLabel: 'pts', waitingRoundLabel: 'Preparando la siguiente ronda…',
    livesLabel: 'Vidas', wordleCompleteLabel: '¡Completaste la palabra! 🎉',
    wordleFirstFinishLabel: '¡Primero en terminar! +bono 🏆', wordleFailedLabel: 'Sin intentos.', lingoPotLabel: 'Bote', lingoGuessesLeftTpl: 'Te quedan {n} intentos', lingoInputPlaceholder: 'Escribe una palabra de {n} letras…', lingoSubmitBtn: 'Adivinar', lingoInvalidLengthTpl: 'Tu palabra debe tener {n} letras.', lingoCompleteLabel: '¡Completaste la palabra! 🎉', lingoFirstFinishLabel: '¡Primero en terminar! +bono 🏆', lingoFailedLabel: 'Bote agotado.',
  },
  it: {
    loading: 'Caricamento…', error: 'Qualcosa è andato storto.',
    waitingTitle: "Sala d'attesa", waitingSub: 'In attesa di altri giocatori…',
    startBtn: 'Inizia', needMoreLabel: 'Servono almeno 2 giocatori per iniziare.',
    backToListBtn: 'Torna alla lista',
    leaveBtn: 'Esci dalla stanza', hostOnlyLabel: "Solo l'host può iniziare.",
    roundLabel: 'Turno', answeredLabel: 'Risposta inviata, in attesa del turno…',
    correctLabel: 'Corretto! 🎉', wrongLabel: 'Sbagliato.', correctAnswerPrefix: 'Risposta corretta:',
    finishedTitle: 'Duello finito', backToLobbyBtn: 'Torna alla lobby',
    youLabel: '(tu)', scoreLabel: 'pt', waitingRoundLabel: 'Preparazione del prossimo turno…',
    livesLabel: 'Vite', wordleCompleteLabel: 'Hai completato la parola! 🎉',
    wordleFirstFinishLabel: 'Primo a finire! +bonus 🏆', wordleFailedLabel: 'Tentativi esauriti.', lingoPotLabel: 'Montepremi', lingoGuessesLeftTpl: 'Ti restano {n} tentativi', lingoInputPlaceholder: 'Scrivi una parola di {n} lettere…', lingoSubmitBtn: 'Indovina', lingoInvalidLengthTpl: 'La tua parola deve avere {n} lettere.', lingoCompleteLabel: 'Hai completato la parola! 🎉', lingoFirstFinishLabel: 'Primo a finire! +bonus 🏆', lingoFailedLabel: 'Montepremi esaurito.',
  },
  ar: {
    loading: 'جارٍ التحميل…', error: 'حدث خطأ ما.',
    waitingTitle: 'غرفة الانتظار', waitingSub: 'في انتظار لاعبين آخرين…',
    startBtn: 'ابدأ', needMoreLabel: 'يلزم لاعبان على الأقل للبدء.',
    backToListBtn: 'العودة إلى القائمة',
    leaveBtn: 'مغادرة الغرفة', hostOnlyLabel: 'فقط صاحب الغرفة يمكنه البدء.',
    roundLabel: 'جولة', answeredLabel: 'تم إرسال الإجابة، بانتظار الجولة…',
    correctLabel: 'إجابة صحيحة! 🎉', wrongLabel: 'إجابة خاطئة.', correctAnswerPrefix: 'الإجابة الصحيحة:',
    finishedTitle: 'انتهت المبارزة', backToLobbyBtn: 'العودة إلى الصالة',
    youLabel: '(أنت)', scoreLabel: 'نقطة', waitingRoundLabel: 'يتم تجهيز الجولة التالية…',
    livesLabel: 'محاولات', wordleCompleteLabel: 'أكملت الكلمة! 🎉',
    wordleFirstFinishLabel: 'الأول في الإنهاء! +مكافأة 🏆', wordleFailedLabel: 'نفدت محاولاتك.', lingoPotLabel: 'الرصيد', lingoGuessesLeftTpl: 'تبقّى لك {n} محاولات', lingoInputPlaceholder: 'اكتب كلمة من {n} أحرف…', lingoSubmitBtn: 'خمّن', lingoInvalidLengthTpl: 'يجب أن تكون كلمتك من {n} أحرف.', lingoCompleteLabel: 'أكملت الكلمة! 🎉', lingoFirstFinishLabel: 'الأول في الإنهاء! +مكافأة 🏆', lingoFailedLabel: 'نفد رصيدك.',
  },
  ru: {
    loading: 'Загрузка…', error: 'Что-то пошло не так.',
    waitingTitle: 'Комната ожидания', waitingSub: 'Ожидание других игроков…',
    startBtn: 'Начать', needMoreLabel: 'Для начала нужно как минимум 2 игрока.',
    backToListBtn: 'Назад к списку',
    leaveBtn: 'Покинуть комнату', hostOnlyLabel: 'Начать может только хозяин комнаты.',
    roundLabel: 'Раунд', answeredLabel: 'Ответ отправлен, ожидание раунда…',
    correctLabel: 'Правильно! 🎉', wrongLabel: 'Неправильно.', correctAnswerPrefix: 'Правильный ответ:',
    finishedTitle: 'Дуэль окончена', backToLobbyBtn: 'Вернуться в лобби',
    youLabel: '(ты)', scoreLabel: 'очк.', waitingRoundLabel: 'Подготовка следующего раунда…',
    livesLabel: 'Жизни', wordleCompleteLabel: 'Вы завершили слово! 🎉',
    wordleFirstFinishLabel: 'Первый финишировавший! +бонус 🏆', wordleFailedLabel: 'Попытки закончились.', lingoPotLabel: 'Банк', lingoGuessesLeftTpl: 'Осталось попыток: {n}', lingoInputPlaceholder: 'Введите слово из {n} букв…', lingoSubmitBtn: 'Угадать', lingoInvalidLengthTpl: 'Слово должно быть из {n} букв.', lingoCompleteLabel: 'Вы завершили слово! 🎉', lingoFirstFinishLabel: 'Первый финишировавший! +бонус 🏆', lingoFailedLabel: 'Банк исчерпан.',
  },
  ja: {
    loading: '読み込み中…', error: '問題が発生しました。',
    waitingTitle: '待機ルーム', waitingSub: '他のプレイヤーを待っています…',
    startBtn: '開始', needMoreLabel: '開始するには2人以上のプレイヤーが必要です。',
    backToListBtn: 'リストに戻る',
    leaveBtn: 'ルームを退出', hostOnlyLabel: 'ホストのみ開始できます。',
    roundLabel: 'ラウンド', answeredLabel: '回答を送信しました、ラウンドを待っています…',
    correctLabel: '正解! 🎉', wrongLabel: '不正解。', correctAnswerPrefix: '正解:',
    finishedTitle: 'デュエル終了', backToLobbyBtn: 'ロビーに戻る',
    youLabel: '(あなた)', scoreLabel: '点', waitingRoundLabel: '次のラウンドを準備中…',
    livesLabel: 'ライフ', wordleCompleteLabel: '単語を完成させました！🎉',
    wordleFirstFinishLabel: '最速クリア！+ボーナス 🏆', wordleFailedLabel: '挑戦回数が尽きました。', lingoPotLabel: '賞金', lingoGuessesLeftTpl: '残り{n}回', lingoInputPlaceholder: '{n}文字の単語を入力…', lingoSubmitBtn: '回答する', lingoInvalidLengthTpl: '単語は{n}文字である必要があります。', lingoCompleteLabel: '単語を完成させました！🎉', lingoFirstFinishLabel: '最速クリア！+ボーナス 🏆', lingoFailedLabel: '賞金がなくなりました。',
  },
  pt: {
    loading: 'Carregando…', error: 'Algo deu errado.',
    waitingTitle: 'Sala de Espera', waitingSub: 'Aguardando outros jogadores…',
    startBtn: 'Iniciar', needMoreLabel: 'São necessários pelo menos 2 jogadores para iniciar.',
    backToListBtn: 'Voltar à lista',
    leaveBtn: 'Sair da Sala', hostOnlyLabel: 'Somente o anfitrião pode iniciar.',
    roundLabel: 'Rodada', answeredLabel: 'Resposta enviada, aguardando a rodada…',
    correctLabel: 'Correto! 🎉', wrongLabel: 'Errado.', correctAnswerPrefix: 'Resposta correta:',
    finishedTitle: 'Duelo Encerrado', backToLobbyBtn: 'Voltar ao Lobby',
    youLabel: '(você)', scoreLabel: 'pts', waitingRoundLabel: 'Preparando a próxima rodada…',
    livesLabel: 'Vidas', wordleCompleteLabel: 'Você completou a palavra! 🎉',
    wordleFirstFinishLabel: 'Primeiro a terminar! +bônus 🏆', wordleFailedLabel: 'Sem mais tentativas.', lingoPotLabel: 'Prémio', lingoGuessesLeftTpl: 'Restam-te {n} tentativas', lingoInputPlaceholder: 'Escreve uma palavra de {n} letras…', lingoSubmitBtn: 'Adivinhar', lingoInvalidLengthTpl: 'A tua palavra deve ter {n} letras.', lingoCompleteLabel: 'Você completou a palavra! 🎉', lingoFirstFinishLabel: 'Primeiro a terminar! +bônus 🏆', lingoFailedLabel: 'Prémio esgotado.',
  },
};

// Realtime artık hızlı yolu üstleniyor (bkz. yukarıdaki modül notu) —
// bu sadece yedek/güvenlik ağı aralığı.
const POLL_MS = 8000;

// 18 Eylul 2026 -- mode='wordle' duellolari icin harf klavyesi. game/page.tsx'teki
// (tek oyunculu hangman) AYNI klavye setleri -- bilincli kod tekrari.
const KEYBOARD_ROWS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];
// Gerçek telefon Arapça klavyesiyle birebir aynı dizilim — bkz.
// mobile/src/constants/keyboards.ts'teki kök neden notu (3 Ekim 2026).
const ARABIC_KEYBOARD_ROWS = ['ضصثقفغعهخحج', 'شسيبلاتنمكط', 'ذءؤرئةوزظد'];

export default function DuelRoomPage() {
  const params = useParams<{ id: string }>();
  const duelId = params.id;
  const router = useRouter();
  const { user } = useAuth();
  const { locale } = useLocale();
  const t = L[locale];

  const [duel, setDuel] = useState<DuelStatusResponse | null>(null);
  const [round, setRound] = useState<DuelRoundPublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [answerResult, setAnswerResult] = useState<{ is_correct: boolean; correct_option: string } | null>(null);
  const [now, setNow] = useState(() => Date.now());
  // 18 Eylul 2026 -- mode='wordle' turu icin ilerleme (bkz. asagidaki
  // handleGuessLetter). guessResultRef, answerResultRef ile AYNI "en son
  // deger" deseni.
  const [guessResult, setGuessResult] = useState<DuelGuessLetterResponse | null>(null);
  const [letterBusy, setLetterBusy] = useState(false);

  const lastRoundIndex = useRef<number | null>(null);
  // "En güncel" ref deseni — aşağıdaki tick() closure'ının answerResult'ı
  // HER ZAMAN taze okuması için (bkz. altındaki not: tick eskiden
  // [duelId, answerResult]'a bağlıydı ama interval efekti SADECE [duelId]'e
  // bağlıydı, bu yüzden answerResult her zaman mount anındaki null değerini
  // görüyordu — "herkes cevapladıysa hemen ilerlet" dalı hiç çalışmıyordu,
  // sadece süre dolumu ilerletiyordu. Bu ref, tick'i answerResult'tan
  // BAĞIMSIZ (kararlı) hale getirip interval efektinin de doğru şekilde
  // tick'e bağlı olmasını sağlıyor).
  const answerResultRef = useRef<{ is_correct: boolean; correct_option: string } | null>(null);
  useEffect(() => {
    answerResultRef.current = answerResult;
  }, [answerResult]);
  const guessResultRef = useRef<DuelGuessLetterResponse | null>(null);
  useEffect(() => {
    guessResultRef.current = guessResult;
  }, [guessResult]);

  // 26 Kasim 2026 -- mode='lingo' turu icin tam-kelime tahmin ilerlemesi
  // (bkz. asagidaki handleGuessWord). guessResultRef ile AYNI "en guncel
  // deger" deseni.
  const [lingoGuessResult, setLingoGuessResult] = useState<DuelLingoGuessResponse | null>(null);
  const [lingoInput, setLingoInput] = useState('');
  const [lingoBusy, setLingoBusy] = useState(false);
  const [lingoInputError, setLingoInputError] = useState('');
  const lingoGuessResultRef = useRef<DuelLingoGuessResponse | null>(null);
  useEffect(() => {
    lingoGuessResultRef.current = lingoGuessResult;
  }, [lingoGuessResult]);

  const tick = useCallback(async () => {
    try {
      const status = await duelsApi.getStatus(duelId);
      setDuel(status);
      setError(null);

      if (status.status === 'active') {
        const r = await duelsApi.getCurrentRound(duelId);
        if (lastRoundIndex.current !== r.round_index) {
          lastRoundIndex.current = r.round_index;
          setSelected(null);
          setAnswerResult(null);
          setGuessResult(null);
          setLingoGuessResult(null);
          setLingoInput('');
          setLingoInputError('');
        }
        if (!r.started_at) {
          const started = await duelsApi.beginRound(duelId);
          setRound(started);
        } else {
          setRound(r);
          const ended = r.ends_at ? new Date(r.ends_at).getTime() <= Date.now() : false;
          if (
            ended ||
            answerResultRef.current ||
            guessResultRef.current?.is_round_over ||
            lingoGuessResultRef.current?.is_round_over
          ) {
            duelsApi.advanceRound(duelId).catch(() => {});
          }
        }
      } else {
        setRound(null);
      }
    } catch {
      setError(t.error);
    } finally {
      setLoading(false);
    }
  }, [duelId, t.error]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount/parametre değişiminde veri çekme (fetch-on-effect) deseni; senkron setState çağrısı kasıtlı, davranış değiştirilmedi
    tick();
    const interval = setInterval(tick, POLL_MS);
    return () => clearInterval(interval);
  }, [tick]);

  // Realtime "uyandır ve yeniden çek" (bkz. modül başı notu): duels/
  // duel_participants tablolarındaki HERHANGİ bir değişiklikte (skor,
  // durum, katılımcı giriş/çıkış, tur ilerlemesi) polling aralığını
  // beklemeden tick()'i hemen tetikler. Realtime bağlantısı kopsa/olay
  // kaçırılsa bile yukarıdaki interval yedek olarak çalışmaya devam eder.
  useEffect(() => {
    const channel = supabase
      .channel(`duel-room-${duelId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'duels', filter: `id=eq.${duelId}` },
        () => { tick(); },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'duel_participants', filter: `duel_id=eq.${duelId}` },
        () => { tick(); },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [duelId, tick]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(timer);
  }, []);

  const handleStart = async () => {
    setStarting(true);
    try {
      await duelsApi.start(duelId);
      await tick();
    } catch (err) {
      setError(errorDetail(err) || t.error);
    } finally {
      setStarting(false);
    }
  };

  const handleLeave = async () => {
    try {
      await duelsApi.leave(duelId);
    } catch {
      // yoksay — her durumda lobiye dön
    }
    router.push('/duels');
  };

  const handleAnswer = async (option: string) => {
    if (selected || !round) return;
    setSelected(option);
    try {
      const res = await duelsApi.submitAnswer(duelId, option);
      setAnswerResult(res);
    } catch (err) {
      setError(errorDetail(err) || t.error);
    }
  };

  // 18 Eylul 2026 -- mode='wordle' turu icin tek harf tahmini (bkz. mobile
  // duel-room.tsx'teki AYNI mantik).
  const handleGuessLetter = async (letter: string) => {
    if (!round || letterBusy || guessResult?.is_round_over) return;
    setLetterBusy(true);
    try {
      const res = await duelsApi.guessLetter(duelId, letter);
      setGuessResult(res);
      setRound((prev) =>
        prev
          ? { ...prev, revealed: res.revealed, guessed_letters: res.guessed_letters, wrong_guesses: res.wrong_guesses }
          : prev
      );
    } catch (err) {
      setError(errorDetail(err) || t.error);
    } finally {
      setLetterBusy(false);
    }
  };

  // 26 Kasim 2026 -- mode='lingo' turu icin tam-kelime tahmini (bkz.
  // game/page.tsx::handleLingoGuess ile AYNI mantik, farki: tahmin
  // tahtasi `round.lingo_guesses`'ten -- bir sonraki tick() zaten tam
  // gecmisi geri dondurur, ama burada ANINDA geri bildirim icin yerel
  // olarak da ekleniyor, wordle'daki round.revealed guncellemesiyle
  // AYNI ilke).
  const handleGuessWord = async () => {
    if (!round || lingoBusy || lingoGuessResult?.is_round_over) return;
    const length = round.lingo_word_length ?? 5;
    const guess = lingoInput.trim().toLowerCase();
    if (guess.length !== length) {
      setLingoInputError(t.lingoInvalidLengthTpl.replace('{n}', String(length)));
      return;
    }
    setLingoInputError('');
    setLingoBusy(true);
    try {
      const res = await duelsApi.guessWord(duelId, guess);
      setLingoGuessResult(res);
      setLingoInput('');
      setRound((prev) =>
        prev
          ? {
              ...prev,
              lingo_guesses: [...(prev.lingo_guesses ?? []), { word: res.guess, feedback: res.feedback }],
              lingo_locked: res.locked,
              lingo_pot: res.pot,
              lingo_guesses_used: res.guesses_used,
            }
          : prev
      );
    } catch (err) {
      setError(errorDetail(err) || t.error);
    } finally {
      setLingoBusy(false);
    }
  };

  if (loading && !duel) {
    return (
      <div className="max-w-2xl mx-auto p-8 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-gray-300 dark:text-slate-600" />
      </div>
    );
  }

  if (error && !duel) {
    return <p className="max-w-2xl mx-auto p-8 text-sm text-red-400 dark:text-red-300 text-center">{error}</p>;
  }

  if (!duel) return null;

  const isHost = duel.created_by === user?.id;
  const isWordle = duel.mode === 'wordle';
  const isLingo = duel.mode === 'lingo';
  const keyboardRows = duel.learning_lang === 'ar' ? ARABIC_KEYBOARD_ROWS : KEYBOARD_ROWS;
  const secondsLeft = round?.ends_at ? Math.max(0, Math.ceil((new Date(round.ends_at).getTime() - now) / 1000)) : null;
  const sortedParticipants = [...duel.participants].sort((a, b) => b.score - a.score);

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8 space-y-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.push('/duels')}
          className="flex items-center justify-center w-9 h-9 rounded-xl text-gray-400 dark:text-slate-500 hover:bg-gray-50 hover:dark:bg-slate-800 hover:text-gray-600 hover:dark:text-slate-300 transition-colors shrink-0"
          title={t.backToListBtn}
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center shrink-0">
          <Swords className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-slate-100 uppercase">{duel.learning_lang}</h1>
      </div>

      {duel.status === 'waiting' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-5 space-y-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">{t.waitingTitle}</h2>
            <p className="text-sm text-gray-400 dark:text-slate-500">{t.waitingSub}</p>
          </div>
          <div className="space-y-1">
            {sortedParticipants.map((p) => (
              <div key={p.user_id} className="flex items-center gap-3 px-3 py-2 rounded-lg">
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-semibold shrink-0">
                  {(p.username || '?')[0].toUpperCase()}
                </div>
                <p className="text-sm text-gray-700 dark:text-slate-300">
                  {p.username || p.user_id.slice(0, 8)} {p.user_id === user?.id && t.youLabel}
                </p>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 pt-2">
            {isHost ? (
              <button
                type="button"
                disabled={starting || duel.participant_count < 2}
                onClick={handleStart}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-50 transition-colors"
              >
                {starting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                {t.startBtn}
              </button>
            ) : (
              <p className="text-xs text-gray-400 dark:text-slate-500">{t.hostOnlyLabel}</p>
            )}
            <button
              type="button"
              onClick={handleLeave}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-gray-500 hover:bg-gray-50 dark:text-slate-400 dark:hover:bg-slate-800 text-sm font-medium transition-colors"
            >
              <LogOut className="w-4 h-4" />
              {t.leaveBtn}
            </button>
          </div>
          {isHost && duel.participant_count < 2 && (
            <p className="text-xs text-amber-500 dark:text-amber-400">{t.needMoreLabel}</p>
          )}
        </div>
      )}

      {duel.status === 'active' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-400 dark:text-slate-500">
              {t.roundLabel} {(round?.round_index ?? 0) + 1}/{duel.round_count}
            </span>
            {secondsLeft !== null && (
              <span className="text-sm font-semibold text-blue-600 dark:text-blue-400 tabular-nums">{secondsLeft}s</span>
            )}
          </div>

          {!round && <p className="text-sm text-gray-400 dark:text-slate-500 text-center py-6">{t.waitingRoundLabel}</p>}

          {round && isWordle && (
            <>
              <div className="w-full flex items-center justify-center gap-2">
                <span className="text-xs font-medium text-gray-400 dark:text-slate-500 mr-1">{t.livesLabel}</span>
                {Array.from({ length: round.max_wrong_guesses ?? 6 }).map((_, i) => (
                  <Heart
                    key={i}
                    className={`w-5 h-5 ${
                      i < (round.max_wrong_guesses ?? 6) - (round.wrong_guesses ?? 0)
                        ? 'text-red-400 dark:text-red-300 fill-red-400'
                        : 'text-gray-200 dark:text-slate-700 fill-gray-200'
                    }`}
                  />
                ))}
              </div>

              <div className="w-full flex items-center justify-center flex-wrap gap-2 py-4">
                {(round.revealed ?? '').replace(/\s+/g, '').split('').map((ch, i) => (
                  <span
                    key={i}
                    className={`w-9 h-11 flex items-center justify-center rounded-lg text-xl font-bold uppercase ${
                      ch === '_'
                        ? 'bg-gray-50 dark:bg-slate-800 border-2 border-gray-200 dark:border-slate-700 text-transparent'
                        : 'bg-[#EAF3DE] border-2 border-[#3B6D11]/30 text-[#3B6D11]'
                    }`}
                  >
                    {ch === '_' ? '·' : ch}
                  </span>
                ))}
              </div>

              {guessResult?.is_round_over && (
                <div
                  className={`w-full rounded-xl px-4 py-3 text-sm font-semibold text-center ${
                    guessResult.is_complete ? 'bg-[#EAF3DE] text-[#3B6D11]' : 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400'
                  }`}
                >
                  <p>
                    {guessResult.is_complete
                      ? guessResult.first_to_finish
                        ? t.wordleFirstFinishLabel
                        : t.wordleCompleteLabel
                      : t.wordleFailedLabel}
                  </p>
                  {!guessResult.is_complete && guessResult.word && (
                    <p className="mt-1 font-normal">{t.correctAnswerPrefix} {guessResult.word}</p>
                  )}
                </div>
              )}

              {!guessResult?.is_round_over && (
                <div className="w-full flex flex-col items-center gap-2">
                  {keyboardRows.map((row, i) => (
                    <div key={i} className="flex gap-1.5">
                      {row.split('').map((letter) => {
                        const lower = letter.toLowerCase();
                        const guessedLetters = round.guessed_letters ?? [];
                        const isGuessed = guessedLetters.includes(lower);
                        const isCorrectGuess = isGuessed && (round.revealed ?? '').toLowerCase().includes(lower);
                        return (
                          <button
                            key={letter}
                            type="button"
                            onClick={() => handleGuessLetter(lower)}
                            disabled={isGuessed || letterBusy}
                            className={`w-8 h-10 sm:w-9 sm:h-11 rounded-lg text-sm font-semibold transition-all ${
                              isGuessed
                                ? isCorrectGuess
                                  ? 'bg-[#EAF3DE] text-[#3B6D11] border-2 border-[#3B6D11]/30'
                                  : 'bg-gray-100 dark:bg-slate-800 text-gray-300 dark:text-slate-600 border-2 border-gray-100 dark:border-slate-800'
                                : 'bg-white dark:bg-slate-900 border-2 border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 hover:border-[#378ADD] hover:bg-[#E6F1FB]'
                            }`}
                          >
                            {letter}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {round && isLingo && (
            <>
              <div className="w-full flex items-center justify-center gap-4">
                <span className="text-xs font-medium text-gray-400 dark:text-slate-500">
                  {t.lingoPotLabel}: <span className="font-bold text-gray-700 dark:text-slate-200">{round.lingo_pot ?? 10}</span>
                </span>
                <span className="text-xs font-medium text-gray-400 dark:text-slate-500">
                  {t.lingoGuessesLeftTpl.replace(
                    '{n}',
                    String(Math.max(0, (round.lingo_max_guesses ?? 5) - (round.lingo_guesses_used ?? (round.lingo_guesses ?? []).length)))
                  )}
                </span>
              </div>

              <div className="w-full flex flex-col items-center gap-1.5 py-2">
                {(round.lingo_guesses ?? []).map((g, rowIdx) => (
                  <div key={rowIdx} className="flex gap-1.5">
                    {g.word.split('').map((ch, i) => {
                      const fb = g.feedback[i];
                      const cls =
                        fb === 'correct'
                          ? 'bg-[#3B6D11] border-[#3B6D11] text-white'
                          : fb === 'present'
                            ? 'bg-[#C98A1A] border-[#C98A1A] text-white'
                            : 'bg-gray-200 dark:bg-slate-700 border-gray-200 dark:border-slate-700 text-gray-500 dark:text-slate-300';
                      return (
                        <span
                          key={i}
                          className={`w-9 h-11 flex items-center justify-center rounded-lg text-xl font-bold uppercase border-2 ${cls}`}
                        >
                          {ch}
                        </span>
                      );
                    })}
                  </div>
                ))}
                {!lingoGuessResult?.is_round_over && (
                  <div className="flex gap-1.5">
                    {Array.from({ length: round.lingo_word_length ?? 5 }).map((_, i) => {
                      const lockedChar = (round.lingo_locked ?? [])[i];
                      const typedChar = lingoInput[i];
                      return (
                        <span
                          key={i}
                          className={`w-9 h-11 flex items-center justify-center rounded-lg text-xl font-bold uppercase border-2 ${
                            lockedChar
                              ? 'bg-[#EAF3DE] border-[#3B6D11]/40 text-[#3B6D11]'
                              : typedChar
                                ? 'border-[#378ADD] text-gray-800 dark:text-slate-100'
                                : 'bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-transparent'
                          }`}
                        >
                          {lockedChar ?? typedChar ?? '·'}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>

              {lingoGuessResult?.is_round_over && (
                <div
                  className={`w-full rounded-xl px-4 py-3 text-sm font-semibold text-center ${
                    lingoGuessResult.is_complete ? 'bg-[#EAF3DE] text-[#3B6D11]' : 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400'
                  }`}
                >
                  <p>
                    {lingoGuessResult.is_complete
                      ? lingoGuessResult.first_to_finish
                        ? t.lingoFirstFinishLabel
                        : t.lingoCompleteLabel
                      : t.lingoFailedLabel}
                  </p>
                  {!lingoGuessResult.is_complete && lingoGuessResult.word && (
                    <p className="mt-1 font-normal">{t.correctAnswerPrefix} {lingoGuessResult.word}</p>
                  )}
                </div>
              )}

              {!lingoGuessResult?.is_round_over && (
                <div className="w-full flex flex-col gap-2">
                  <input
                    type="text"
                    value={lingoInput}
                    onChange={(e) => {
                      setLingoInput(e.target.value.slice(0, round.lingo_word_length ?? 5));
                      setLingoInputError('');
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleGuessWord();
                    }}
                    disabled={lingoBusy}
                    autoFocus
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    placeholder={t.lingoInputPlaceholder.replace('{n}', String(round.lingo_word_length ?? 5))}
                    className="w-full border-2 rounded-xl px-4 py-3.5 text-base text-center font-medium transition-all outline-none border-gray-200 dark:border-slate-700 focus:border-[#378ADD]"
                  />
                  {lingoInputError && (
                    <p className="text-xs text-red-500 dark:text-red-400 text-center">{lingoInputError}</p>
                  )}
                  <button
                    type="button"
                    onClick={handleGuessWord}
                    disabled={lingoInput.trim().length !== (round.lingo_word_length ?? 5) || lingoBusy}
                    className="w-full bg-[#378ADD] hover:bg-[#2d73c4] disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl py-3 text-sm font-medium transition-colors"
                  >
                    {t.lingoSubmitBtn}
                  </button>
                </div>
              )}
            </>
          )}

          {round && !isWordle && !isLingo && (
            <>
              <p className="text-base font-medium text-gray-900 dark:text-slate-100 text-center py-2">{round.definition}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(round.options ?? []).map((opt) => {
                  const isSelected = selected === opt;
                  const isCorrectOpt = answerResult && opt === answerResult.correct_option;
                  let cls = 'border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800';
                  if (answerResult) {
                    if (isCorrectOpt) cls = 'border-green-400 bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400';
                    else if (isSelected) cls = 'border-red-400 bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400';
                  } else if (isSelected) {
                    cls = 'border-blue-400 bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400';
                  }
                  return (
                    <button
                      key={opt}
                      type="button"
                      disabled={!!selected}
                      onClick={() => handleAnswer(opt)}
                      className={`flex items-center justify-between px-4 py-3 rounded-lg border text-sm font-medium transition-colors disabled:cursor-default ${cls}`}
                    >
                      {opt}
                      {answerResult && isCorrectOpt && <Check className="w-4 h-4 shrink-0" />}
                      {answerResult && isSelected && !isCorrectOpt && <X className="w-4 h-4 shrink-0" />}
                    </button>
                  );
                })}
              </div>
              {answerResult && (
                <p className={`text-sm text-center font-medium ${answerResult.is_correct ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                  {answerResult.is_correct ? t.correctLabel : `${t.wrongLabel} ${t.correctAnswerPrefix} ${answerResult.correct_option}`}
                </p>
              )}
              {selected && !answerResult && (
                <p className="text-xs text-gray-400 dark:text-slate-500 text-center">{t.answeredLabel}</p>
              )}
            </>
          )}

          <div className="border-t border-gray-100 dark:border-slate-800 pt-3 space-y-1">
            {sortedParticipants.map((p) => (
              <div key={p.user_id} className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-slate-400">
                  {p.username || p.user_id.slice(0, 8)} {p.user_id === user?.id && t.youLabel}
                </span>
                <span className="font-semibold text-gray-900 dark:text-slate-100 tabular-nums">
                  {p.score} {t.scoreLabel}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {duel.status === 'finished' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">{t.finishedTitle}</h2>
          </div>
          <div className="space-y-1">
            {sortedParticipants.map((p, i) => (
              <div key={p.user_id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50 dark:bg-slate-800">
                <span className="flex items-center gap-2 text-sm text-gray-700 dark:text-slate-300">
                  <span className="text-xs text-gray-400 dark:text-slate-500 w-4">{i + 1}.</span>
                  {p.username || p.user_id.slice(0, 8)} {p.user_id === user?.id && t.youLabel}
                </span>
                <span className="font-semibold text-gray-900 dark:text-slate-100 tabular-nums">
                  {p.score} {t.scoreLabel}
                </span>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => router.push('/duels')}
            className="w-full px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
          >
            {t.backToLobbyBtn}
          </button>
        </div>
      )}
    </div>
  );
}
