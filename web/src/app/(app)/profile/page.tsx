'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AxiosError } from 'axios';
import { User, Save, CheckCircle, Lock, Mail, AtSign, Eye, EyeOff, Globe, GraduationCap, Plus, Ban, Trash2 } from 'lucide-react';
import { authApi, languagesApi, userLanguagesApi, socialApi } from '@/lib/api';
import { useAuth } from '@/store/auth';
import { useLocale, LOCALE_META, type Locale } from '@/lib/i18n';
import { BadgeShowcase } from '@/components/layout/BadgeShowcase';
import type { User as UserType, Language, UserLanguage, UserCard } from '@/types';

// backend HTTPException'ların { detail: string } gövdesini `any` kullanmadan
// okumak için — dosyadaki tüm catch bloklarında (legacy dahil) bu yardımcı
// kullanılıyor, friends/page.tsx'teki desenle aynı.
function errorDetail(err: unknown): string | undefined {
  if (err instanceof AxiosError) {
    return (err.response?.data as { detail?: string } | undefined)?.detail;
  }
  return undefined;
}

// Madde 6, Faz 2 — Engellenenler bölümü. Merkezi i18n.tsx sözlüğüne
// dokunmadan yerel çeviri (Sidebar.tsx/friends/page.tsx'teki desenle aynı).
const BLOCK_LABELS: Record<
  Locale,
  {
    title: string;
    loading: string;
    empty: string;
    emptySub: string;
    unblockBtn: string;
    unblockConfirm: string;
    error: string;
    levelPrefix: string;
  }
> = {
  tr: { title: 'Engellenenler', loading: 'Yükleniyor…', empty: 'Kimseyi engellemedin.', emptySub: 'Engellediğin kullanıcılar burada listelenir.', unblockBtn: 'Engeli kaldır', unblockConfirm: 'Bu kişinin engelini kaldırmak istediğine emin misin?', error: 'İşlem başarısız oldu.', levelPrefix: 'Sv.' },
  en: { title: 'Blocked users', loading: 'Loading…', empty: "You haven't blocked anyone.", emptySub: 'Users you block will be listed here.', unblockBtn: 'Unblock', unblockConfirm: 'Are you sure you want to unblock this person?', error: 'The action failed.', levelPrefix: 'Lv.' },
  de: { title: 'Blockierte Nutzer', loading: 'Lädt…', empty: 'Du hast niemanden blockiert.', emptySub: 'Von dir blockierte Nutzer werden hier aufgelistet.', unblockBtn: 'Blockierung aufheben', unblockConfirm: 'Möchtest du die Blockierung dieser Person wirklich aufheben?', error: 'Aktion fehlgeschlagen.', levelPrefix: 'Lvl.' },
  fr: { title: 'Utilisateurs bloqués', loading: 'Chargement…', empty: "Tu n'as bloqué personne.", emptySub: 'Les utilisateurs que tu bloques apparaîtront ici.', unblockBtn: 'Débloquer', unblockConfirm: 'Veux-tu vraiment débloquer cette personne ?', error: "L'action a échoué.", levelPrefix: 'Niv.' },
  es: { title: 'Usuarios bloqueados', loading: 'Cargando…', empty: 'No has bloqueado a nadie.', emptySub: 'Los usuarios que bloquees aparecerán aquí.', unblockBtn: 'Desbloquear', unblockConfirm: '¿Seguro que quieres desbloquear a esta persona?', error: 'La acción falló.', levelPrefix: 'Niv.' },
  it: { title: 'Utenti bloccati', loading: 'Caricamento…', empty: 'Non hai bloccato nessuno.', emptySub: 'Gli utenti che blocchi verranno elencati qui.', unblockBtn: 'Sblocca', unblockConfirm: 'Sei sicuro di voler sbloccare questa persona?', error: "L'azione non è riuscita.", levelPrefix: 'Liv.' },
  ar: { title: 'المستخدمون المحظورون', loading: 'جارٍ التحميل…', empty: 'لم تحظر أي شخص.', emptySub: 'سيتم إدراج المستخدمين الذين تحظرهم هنا.', unblockBtn: 'إلغاء الحظر', unblockConfirm: 'هل أنت متأكد أنك تريد إلغاء حظر هذا الشخص؟', error: 'فشل الإجراء.', levelPrefix: 'مستوى' },
  ru: { title: 'Заблокированные', loading: 'Загрузка…', empty: 'Вы никого не заблокировали.', emptySub: 'Заблокированные вами пользователи появятся здесь.', unblockBtn: 'Разблокировать', unblockConfirm: 'Вы уверены, что хотите разблокировать этого человека?', error: 'Действие не выполнено.', levelPrefix: 'Ур.' },
  ja: { title: 'ブロック中のユーザー', loading: '読み込み中…', empty: '誰もブロックしていません。', emptySub: 'ブロックしたユーザーがここに表示されます。', unblockBtn: 'ブロック解除', unblockConfirm: 'このユーザーのブロックを解除してもよろしいですか?', error: '操作に失敗しました。', levelPrefix: 'Lv.' },
};

