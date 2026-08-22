'use client';

// app/(app)/u/[username]/page.tsx — Madde 6, Faz 1: başkasının profilini
// görüntüleme. Kullanıcı kararıyla HERKESE AÇIK: giriş yapmış her kullanıcı
// istatistik özetini (öğrenilen/öğreniliyor kelime sayısı, güncel seri) ve
// çalışma programını görebilir — ek bir gizlilik/izin kontrolü yok.
// Backend: GET /api/v1/social/profile/{username} (bkz. public_profile_service.py)

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { AxiosError } from 'axios';
import {
  UserPlus, Check, X, Loader2, ArrowLeft, BookOpen, Flame,
  Users, Trophy, CalendarDays, MessageCircle, Ban, Swords,
} from 'lucide-react';
import { socialApi } from '@/lib/api';
import { useLocale, type Locale } from '@/lib/i18n';
import type { PublicProfile } from '@/types';

// backend HTTPException'ların { detail: string } gövdesini `any` kullanmadan
// okumak için (bkz. friends/page.tsx'teki aynı yardımcı).
function errorDetail(err: unknown): string | undefined {
  if (err instanceof AxiosError) {
    return (err.response?.data as { detail?: string } | undefined)?.detail;
  }
  return undefined;
}

// Merkezi i18n.tsx sözlüğüne dokunmadan yerel çeviri — friends/page.tsx ve
// Leaderboard.tsx'teki desenle aynı yaklaşım.
const L: Record<Locale, Record<string, string>> = {
  tr: {
    back: 'Arkadaşlar', notFound: 'Bu kullanıcı bulunamadı.', loading: 'Yükleniyor…', error: 'Profil yüklenemedi.',
    memberSince: 'Katılım', friendsCountLabel: 'arkadaş', followersCountLabel: 'takipçi', followingCountLabel: 'takip',
    sendRequestBtn: 'İstek gönder', requestSentBtn: 'İstek gönderildi', acceptBtn: 'Kabul et', declineBtn: 'Reddet',
    removeFriendBtn: 'Arkadaşlıktan çık', removeConfirm: 'Bu kişiyi arkadaş listenden çıkarmak istediğine emin misin?',
    friendsLabel: 'Arkadaşsınız', followBtn: 'Takip et', unfollowBtn: 'Takipten çık', selfHint: 'Bu senin profilin.',
    statsTitle: 'İstatistikler', totalWordsLabel: 'Toplam kelime', learnedLabel: 'Öğrenilen', learningLabel: 'Öğreniliyor',
    streakLabel: 'Güncel seri', streakUnit: 'gün', scheduleTitle: 'Çalışma programı', scheduleEmpty: 'Aktif bir çalışma programı yok.',
    actionError: 'İşlem başarısız oldu.', levelPrefix: 'Sv.', minLabel: 'dk',
    days: 'Paz,Pzt,Sal,Çar,Per,Cum,Cmt',
    messageBtn: 'Mesaj gönder', blockBtn: 'Engelle',
    blockConfirm: 'Bu kişiyi engellemek istediğine emin misin? Artık birbirinizin mesajlarını, profilini ve arkadaşlık/takip isteklerini göremezsiniz.',
    blockError: 'Engelleme işlemi başarısız oldu.',
    challengeBtn: 'Meydan oku', challengePickModeTitle: 'Hangi oyunla meydan okumak istersin?',
    modeMultipleChoice: 'Çoktan Seçmeli', modeWordle: 'Adam Asmaca', challengeCreateError: 'Meydan okuma gönderilemedi.',
  },
  en: {
    back: 'Friends', notFound: 'This user could not be found.', loading: 'Loading…', error: 'Could not load the profile.',
    memberSince: 'Joined', friendsCountLabel: 'friends', followersCountLabel: 'followers', followingCountLabel: 'following',
    sendRequestBtn: 'Add friend', requestSentBtn: 'Request sent', acceptBtn: 'Accept', declineBtn: 'Decline',
    removeFriendBtn: 'Remove friend', removeConfirm: 'Are you sure you want to remove this person from your friends?',
    friendsLabel: 'Friends', followBtn: 'Follow', unfollowBtn: 'Unfollow', selfHint: 'This is your profile.',
    statsTitle: 'Stats', totalWordsLabel: 'Total words', learnedLabel: 'Learned', learningLabel: 'Learning',
    streakLabel: 'Current streak', streakUnit: 'days', scheduleTitle: 'Study schedule', scheduleEmpty: 'No active study schedule.',
    actionError: 'The action failed.', levelPrefix: 'Lv.', minLabel: 'min',
    days: 'Sun,Mon,Tue,Wed,Thu,Fri,Sat',
    messageBtn: 'Message', blockBtn: 'Block',
    blockConfirm: "Are you sure you want to block this person? You won't be able to see each other's messages, profile, or friend/follow requests anymore.",
    blockError: 'Could not block this user.',
    challengeBtn: 'Challenge', challengePickModeTitle: 'Which game do you want to challenge them to?',
    modeMultipleChoice: 'Multiple Choice', modeWordle: 'Hangman', challengeCreateError: 'Could not send the challenge.',
  },
  de: {
    back: 'Freunde', notFound: 'Dieser Nutzer wurde nicht gefunden.', loading: 'Lädt…', error: 'Profil konnte nicht geladen werden.',
    memberSince: 'Beigetreten', friendsCountLabel: 'Freunde', followersCountLabel: 'Follower', followingCountLabel: 'Folgt',
    sendRequestBtn: 'Freund hinzufügen', requestSentBtn: 'Anfrage gesendet', acceptBtn: 'Annehmen', declineBtn: 'Ablehnen',
    removeFriendBtn: 'Freundschaft beenden', removeConfirm: 'Möchtest du diese Person wirklich aus deiner Freundesliste entfernen?',
    friendsLabel: 'Befreundet', followBtn: 'Folgen', unfollowBtn: 'Entfolgen', selfHint: 'Das ist dein Profil.',
    statsTitle: 'Statistiken', totalWordsLabel: 'Wörter gesamt', learnedLabel: 'Gelernt', learningLabel: 'Wird gelernt',
    streakLabel: 'Aktuelle Serie', streakUnit: 'Tage', scheduleTitle: 'Lernplan', scheduleEmpty: 'Kein aktiver Lernplan.',
    actionError: 'Aktion fehlgeschlagen.', levelPrefix: 'Lvl.', minLabel: 'Min.',
    days: 'So,Mo,Di,Mi,Do,Fr,Sa',
    messageBtn: 'Nachricht', blockBtn: 'Blockieren',
    blockConfirm: 'Möchtest du diese Person wirklich blockieren? Ihr könnt dann gegenseitig keine Nachrichten, Profile oder Freundschafts-/Folge-Anfragen mehr sehen.',
    blockError: 'Blockieren fehlgeschlagen.',
    challengeBtn: 'Herausfordern', challengePickModeTitle: 'Zu welchem Spiel möchtest du herausfordern?',
    modeMultipleChoice: 'Multiple Choice', modeWordle: 'Galgenmännchen', challengeCreateError: 'Herausforderung konnte nicht gesendet werden.',
  },
  fr: {
    back: 'Amis', notFound: "Cet utilisateur est introuvable.", loading: 'Chargement…', error: "Le profil n'a pas pu être chargé.",
    memberSince: 'Inscrit le', friendsCountLabel: 'amis', followersCountLabel: 'abonnés', followingCountLabel: 'abonnements',
    sendRequestBtn: 'Ajouter en ami', requestSentBtn: 'Demande envoyée', acceptBtn: 'Accepter', declineBtn: 'Refuser',
    removeFriendBtn: "Retirer de mes amis", removeConfirm: 'Veux-tu vraiment retirer cette personne de tes amis ?',
    friendsLabel: 'Amis', followBtn: 'Suivre', unfollowBtn: 'Ne plus suivre', selfHint: 'Ceci est ton profil.',
    statsTitle: 'Statistiques', totalWordsLabel: 'Mots au total', learnedLabel: 'Appris', learningLabel: 'En apprentissage',
    streakLabel: 'Série actuelle', streakUnit: 'jours', scheduleTitle: "Programme d'étude", scheduleEmpty: "Aucun programme d'étude actif.",
    actionError: "L'action a échoué.", levelPrefix: 'Niv.', minLabel: 'min',
    days: 'Dim,Lun,Mar,Mer,Jeu,Ven,Sam',
    messageBtn: 'Envoyer un message', blockBtn: 'Bloquer',
    blockConfirm: "Es-tu sûr(e) de vouloir bloquer cette personne ? Vous ne pourrez plus voir vos messages, profils ni demandes d'ami/abonnement respectifs.",
    blockError: "Le blocage a échoué.",
    challengeBtn: 'Défier', challengePickModeTitle: 'À quel jeu veux-tu le/la défier ?',
    modeMultipleChoice: 'Choix multiple', modeWordle: 'Pendu', challengeCreateError: "Le défi n'a pas pu être envoyé.",
  },
  es: {
    back: 'Amigos', notFound: 'No se encontró este usuario.', loading: 'Cargando…', error: 'No se pudo cargar el perfil.',
    memberSince: 'Se unió', friendsCountLabel: 'amigos', followersCountLabel: 'seguidores', followingCountLabel: 'siguiendo',
    sendRequestBtn: 'Añadir amigo', requestSentBtn: 'Solicitud enviada', acceptBtn: 'Aceptar', declineBtn: 'Rechazar',
    removeFriendBtn: 'Eliminar amistad', removeConfirm: '¿Seguro que quieres quitar a esta persona de tus amigos?',
    friendsLabel: 'Amigos', followBtn: 'Seguir', unfollowBtn: 'Dejar de seguir', selfHint: 'Este es tu perfil.',
    statsTitle: 'Estadísticas', totalWordsLabel: 'Palabras totales', learnedLabel: 'Aprendidas', learningLabel: 'Aprendiendo',
    streakLabel: 'Racha actual', streakUnit: 'días', scheduleTitle: 'Horario de estudio', scheduleEmpty: 'No hay un horario de estudio activo.',
    actionError: 'La acción falló.', levelPrefix: 'Niv.', minLabel: 'min',
    days: 'Dom,Lun,Mar,Mié,Jue,Vie,Sáb',
    messageBtn: 'Enviar mensaje', blockBtn: 'Bloquear',
    blockConfirm: '¿Seguro que quieres bloquear a esta persona? Ya no podrán ver sus mensajes, perfil ni solicitudes de amistad/seguimiento.',
    blockError: 'No se pudo bloquear a este usuario.',
    challengeBtn: 'Desafiar', challengePickModeTitle: '¿A qué juego quieres desafiarlo/a?',
    modeMultipleChoice: 'Opción múltiple', modeWordle: 'Ahorcado', challengeCreateError: 'No se pudo enviar el desafío.',
  },
  it: {
    back: 'Amici', notFound: 'Utente non trovato.', loading: 'Caricamento…', error: 'Impossibile caricare il profilo.',
    memberSince: 'Iscritto il', friendsCountLabel: 'amici', followersCountLabel: 'follower', followingCountLabel: 'seguiti',
    sendRequestBtn: 'Aggiungi amico', requestSentBtn: 'Richiesta inviata', acceptBtn: 'Accetta', declineBtn: 'Rifiuta',
    removeFriendBtn: 'Rimuovi amicizia', removeConfirm: 'Sei sicuro di voler rimuovere questa persona dai tuoi amici?',
    friendsLabel: 'Amici', followBtn: 'Segui', unfollowBtn: 'Smetti di seguire', selfHint: 'Questo è il tuo profilo.',
    statsTitle: 'Statistiche', totalWordsLabel: 'Parole totali', learnedLabel: 'Imparate', learningLabel: 'In corso',
    streakLabel: 'Serie attuale', streakUnit: 'giorni', scheduleTitle: 'Programma di studio', scheduleEmpty: 'Nessun programma di studio attivo.',
    actionError: "L'azione non è riuscita.", levelPrefix: 'Liv.', minLabel: 'min',
    days: 'Dom,Lun,Mar,Mer,Gio,Ven,Sab',
    messageBtn: 'Invia messaggio', blockBtn: 'Blocca',
    blockConfirm: 'Sei sicuro di voler bloccare questa persona? Non potrete più vedere i rispettivi messaggi, profilo o richieste di amicizia/follow.',
    blockError: 'Impossibile bloccare questo utente.',
    challengeBtn: 'Sfida', challengePickModeTitle: 'A quale gioco vuoi sfidarlo/a?',
    modeMultipleChoice: 'Scelta multipla', modeWordle: 'Impiccato', challengeCreateError: 'Impossibile inviare la sfida.',
  },
  ar: {
    back: 'الأصدقاء', notFound: 'لم يتم العثور على هذا المستخدم.', loading: 'جارٍ التحميل…', error: 'تعذّر تحميل الملف الشخصي.',
    memberSince: 'تاريخ الانضمام', friendsCountLabel: 'أصدقاء', followersCountLabel: 'متابعون', followingCountLabel: 'يتابع',
    sendRequestBtn: 'إضافة صديق', requestSentBtn: 'تم إرسال الطلب', acceptBtn: 'قبول', declineBtn: 'رفض',
    removeFriendBtn: 'إلغاء الصداقة', removeConfirm: 'هل أنت متأكد أنك تريد إزالة هذا الشخص من أصدقائك؟',
    friendsLabel: 'أصدقاء', followBtn: 'متابعة', unfollowBtn: 'إلغاء المتابعة', selfHint: 'هذا هو ملفك الشخصي.',
    statsTitle: 'الإحصائيات', totalWordsLabel: 'إجمالي الكلمات', learnedLabel: 'تم تعلمها', learningLabel: 'قيد التعلم',
    streakLabel: 'السلسلة الحالية', streakUnit: 'يوم', scheduleTitle: 'برنامج الدراسة', scheduleEmpty: 'لا يوجد برنامج دراسة نشط.',
    actionError: 'فشل الإجراء.', levelPrefix: 'مستوى', minLabel: 'د',
    days: 'الأحد,الاثنين,الثلاثاء,الأربعاء,الخميس,الجمعة,السبت',
    messageBtn: 'إرسال رسالة', blockBtn: 'حظر',
    blockConfirm: 'هل أنت متأكد أنك تريد حظر هذا الشخص؟ لن تتمكنا بعد ذلك من رؤية رسائل بعضكما أو الملف الشخصي أو طلبات الصداقة/المتابعة.',
    blockError: 'تعذّر حظر هذا المستخدم.',
    challengeBtn: 'مبارزة', challengePickModeTitle: 'بأي لعبة تريد مبارزته؟',
    modeMultipleChoice: 'اختيار من متعدد', modeWordle: 'المشنقة', challengeCreateError: 'تعذّر إرسال المبارزة.',
  },
  ru: {
    back: 'Друзья', notFound: 'Этот пользователь не найден.', loading: 'Загрузка…', error: 'Не удалось загрузить профиль.',
    memberSince: 'В Lexis с', friendsCountLabel: 'друзей', followersCountLabel: 'подписчиков', followingCountLabel: 'подписок',
    sendRequestBtn: 'Добавить в друзья', requestSentBtn: 'Заявка отправлена', acceptBtn: 'Принять', declineBtn: 'Отклонить',
    removeFriendBtn: 'Удалить из друзей', removeConfirm: 'Вы уверены, что хотите удалить этого человека из друзей?',
    friendsLabel: 'Друзья', followBtn: 'Подписаться', unfollowBtn: 'Отписаться', selfHint: 'Это твой профиль.',
    statsTitle: 'Статистика', totalWordsLabel: 'Всего слов', learnedLabel: 'Выучено', learningLabel: 'Изучается',
    streakLabel: 'Текущая серия', streakUnit: 'дн.', scheduleTitle: 'Расписание занятий', scheduleEmpty: 'Нет активного расписания занятий.',
    actionError: 'Действие не выполнено.', levelPrefix: 'Ур.', minLabel: 'мин',
    days: 'Вс,Пн,Вт,Ср,Чт,Пт,Сб',
    messageBtn: 'Написать сообщение', blockBtn: 'Заблокировать',
    blockConfirm: 'Вы уверены, что хотите заблокировать этого человека? Вы больше не сможете видеть сообщения, профиль и заявки в друзья/подписку друг друга.',
    blockError: 'Не удалось заблокировать пользователя.',
    challengeBtn: 'Бросить вызов', challengePickModeTitle: 'В какую игру хотите бросить вызов?',
    modeMultipleChoice: 'Множественный выбор', modeWordle: 'Виселица', challengeCreateError: 'Не удалось отправить вызов.',
  },
  ja: {
    back: '友達', notFound: 'このユーザーは見つかりませんでした。', loading: '読み込み中…', error: 'プロフィールを読み込めませんでした。',
    memberSince: '登録日', friendsCountLabel: '友達', followersCountLabel: 'フォロワー', followingCountLabel: 'フォロー中',
    sendRequestBtn: '友達に追加', requestSentBtn: 'リクエスト送信済み', acceptBtn: '承認', declineBtn: '拒否',
    removeFriendBtn: '友達を解除', removeConfirm: 'この人を友達リストから削除してもよろしいですか?',
    friendsLabel: '友達', followBtn: 'フォロー', unfollowBtn: 'フォロー解除', selfHint: 'あなたのプロフィールです。',
    statsTitle: '統計', totalWordsLabel: '総単語数', learnedLabel: '習得済み', learningLabel: '学習中',
    streakLabel: '現在の連続記録', streakUnit: '日', scheduleTitle: '学習スケジュール', scheduleEmpty: '有効な学習スケジュールはありません。',
    actionError: '操作に失敗しました。', levelPrefix: 'Lv.', minLabel: '分',
    days: '日,月,火,水,木,金,土',
    messageBtn: 'メッセージを送る', blockBtn: 'ブロック',
    blockConfirm: 'このユーザーをブロックしますか?ブロックすると、お互いのメッセージ、プロフィール、フレンド/フォローリクエストが見られなくなります。',
    blockError: 'このユーザーをブロックできませんでした。',
    challengeBtn: 'チャレンジする', challengePickModeTitle: 'どのゲームでチャレンジしますか?',
    modeMultipleChoice: '四択', modeWordle: 'ハングマン', challengeCreateError: 'チャレンジを送信できませんでした。',
  },
};

