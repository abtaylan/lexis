'use client';

import { useEffect, useState } from 'react';
import { User, Save, CheckCircle, Lock, Mail, AtSign, Eye, EyeOff, Globe, GraduationCap } from 'lucide-react';
import { authApi, languagesApi } from '@/lib/api';
import { useAuth } from '@/store/auth';
import { useLocale } from '@/lib/i18n';
import type { User as UserType, Language } from '@/types';

export default function ProfilePage() {
  const { t, locale } = useLocale();
  const { updateUser } = useAuth();
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
    } catch (err: any) {
      setError(err?.response?.data?.detail || t('saveFailed'));
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
                {languages.map((l) => (
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

      <div className="bg-gray-50 rounded-2xl border border-gray-100 p-5 space-y-3">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('accountInfoTitle')}</h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><p className="text-gray-400 text-xs">{t('roleLabel')}</p><p className="font-medium text-gray-700 capitalize">{user?.role ?? '—'}</p></div>
          <div><p className="text-gray-400 text-xs">{t('memberSinceLabel')}</p><p className="font-medium text-gray-700">{user?.created_at ? new Date(user.created_at).toLocaleDateString(locale) : '—'}</p></div>
        </div>
      </div>
    </div>
  );
}