// Arayüz (UI) çevirisi olmayan diller ana dil seçeneği olarak sunulmamalı —
// aksi halde LocaleProvider sessizce Türkçe'ye düşüyor (bkz. Bug 2, Ağustos 2026).
const UI_SUPPORTED_CODES = new Set<string>(LOCALE_META.map((l) => l.code));

// Hesap silme (Google Play Data Safety / Apple hesap silme politikası) —
// BLOCK_LABELS'teki aynı yerel-i18n deseni (merkezi i18n.tsx'e dokunmadan).
const DELETE_ACCOUNT_LABELS: Record<
  Locale,
  { title: string; desc: string; button: string; confirm: string; error: string }
> = {
  tr: { title: 'Tehlikeli Bölge', desc: 'Hesabını ve tüm verilerini (kelimeler, ilerleme, mesajlar) kalıcı olarak sil. Bu işlem geri alınamaz.', button: 'Hesabımı Sil', confirm: 'Hesabını kalıcı olarak silmek istediğine emin misin? Bu işlem GERİ ALINAMAZ.', error: 'Hesap silinemedi, lütfen tekrar dene.' },
  en: { title: 'Danger Zone', desc: 'Permanently delete your account and all your data (words, progress, messages). This cannot be undone.', button: 'Delete My Account', confirm: 'Are you sure you want to permanently delete your account? This CANNOT be undone.', error: 'Could not delete your account, please try again.' },
  de: { title: 'Gefahrenzone', desc: 'Lösche dein Konto und alle deine Daten (Wörter, Fortschritt, Nachrichten) dauerhaft. Dies kann nicht rückgängig gemacht werden.', button: 'Konto löschen', confirm: 'Möchtest du dein Konto wirklich dauerhaft löschen? Dies kann NICHT rückgängig gemacht werden.', error: 'Konto konnte nicht gelöscht werden, bitte versuche es erneut.' },
  fr: { title: 'Zone de danger', desc: 'Supprime définitivement ton compte et toutes tes données (mots, progression, messages). Cette action est irréversible.', button: 'Supprimer mon compte', confirm: 'Es-tu sûr de vouloir supprimer définitivement ton compte ? Cette action est IRRÉVERSIBLE.', error: "Impossible de supprimer le compte, réessaie." },
  es: { title: 'Zona de peligro', desc: 'Elimina permanentemente tu cuenta y todos tus datos (palabras, progreso, mensajes). Esta acción no se puede deshacer.', button: 'Eliminar mi cuenta', confirm: '¿Seguro que quieres eliminar tu cuenta permanentemente? Esto NO se puede deshacer.', error: 'No se pudo eliminar la cuenta, inténtalo de nuevo.' },
  it: { title: 'Zona pericolosa', desc: 'Elimina definitivamente il tuo account e tutti i tuoi dati (parole, progressi, messaggi). Questa azione è irreversibile.', button: 'Elimina il mio account', confirm: 'Sei sicuro di voler eliminare definitivamente il tuo account? Questa azione NON può essere annullata.', error: "Impossibile eliminare l'account, riprova." },
  ar: { title: 'منطقة الخطر', desc: 'احذف حسابك وجميع بياناتك (الكلمات، التقدم، الرسائل) نهائيًا. لا يمكن التراجع عن هذا الإجراء.', button: 'حذف حسابي', confirm: 'هل أنت متأكد أنك تريد حذف حسابك نهائيًا؟ لا يمكن التراجع عن هذا.', error: 'تعذر حذف الحساب، حاول مرة أخرى.' },
  ru: { title: 'Опасная зона', desc: 'Безвозвратно удалите свой аккаунт и все данные (слова, прогресс, сообщения). Это действие нельзя отменить.', button: 'Удалить аккаунт', confirm: 'Вы уверены, что хотите безвозвратно удалить аккаунт? Это действие НЕЛЬЗЯ отменить.', error: 'Не удалось удалить аккаунт, попробуйте снова.' },
  ja: { title: '危険ゾーン', desc: 'アカウントとすべてのデータ(単語、進捗、メッセージ)を完全に削除します。この操作は取り消せません。', button: 'アカウントを削除', confirm: '本当にアカウントを完全に削除しますか?この操作は取り消せません。', error: 'アカウントを削除できませんでした。もう一度お試しください。' },
};

