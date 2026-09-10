'use client';

// app/(app)/duels/[id]/page.tsx — V2 §6.3 Faz 3a/3e: Düello odası.
// Bekleme odası (katılımcı listesi + başlat) -> aktif tur (tanım + 4
// seçenek, canlı sayaç) -> bitiş (final skor tablosu). Gerçek zamanlı
// yayın (Realtime) YOK — bilinçli olarak POLLING kullanılıyor (bkz.
// backend/app/api/routes/duels.py modül docstring'i, alt-faz 3e notu).
// Backend: /api/v1/duels/* (bkz. backend/app/api/routes/duels.py)

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AxiosError } from 'axios';
import { Swords, Loader2, Play, LogOut, Check, X, Trophy } from 'lucide-react';
import { duelsApi } from '@/lib/api';
import { useAuth } from '@/store/auth';
import { useLocale, type Locale } from '@/lib/i18n';
import type { DuelStatusResponse, DuelRoundPublic } from '@/types';

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
    leaveBtn: 'Odadan Ayrıl', hostOnlyLabel: 'Sadece oda sahibi başlatabilir.',
    roundLabel: 'Tur', answeredLabel: 'Cevap gönderildi, tur bekleniyor…',
    correctLabel: 'Doğru! 🎉', wrongLabel: 'Yanlış.', correctAnswerPrefix: 'Doğru cevap:',
    finishedTitle: 'Düello Bitti', backToLobbyBtn: 'Lobiye Dön',
    youLabel: '(sen)', scoreLabel: 'puan', waitingRoundLabel: 'Sıradaki tur hazırlanıyor…',
  },
  en: {
    loading: 'Loading…', error: 'Something went wrong.',
    waitingTitle: 'Waiting Room', waitingSub: 'Waiting for other players…',
    startBtn: 'Start', needMoreLabel: 'At least 2 players are needed to start.',
    leaveBtn: 'Leave Room', hostOnlyLabel: 'Only the host can start.',
    roundLabel: 'Round', answeredLabel: 'Answer submitted, waiting for the round…',
    correctLabel: 'Correct! 🎉', wrongLabel: 'Wrong.', correctAnswerPrefix: 'Correct answer:',
    finishedTitle: 'Duel Over', backToLobbyBtn: 'Back to Lobby',
    youLabel: '(you)', scoreLabel: 'pts', waitingRoundLabel: 'Preparing the next round…',
  },
  de: {
    loading: 'Wird geladen…', error: 'Etwas ist schiefgelaufen.',
    waitingTitle: 'Warteraum', waitingSub: 'Warten auf weitere Spieler…',
    startBtn: 'Starten', needMoreLabel: 'Es werden mindestens 2 Spieler benötigt.',
    leaveBtn: 'Raum verlassen', hostOnlyLabel: 'Nur der Gastgeber kann starten.',
    roundLabel: 'Runde', answeredLabel: 'Antwort gesendet, warte auf die Runde…',
    correctLabel: 'Richtig! 🎉', wrongLabel: 'Falsch.', correctAnswerPrefix: 'Richtige Antwort:',
    finishedTitle: 'Duell beendet', backToLobbyBtn: 'Zurück zur Lobby',
    youLabel: '(du)', scoreLabel: 'Pkt.', waitingRoundLabel: 'Nächste Runde wird vorbereitet…',
  },
  fr: {
    loading: 'Chargement…', error: "Une erreur s'est produite.",
    waitingTitle: "Salle d'attente", waitingSub: "En attente d'autres joueurs…",
    startBtn: 'Démarrer', needMoreLabel: 'Au moins 2 joueurs sont nécessaires pour démarrer.',
    leaveBtn: 'Quitter la salle', hostOnlyLabel: "Seul l'hôte peut démarrer.",
    roundLabel: 'Manche', answeredLabel: 'Réponse envoyée, en attente de la manche…',
    correctLabel: 'Correct ! 🎉', wrongLabel: 'Incorrect.', correctAnswerPrefix: 'Bonne réponse :',
    finishedTitle: 'Duel terminé', backToLobbyBtn: 'Retour au lobby',
    youLabel: '(toi)', scoreLabel: 'pts', waitingRoundLabel: 'Préparation de la prochaine manche…',
  },
  es: {
    loading: 'Cargando…', error: 'Algo salió mal.',
    waitingTitle: 'Sala de espera', waitingSub: 'Esperando a otros jugadores…',
    startBtn: 'Comenzar', needMoreLabel: 'Se necesitan al menos 2 jugadores para comenzar.',
    leaveBtn: 'Salir de la sala', hostOnlyLabel: 'Solo el anfitrión puede comenzar.',
    roundLabel: 'Ronda', answeredLabel: 'Respuesta enviada, esperando la ronda…',
    correctLabel: '¡Correcto! 🎉', wrongLabel: 'Incorrecto.', correctAnswerPrefix: 'Respuesta correcta:',
    finishedTitle: 'Duelo terminado', backToLobbyBtn: 'Volver al lobby',
    youLabel: '(tú)', scoreLabel: 'pts', waitingRoundLabel: 'Preparando la siguiente ronda…',
  },
  it: {
    loading: 'Caricamento…', error: 'Qualcosa è andato storto.',
    waitingTitle: "Sala d'attesa", waitingSub: 'In attesa di altri giocatori…',
    startBtn: 'Inizia', needMoreLabel: 'Servono almeno 2 giocatori per iniziare.',
    leaveBtn: 'Esci dalla stanza', hostOnlyLabel: "Solo l'host può iniziare.",
    roundLabel: 'Turno', answeredLabel: 'Risposta inviata, in attesa del turno…',
    correctLabel: 'Corretto! 🎉', wrongLabel: 'Sbagliato.', correctAnswerPrefix: 'Risposta corretta:',
    finishedTitle: 'Duello finito', backToLobbyBtn: 'Torna alla lobby',
    youLabel: '(tu)', scoreLabel: 'pt', waitingRoundLabel: 'Preparazione del prossimo turno…',
  },
  ar: {
    loading: 'جارٍ التحميل…', error: 'حدث خطأ ما.',
    waitingTitle: 'غرفة الانتظار', waitingSub: 'في انتظار لاعبين آخرين…',
    startBtn: 'ابدأ', needMoreLabel: 'يلزم لاعبان على الأقل للبدء.',
    leaveBtn: 'مغادرة الغرفة', hostOnlyLabel: 'فقط صاحب الغرفة يمكنه البدء.',
    roundLabel: 'جولة', answeredLabel: 'تم إرسال الإجابة، بانتظار الجولة…',
    correctLabel: 'إجابة صحيحة! 🎉', wrongLabel: 'إجابة خاطئة.', correctAnswerPrefix: 'الإجابة الصحيحة:',
    finishedTitle: 'انتهت المبارزة', backToLobbyBtn: 'العودة إلى الصالة',
    youLabel: '(أنت)', scoreLabel: 'نقطة', waitingRoundLabel: 'يتم تجهيز الجولة التالية…',
  },
  ru: {
    loading: 'Загрузка…', error: 'Что-то пошло не так.',
    waitingTitle: 'Комната ожидания', waitingSub: 'Ожидание других игроков…',
    startBtn: 'Начать', needMoreLabel: 'Для начала нужно как минимум 2 игрока.',
    leaveBtn: 'Покинуть комнату', hostOnlyLabel: 'Начать может только хозяин комнаты.',
    roundLabel: 'Раунд', answeredLabel: 'Ответ отправлен, ожидание раунда…',
    correctLabel: 'Правильно! 🎉', wrongLabel: 'Неправильно.', correctAnswerPrefix: 'Правильный ответ:',
    finishedTitle: 'Дуэль окончена', backToLobbyBtn: 'Вернуться в лобби',
    youLabel: '(ты)', scoreLabel: 'очк.', waitingRoundLabel: 'Подготовка следующего раунда…',
  },
  ja: {
    loading: '読み込み中…', error: '問題が発生しました。',
    waitingTitle: '待機ルーム', waitingSub: '他のプレイヤーを待っています…',
    startBtn: '開始', needMoreLabel: '開始するには2人以上のプレイヤーが必要です。',
    leaveBtn: 'ルームを退出', hostOnlyLabel: 'ホストのみ開始できます。',
    roundLabel: 'ラウンド', answeredLabel: '回答を送信しました、ラウンドを待っています…',
    correctLabel: '正解! 🎉', wrongLabel: '不正解。', correctAnswerPrefix: '正解:',
    finishedTitle: 'デュエル終了', backToLobbyBtn: 'ロビーに戻る',
    youLabel: '(あなた)', scoreLabel: '点', waitingRoundLabel: '次のラウンドを準備中…',
  },
  pt: {
    loading: 'Carregando…', error: 'Algo deu errado.',
    waitingTitle: 'Sala de Espera', waitingSub: 'Aguardando outros jogadores…',
    startBtn: 'Iniciar', needMoreLabel: 'São necessários pelo menos 2 jogadores para iniciar.',
    leaveBtn: 'Sair da Sala', hostOnlyLabel: 'Somente o anfitrião pode iniciar.',
    roundLabel: 'Rodada', answeredLabel: 'Resposta enviada, aguardando a rodada…',
    correctLabel: 'Correto! 🎉', wrongLabel: 'Errado.', correctAnswerPrefix: 'Resposta correta:',
    finishedTitle: 'Duelo Encerrado', backToLobbyBtn: 'Voltar ao Lobby',
    youLabel: '(você)', scoreLabel: 'pts', waitingRoundLabel: 'Preparando a próxima rodada…',
  },
};

const POLL_MS = 2000;

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

  const lastRoundIndex = useRef<number | null>(null);

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
        }
        if (!r.started_at) {
          const started = await duelsApi.beginRound(duelId);
          setRound(started);
        } else {
          setRound(r);
          const ended = r.ends_at ? new Date(r.ends_at).getTime() <= Date.now() : false;
          if (ended || answerResult) {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duelId, answerResult]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount/parametre değişiminde veri çekme (fetch-on-effect) deseni; senkron setState çağrısı kasıtlı, davranış değiştirilmedi
    tick();
    const interval = setInterval(tick, POLL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duelId]);

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
  const secondsLeft = round?.ends_at ? Math.max(0, Math.ceil((new Date(round.ends_at).getTime() - now) / 1000)) : null;
  const sortedParticipants = [...duel.participants].sort((a, b) => b.score - a.score);

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8 space-y-6">
      <div className="flex items-center gap-3">
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

          {round && (
            <>
              <p className="text-base font-medium text-gray-900 dark:text-slate-100 text-center py-2">{round.definition}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {round.options.map((opt) => {
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