function initial(name: string): string {
  return (name || '?').charAt(0).toUpperCase();
}

// Madde 6, Faz 3 — mevcut oyun sayfası (game/page.tsx) sadece bu iki modu
// oynanabilir şekilde uyguluyor (typing/matching/listening/sprint enum'da
// var ama UI'da yok) — meydan okuma modu seçimi bu yüzden ikisiyle sınırlı.
const CHALLENGE_MODES: { value: string; labelKey: 'modeMultipleChoice' | 'modeWordle' }[] = [
  { value: 'multiple_choice', labelKey: 'modeMultipleChoice' },
  { value: 'wordle', labelKey: 'modeWordle' },
];

export default function PublicProfilePage() {
  const params = useParams<{ username: string }>();
  const username = decodeURIComponent(params.username);
  const router = useRouter();
  const { locale } = useLocale();
  const t = L[locale] ?? L.en;
  const days = t.days.split(',');

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');

  // Madde 6, Faz 3 — Meydan okuma oluşturma
  const [showChallengePicker, setShowChallengePicker] = useState(false);
  const [challengeBusy, setChallengeBusy] = useState(false);
  const [challengeCreateError, setChallengeCreateError] = useState('');

  const load = () => {
    setLoading(true);
    setError(false);
    setNotFound(false);
    socialApi.getPublicProfile(username)
      .then(setProfile)
      .catch((err) => {
        if (err?.response?.status === 404) setNotFound(true);
        else setError(true);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount/parametre değişiminde veri çekme (fetch-on-effect) deseni; senkron setState çağrısı kasıtlı, davranış değiştirilmedi
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username]);

  const handleToggleFollow = async () => {
    if (!profile) return;
    setBusy(true);
    setActionError('');
    try {
      if (profile.is_following) {
        await socialApi.unfollow(profile.id);
      } else {
        await socialApi.follow(profile.id);
      }
      setProfile({ ...profile, is_following: !profile.is_following });
    } catch {
      setActionError(t.actionError);
    } finally {
      setBusy(false);
    }
  };

  const handleSendRequest = async () => {
    if (!profile?.username) return;
    setBusy(true);
    setActionError('');
    try {
      const res = await socialApi.sendFriendRequest(profile.username);
      setProfile({ ...profile, relationship_status: 'pending_sent', friendship_id: res.id });
    } catch (err) {
      setActionError(errorDetail(err) || t.actionError);
    } finally {
      setBusy(false);
    }
  };

  const handleAccept = async () => {
    if (!profile?.friendship_id) return;
    setBusy(true);
    setActionError('');
    try {
      await socialApi.acceptFriendRequest(profile.friendship_id);
      load();
    } catch {
      setActionError(t.actionError);
    } finally {
      setBusy(false);
    }
  };

  const handleDecline = async () => {
    if (!profile?.friendship_id) return;
    setBusy(true);
    setActionError('');
    try {
      await socialApi.declineFriendRequest(profile.friendship_id);
      load();
    } catch {
      setActionError(t.actionError);
    } finally {
      setBusy(false);
    }
  };

  const handleRemoveFriend = async () => {
    if (!profile) return;
    if (!window.confirm(t.removeConfirm)) return;
    setBusy(true);
    setActionError('');
    try {
      await socialApi.removeFriend(profile.id);
      load();
    } catch {
      setActionError(t.actionError);
    } finally {
      setBusy(false);
    }
  };

  // Madde 6, Faz 2 — engelleme. Engellendikten sonra bu profil zaten
  // görüntülenemez olacağı için (backend 403 döner), işlem başarılı
  // olunca kullanıcıyı arkadaşlar listesine yönlendiriyoruz. Engeli
  // kaldırma işlemi burada değil, profile sayfasındaki "Engellenenler"
  // bölümünden yapılıyor (bkz. profile/page.tsx).
  const handleBlock = async () => {
    if (!profile) return;
    if (!window.confirm(t.blockConfirm)) return;
    setBusy(true);
    setActionError('');
    try {
      await socialApi.blockUser(profile.id);
      router.push('/friends');
    } catch (err) {
      setActionError(errorDetail(err) || t.blockError);
      setBusy(false);
    }
  };

  // Madde 6, Faz 3 — meydan okuma gönder. Başarılı olunca Arkadaşlar
  // sayfasının Meydan Okumalar sekmesine yönlendiriyoruz (bkz. friends/
  // page.tsx'teki ?tab=challenges desteği).
  const handleCreateChallenge = async (mode: string) => {
    if (!profile?.username) return;
    setChallengeBusy(true);
    setChallengeCreateError('');
    try {
      await socialApi.createChallenge(profile.username, mode);
      router.push('/friends?tab=challenges');
    } catch (err) {
      setChallengeCreateError(errorDetail(err) || t.challengeCreateError);
      setChallengeBusy(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-sm text-gray-400 dark:text-slate-500">{t.loading}</div>;
  }

  if (notFound) {
    return (
      <div className="p-6 max-w-lg">
        <p className="text-sm text-gray-500 dark:text-slate-400 bg-gray-50 dark:bg-slate-800 rounded-xl px-4 py-3">{t.notFound}</p>
        <button onClick={() => router.push('/friends')} className="mt-3 flex items-center gap-1.5 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 hover:dark:text-blue-400">
          <ArrowLeft className="w-4 h-4" />{t.back}
        </button>
      </div>
    );
  }

  if (error || !profile) {
    return <div className="p-6 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 rounded-xl max-w-lg">{t.error}</div>;
  }

  const name = profile.display_name || profile.username || '?';
  const isSelf = profile.relationship_status === 'self';

  return (
    <div className="p-6 max-w-2xl space-y-4">
      <Link href="/friends" className="flex items-center gap-1.5 text-sm text-gray-400 dark:text-slate-500 hover:text-gray-600 hover:dark:text-slate-400 w-fit">
        <ArrowLeft className="w-4 h-4" />{t.back}
      </Link>

      {actionError && <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 rounded-xl px-3 py-2">{actionError}</p>}

      {/* Başlık kartı */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-6">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center text-white text-2xl font-semibold shrink-0">
            {initial(name)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-gray-900 dark:text-slate-100 truncate">{name}</h1>
              <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 rounded-full px-2 py-0.5 flex items-center gap-1 shrink-0">
                <Trophy className="w-3 h-3" />{t.levelPrefix} {profile.level}
              </span>
            </div>
            {profile.username && <p className="text-sm text-gray-400 dark:text-slate-500">@{profile.username}</p>}
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
              {t.memberSince} {new Date(profile.created_at).toLocaleDateString(locale)}
            </p>

            <div className="flex items-center gap-4 mt-3 text-xs text-gray-500 dark:text-slate-400">
              <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{profile.friend_count} {t.friendsCountLabel}</span>
              <span>{profile.follower_count} {t.followersCountLabel}</span>
              <span>{profile.following_count} {t.followingCountLabel}</span>
            </div>
          </div>
        </div>

        {/* Aksiyonlar */}
        {isSelf ? (
          <p className="text-xs text-gray-400 dark:text-slate-500 mt-4">{t.selfHint}</p>
        ) : (
          <div className="flex items-center gap-2 flex-wrap mt-4 pt-4 border-t border-gray-100 dark:border-slate-800">
            {profile.username && (
              <Link
                href={`/messages/${profile.username}`}
                className="flex items-center gap-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl px-3.5 py-2"
              >
                <MessageCircle className="w-4 h-4" />{t.messageBtn}
              </Link>
            )}
            <button
              type="button"
              disabled={busy}
              onClick={handleToggleFollow}
              className={`text-sm font-medium rounded-xl px-3.5 py-2 disabled:opacity-50 transition-colors ${
                profile.is_following ? 'text-gray-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 hover:dark:bg-slate-800' : 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 hover:dark:bg-blue-500/15'
              }`}
            >
              {profile.is_following ? t.unfollowBtn : t.followBtn}
            </button>

            {profile.relationship_status === 'none' && (
              <button
                type="button"
                disabled={busy}
                onClick={handleSendRequest}
                className="flex items-center gap-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl px-3.5 py-2"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}{t.sendRequestBtn}
              </button>
            )}

            {profile.relationship_status === 'pending_sent' && (
              <span className="text-sm font-medium text-gray-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800 rounded-xl px-3.5 py-2">{t.requestSentBtn}</span>
            )}

            {profile.relationship_status === 'pending_received' && (
              <>
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleAccept}
                  className="flex items-center gap-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl px-3.5 py-2"
                >
                  <Check className="w-4 h-4" />{t.acceptBtn}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleDecline}
                  className="flex items-center gap-1.5 text-sm font-medium text-gray-500 dark:text-slate-400 hover:text-gray-700 hover:dark:text-slate-300 disabled:opacity-50 rounded-xl px-3.5 py-2"
                >
                  <X className="w-4 h-4" />{t.declineBtn}
                </button>
              </>
            )}

            {profile.relationship_status === 'friends' && (
              <>
                <span className="text-sm font-medium text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-500/10 rounded-xl px-3.5 py-2">{t.friendsLabel}</span>
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleRemoveFriend}
                  className="text-sm font-medium text-red-500 dark:text-red-400 hover:text-red-600 hover:dark:text-red-400 disabled:opacity-50 rounded-xl px-3.5 py-2"
                >
                  {t.removeFriendBtn}
                </button>
                <button
                  type="button"
                  disabled={challengeBusy}
                  onClick={() => setShowChallengePicker((v) => !v)}
                  className="flex items-center gap-1.5 text-sm font-medium text-[#534AB7] bg-[#EEEDFE] hover:bg-[#e0ddfc] disabled:opacity-50 rounded-xl px-3.5 py-2"
                >
                  <Swords className="w-4 h-4" />{t.challengeBtn}
                </button>
              </>
            )}

            <button
              type="button"
              disabled={busy}
              onClick={handleBlock}
              className="flex items-center gap-1.5 text-sm font-medium text-gray-400 dark:text-slate-500 hover:text-red-500 hover:dark:text-red-400 disabled:opacity-50 rounded-xl px-3.5 py-2 ml-auto"
            >
              <Ban className="w-4 h-4" />{t.blockBtn}
            </button>

            {showChallengePicker && (
              <div className="w-full mt-2 pt-3 border-t border-gray-100 dark:border-slate-800">
                <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 mb-2">{t.challengePickModeTitle}</p>
                {challengeCreateError && (
                  <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 rounded-lg px-2.5 py-1.5 mb-2">{challengeCreateError}</p>
                )}
                <div className="flex items-center gap-2 flex-wrap">
                  {CHALLENGE_MODES.map((m) => (
                    <button
                      key={m.value}
                      type="button"
                      disabled={challengeBusy}
                      onClick={() => handleCreateChallenge(m.value)}
                      className="flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-slate-300 border-2 border-gray-200 dark:border-slate-700 hover:border-[#534AB7] hover:bg-[#EEEDFE] disabled:opacity-50 rounded-xl px-3.5 py-2"
                    >
                      {challengeBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                      {t[m.labelKey]}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* İstatistikler */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-4">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-3 flex items-center gap-1.5">
          <BookOpen className="w-4 h-4 text-blue-500 dark:text-blue-400" />{t.statsTitle}
        </h2>
        <div className="grid grid-cols-4 gap-3 text-center">
          <div>
            <p className="text-lg font-semibold text-gray-900 dark:text-slate-100">{profile.stats.total_words}</p>
            <p className="text-[11px] text-gray-400 dark:text-slate-500">{t.totalWordsLabel}</p>
          </div>
          <div>
            <p className="text-lg font-semibold text-gray-900 dark:text-slate-100">{profile.stats.learned}</p>
            <p className="text-[11px] text-gray-400 dark:text-slate-500">{t.learnedLabel}</p>
          </div>
          <div>
            <p className="text-lg font-semibold text-gray-900 dark:text-slate-100">{profile.stats.learning}</p>
            <p className="text-[11px] text-gray-400 dark:text-slate-500">{t.learningLabel}</p>
          </div>
          <div>
            <p className="text-lg font-semibold text-gray-900 dark:text-slate-100 flex items-center justify-center gap-1">
              <Flame className="w-3.5 h-3.5 text-orange-400" />{profile.stats.current_streak}
            </p>
            <p className="text-[11px] text-gray-400 dark:text-slate-500">{t.streakLabel} ({t.streakUnit})</p>
          </div>
        </div>
      </div>

      {/* Çalışma programı */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-4">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-3 flex items-center gap-1.5">
          <CalendarDays className="w-4 h-4 text-blue-500 dark:text-blue-400" />{t.scheduleTitle}
        </h2>
        {profile.schedule.length === 0 ? (
          <p className="text-xs text-gray-400 dark:text-slate-500">{t.scheduleEmpty}</p>
        ) : (
          <div className="space-y-1.5">
            {profile.schedule.map((item, i) => (
              <div key={i} className="flex items-center justify-between text-sm rounded-xl px-2.5 py-2 hover:bg-slate-50 hover:dark:bg-slate-800">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 rounded-lg px-2 py-0.5 shrink-0">
                    {days[item.day_of_week] ?? item.day_of_week}
                  </span>
                  <span className="text-xs text-gray-400 dark:text-slate-500 shrink-0">{item.time_slot}</span>
                  <span className="text-gray-700 dark:text-slate-300 truncate">{item.activity}</span>
                </div>
                <span className="text-xs text-gray-400 dark:text-slate-500 shrink-0">{item.duration_min} {t.minLabel}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