export default function ProfilePage() {
  const { t, locale } = useLocale();
  const bt = BLOCK_LABELS[locale] ?? BLOCK_LABELS.en;
  const dt = DELETE_ACCOUNT_LABELS[locale] ?? DELETE_ACCOUNT_LABELS.en;
  const router = useRouter();
  const { updateUser, logout } = useAuth();
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteAccountError, setDeleteAccountError] = useState('');
  const [user, setUser] = useState<UserType | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [dailyGoal, setDailyGoal] = useState(10);
  const [nativeLang, setNativeLang] = useState('tr');
  const [learningLang, setLearningLang] = useState('en');
  const [languages, setLanguages] = useState<Language[]>([]);
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [langError, setLangError] = useState('');

  // ── Öğrenilen diller (Kullanıcı Madde 2: çoklu dil öğrenme) ──
  const [userLangs, setUserLangs] = useState<UserLanguage[]>([]);
  const [langsLoading, setLangsLoading] = useState(true);
  const [showAddLangModal, setShowAddLangModal] = useState(false);
  const [addLangCode, setAddLangCode] = useState('');
  const [langActionError, setLangActionError] = useState('');
  const [langActionLoading, setLangActionLoading] = useState(false);

  // ── Engellenenler (Madde 6, Faz 2) ──
  const [blockedUsers, setBlockedUsers] = useState<UserCard[]>([]);
  const [blockedLoading, setBlockedLoading] = useState(true);
  const [blockedActionError, setBlockedActionError] = useState('');
  const [unblockBusyId, setUnblockBusyId] = useState<string | null>(null);

  useEffect(() => {
    authApi.getMe()
      .then((u) => {
        setUser(u);
        setDisplayName(u.display_name ?? '');
        setUsername(u.username ?? '');
        setEmail(u.email ?? '');
        setDailyGoal(u.daily_goal ?? 10);
        setNativeLang(u.native_lang ?? 'tr');
        setLearningLang(u.learning_lang ?? 'en');
      })
      .catch(() => setError(t('profileLoadError')))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    languagesApi.getAll()
      .then(setLanguages)
      .catch(() => setLanguages([
        { code: 'en', name_native: 'English', name_en: 'English', flag_emoji: '🇬🇧', is_active: true },
        { code: 'tr', name_native: 'Türkçe', name_en: 'Turkish', flag_emoji: '🇹🇷', is_active: true },
      ]));
  }, []);

  const loadUserLangs = () => {
    setLangsLoading(true);
    userLanguagesApi.getAll()
      .then(setUserLangs)
      .catch(() => {})
      .finally(() => setLangsLoading(false));
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount/parametre değişiminde veri çekme (fetch-on-effect) deseni; senkron setState çağrısı kasıtlı, davranış değiştirilmedi
    loadUserLangs();
  }, []);

  const loadBlocked = () => {
    setBlockedLoading(true);
    socialApi.getBlockedUsers()
      .then(setBlockedUsers)
      .catch(() => {})
      .finally(() => setBlockedLoading(false));
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount/parametre değişiminde veri çekme (fetch-on-effect) deseni; senkron setState çağrısı kasıtlı, davranış değiştirilmedi
    loadBlocked();
  }, []);

  const handleUnblock = async (card: UserCard) => {
    if (!window.confirm(bt.unblockConfirm)) return;
    setUnblockBusyId(card.id);
    setBlockedActionError('');
    try {
      await socialApi.unblockUser(card.id);
      loadBlocked();
    } catch (err) {
      setBlockedActionError(errorDetail(err) || bt.error);
    } finally {
      setUnblockBusyId(null);
    }
  };

  // Hesap silme — geri alınamaz olduğu için sayfadaki diğer yıkıcı işlemlerle
  // (handleUnblock) aynı window.confirm deseni kullanılıyor. Backend zaten
  // Supabase auth kullanıcısını silip tüm ilişkili verileri temizliyor
  // (bkz. backend/app/api/routes/auth.py delete_account); burada sadece
  // yerel oturumu temizleyip login'e yönlendirmek yeterli.
  const handleDeleteAccount = async () => {
    if (!window.confirm(dt.confirm)) return;
    setDeletingAccount(true);
    setDeleteAccountError('');
    try {
      await authApi.deleteAccount();
      logout();
      router.replace('/login');
    } catch (err) {
      setDeleteAccountError(errorDetail(err) || dt.error);
      setDeletingAccount(false);
    }
  };

  const handleSetActiveLang = async (code: string) => {
    setLangActionError('');
    setLangActionLoading(true);
    try {
      await userLanguagesApi.setActive(code);
      loadUserLangs();
      const me = await authApi.getMe();
      setUser(me);
      setLearningLang(me.learning_lang ?? code);
      updateUser(me);
    } catch (err) {
      setLangActionError(errorDetail(err) || t('setActiveFailed'));
    } finally {
      setLangActionLoading(false);
    }
  };

  const handleRemoveLang = async (lang: UserLanguage) => {
    setLangActionError('');
    if (lang.is_active) {
      setLangActionError(t('cannotRemoveActiveLanguageError'));
      return;
    }
    if (!window.confirm(t('removeLanguageConfirm'))) return;
    setLangActionLoading(true);
    try {
      await userLanguagesApi.remove(lang.learning_lang);
      loadUserLangs();
    } catch (err) {
      setLangActionError(errorDetail(err) || t('removeLanguageFailed'));
    } finally {
      setLangActionLoading(false);
    }
  };

  const handleAddLang = async () => {
    if (!addLangCode) return;
    setLangActionError('');
    if (userLangs.some((l) => l.learning_lang === addLangCode)) {
      setLangActionError(t('languageAlreadyAddedError'));
      return;
    }
    setLangActionLoading(true);
    try {
      await userLanguagesApi.add(addLangCode);
      setShowAddLangModal(false);
      setAddLangCode('');
      loadUserLangs();
    } catch (err) {
      setLangActionError(errorDetail(err) || t('addLanguageFailed'));
    } finally {
      setLangActionLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLangError('');

    if (nativeLang === learningLang) {
      setLangError(t('sameLangError'));
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        display_name: displayName.trim() || undefined,
        daily_goal: dailyGoal,
      };
      // Sadece değişenleri gönder
      if (username.trim() && username.trim() !== user?.username) payload.username = username.trim();
      if (email.trim() && email.trim() !== user?.email) payload.email = email.trim();
      if (password.trim()) payload.password = password.trim();
      if (nativeLang !== user?.native_lang) payload.native_lang = nativeLang;
      if (learningLang !== user?.learning_lang) payload.learning_lang = learningLang;

      const updated = await authApi.updateProfile(payload);
      setUser(updated);
      setPassword('');
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);

      // Auth store'u güncelle — LocaleProvider user.native_lang'i buradan okuyor,
      // böylece arayüz dili sayfa yenilemeden anında değişir.
      updateUser(updated);
      loadUserLangs();
    } catch (err) {
      setError(errorDetail(err) || t('saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-6 text-sm text-gray-400">{t('loading')}</div>;

  const inputCls = "w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition";
  const selectCls = "w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition bg-white";

  return (
    <div className="p-6 max-w-lg space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
          <User className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('profile')}</h1>
          <p className="text-sm text-gray-400">{user?.email}</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
        {/* Görünen ad */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">{t('displayNameLabel')}</label>
          <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Ahmet Yılmaz" maxLength={60} className={inputCls} />
        </div>

        {/* Kullanıcı adı — düzenlenebilir */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1"><AtSign className="w-3 h-3" />{t('usernameLabel')}</label>
          <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="kullaniciadi" maxLength={50} className={inputCls} />
        </div>

        {/* E-posta — düzenlenebilir */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1"><Mail className="w-3 h-3" />{t('emailLabel')}</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ornek@email.com" className={inputCls} />
          <p className="text-xs text-gray-400 mt-1">{t('emailChangeHint')}</p>
        </div>

        {/* Şifre — yeni şifre */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1"><Lock className="w-3 h-3" />{t('newPasswordLabel')}</label>
          <div className="relative">
            <input type={showPw ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t('newPasswordPlaceholder')} className={inputCls} />
            <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Dil tercihleri — arayüz dili (native_lang) + öğrenme dili (learning_lang) */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-2">{t('interfaceLanguageLabel')}</label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-gray-500 mb-1">
                <Globe className="w-3 h-3" /> {t('nativeLangSelectLabel')}
              </label>
              <select value={nativeLang} onChange={(e) => setNativeLang(e.target.value)} className={selectCls}>
                {/* Mevcut değer listede kalsın (ör. daha önce ja/pt seçmiş kullanıcı için) */}
                {languages.filter((l) => UI_SUPPORTED_CODES.has(l.code) || l.code === nativeLang).map((l) => (
                  <option key={l.code} value={l.code}>{l.flag_emoji} {l.name_native}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-gray-500 mb-1">
                <GraduationCap className="w-3 h-3" /> {t('learningLangSelectLabel')}
              </label>
              <select value={learningLang} onChange={(e) => setLearningLang(e.target.value)} className={selectCls}>
                {languages.map((l) => (
                  <option key={l.code} value={l.code}>{l.flag_emoji} {l.name_native}</option>
                ))}
              </select>
            </div>
          </div>
          {langError && <p className="text-xs text-red-600 mt-2">{langError}</p>}
        </div>

        {/* Günlük hedef */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">{t('dailyGoalLabel')}</label>
          <div className="flex items-center gap-3">
            <input type="range" min={1} max={50} value={dailyGoal} onChange={(e) => setDailyGoal(Number(e.target.value))} className="flex-1 accent-blue-600" />
            <span className="w-12 text-center text-sm font-semibold text-blue-600 bg-blue-50 rounded-lg py-1">{dailyGoal}</span>
          </div>
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>}

        <button type="submit" disabled={saving} className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl py-2.5 text-sm font-medium transition-colors">
          {saved ? <><CheckCircle className="w-4 h-4" /> {t('savedLabel')}</> : <><Save className="w-4 h-4" />{saving ? t('savingBtn') : t('saveBtn')}</>}
        </button>
      </form>

      {/* Dillerim — birden fazla öğrenme dili yönetimi (Kullanıcı Madde 2) */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
            <GraduationCap className="w-4 h-4" /> {t('myLanguagesTitle')}
          </h2>
          <button
            type="button"
            onClick={() => { setAddLangCode(''); setLangActionError(''); setShowAddLangModal(true); }}
            className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> {t('addLanguageBtn')}
          </button>
        </div>

        {langsLoading ? (
          <p className="text-sm text-gray-400">{t('loading')}</p>
        ) : (
          <ul className="space-y-2">
            {userLangs.map((lang) => {
              const meta = languages.find((l) => l.code === lang.learning_lang);
              return (
                <li key={lang.id} className="flex items-center justify-between rounded-xl border border-gray-100 px-3 py-2">
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <span>{meta?.flag_emoji}</span>
                    <span>{meta?.name_native ?? lang.learning_lang}</span>
                    {lang.is_active && (
                      <span className="text-[10px] font-semibold text-green-700 bg-green-50 rounded-full px-2 py-0.5">
                        {t('activeBadgeLabel')}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {!lang.is_active && (
                      <button
                        type="button"
                        disabled={langActionLoading}
                        onClick={() => handleSetActiveLang(lang.learning_lang)}
                        className="text-xs font-medium text-blue-600 hover:text-blue-700 disabled:opacity-50"
                      >
                        {t('setActiveBtn')}
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={langActionLoading}
                      onClick={() => handleRemoveLang(lang)}
                      className="text-xs font-medium text-red-500 hover:text-red-600 disabled:opacity-50"
                    >
                      {t('removeLanguageBtn')}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {langActionError && <p className="text-xs text-red-600">{langActionError}</p>}
      </div>

      {showAddLangModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowAddLangModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-gray-800">{t('addLanguageModalTitle')}</h3>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{t('selectLanguageLabel')}</label>
              <select value={addLangCode} onChange={(e) => setAddLangCode(e.target.value)} className={selectCls}>
                <option value="">—</option>
                {languages
                  .filter((l) => !userLangs.some((ul) => ul.learning_lang === l.code))
                  .map((l) => (
                    <option key={l.code} value={l.code}>{l.flag_emoji} {l.name_native}</option>
                  ))}
              </select>
            </div>
            {langActionError && <p className="text-xs text-red-600">{langActionError}</p>}
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setShowAddLangModal(false)} className="text-xs font-medium text-gray-500 hover:text-gray-700 px-3 py-2">
                {t('cancelBtn')}
              </button>
              <button
                type="button"
                disabled={!addLangCode || langActionLoading}
                onClick={handleAddLang}
                className="text-xs font-medium bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl px-4 py-2"
              >
                {t('saveBtn')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Engellenenler — Madde 6, Faz 2 */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
          <Ban className="w-4 h-4" /> {bt.title}
        </h2>

        {blockedLoading ? (
          <p className="text-sm text-gray-400">{bt.loading}</p>
        ) : blockedUsers.length === 0 ? (
          <div className="text-center py-3">
            <p className="text-sm text-gray-400">{bt.empty}</p>
            <p className="text-xs text-gray-300 mt-1">{bt.emptySub}</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {blockedUsers.map((card) => {
              const name = card.display_name || card.username || '?';
              return (
                <li key={card.id} className="flex items-center justify-between rounded-xl border border-gray-100 px-3 py-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-semibold text-gray-500 shrink-0">
                      {name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-700 truncate">{name}</p>
                      {card.username && <p className="text-xs text-gray-400 truncate">@{card.username}</p>}
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={unblockBusyId === card.id}
                    onClick={() => handleUnblock(card)}
                    className="text-xs font-medium text-blue-600 hover:text-blue-700 disabled:opacity-50 shrink-0"
                  >
                    {bt.unblockBtn}
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {blockedActionError && <p className="text-xs text-red-600">{blockedActionError}</p>}
      </div>

      <BadgeShowcase />

      <div className="bg-gray-50 rounded-2xl border border-gray-100 p-5 space-y-3">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('accountInfoTitle')}</h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><p className="text-gray-400 text-xs">{t('roleLabel')}</p><p className="font-medium text-gray-700 capitalize">{user?.role ?? '—'}</p></div>
          <div><p className="text-gray-400 text-xs">{t('memberSinceLabel')}</p><p className="font-medium text-gray-700">{user?.created_at ? new Date(user.created_at).toLocaleDateString(locale) : '—'}</p></div>
        </div>
      </div>

      <div className="bg-red-50 rounded-2xl border border-red-100 p-5 space-y-3">
        <h2 className="text-xs font-semibold text-red-500 uppercase tracking-wide">{dt.title}</h2>
        <p className="text-sm text-red-700">{dt.desc}</p>
        {deleteAccountError && <p className="text-xs text-red-600">{deleteAccountError}</p>}
        <button
          type="button"
          disabled={deletingAccount}
          onClick={handleDeleteAccount}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-xl px-4 py-2"
        >
          <Trash2 className="w-4 h-4" />
          {dt.button}
        </button>
      </div>
    </div>
  );
}
