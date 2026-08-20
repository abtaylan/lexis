'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, User, Lock, Mail, Globe, GraduationCap } from 'lucide-react';
import { authApi, languagesApi } from '@/lib/api';
import { useAuth } from '@/store/auth';
import { useGuestUiLang, useT } from '@/lib/i18n';
import { Button, Input, Card } from '@/components/ui';
import type { User as UserType, Language } from '@/types';

export default function RegisterPage() {
  const router = useRouter();
  const { login } = useAuth();
  const { t } = useT();
  const [guestLang] = useGuestUiLang();

  const [form, setForm] = useState({
    email: '',
    username: '',
    password: '',
    display_name: '',
    native_lang: 'tr',
    learning_lang: 'en',
  });
  const [languages, setLanguages] = useState<Language[]>([]);
  const [showPw, setShowPw] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const didPrefillLang = useRef(false);

  // Dilleri yükle
  useEffect(() => {
    languagesApi.getAll()
      .then(setLanguages)
      .catch(() => setLanguages([
        { code: 'en', name_native: 'English', name_en: 'English', flag_emoji: '🇬🇧', is_active: true },
        { code: 'tr', name_native: 'Türkçe',  name_en: 'Turkish', flag_emoji: '🇹🇷', is_active: true },
      ]));
  }, []);

  // Ana dil seçimini, kullanıcının sayfa üstünde seçtiği misafir arayüz
  // diliyle bir kez ön-doldur (sonrasında kullanıcı elle değiştirebilir).
  useEffect(() => {
    if (didPrefillLang.current || languages.length === 0) return;
    didPrefillLang.current = true;
    if (languages.some((l) => l.code === guestLang)) {
      setForm((p) => ({
        ...p,
        native_lang: guestLang,
        learning_lang: p.learning_lang === guestLang ? (guestLang === 'en' ? 'tr' : 'en') : p.learning_lang,
      }));
    }
  }, [languages, guestLang]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.email.includes('@')) e.email = t('auth.register.errors.email');
    if (form.username.length < 3) e.username = t('auth.register.errors.username');
    if (form.password.length < 6) e.password = t('auth.register.errors.password');
    if (form.native_lang === form.learning_lang) {
      e.learning_lang = t('auth.register.errors.learningLangSame');
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await authApi.register({
        email: form.email,
        password: form.password,
        display_name: form.display_name || form.username,
        username: form.username,
        native_lang: form.native_lang,
        learning_lang: form.learning_lang,
      });

      // FIX: login email ile çağrılıyor (eskiden yanlışlıkla username veriliyordu)
      const tokenRes = await authApi.login({ email: form.email, password: form.password });
      localStorage.setItem('lexis_token', tokenRes.access_token);
      const me = await authApi.getMe();

      const user: UserType = {
        id:            me.id,
        email:         me.email,
        username:      me.username || form.username,
        display_name:  me.display_name || form.display_name,
        is_admin:      me.is_admin ?? me.role === 'admin',
        role:          me.role,
        daily_goal:    me.daily_goal ?? 5,
        native_lang:   me.native_lang ?? form.native_lang,
        learning_lang: me.learning_lang ?? form.learning_lang,
        created_at:    me.created_at || new Date().toISOString(),
      };
      login(tokenRes.access_token, user);
      router.push('/dashboard');
    } catch (err: unknown) {
      localStorage.removeItem('lexis_token');
      const axiosErr = err as { response?: { data?: { detail?: string | object } } };
      const detail = axiosErr?.response?.data?.detail;
      setErrors({ form: typeof detail === 'string' ? detail : t('auth.register.errors.generic') });
    } finally {
      setLoading(false);
    }
  };

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  const setSelect = (k: string) => (e: React.ChangeEvent<HTMLSelectElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  return (
    <Card padding="lg" className="border-0 shadow-xl shadow-slate-200/60">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">{t('auth.register.title')}</h1>
        <p className="text-slate-400 text-sm mt-1">{t('auth.register.subtitle')}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label={t('auth.register.displayName')}
          placeholder={t('auth.register.displayNamePlaceholder')}
          value={form.display_name}
          onChange={set('display_name')}
          leftIcon={<User size={16} />}
          autoFocus
        />
        <Input
          label={t('auth.register.email')}
          type="email"
          placeholder={t('auth.register.emailPlaceholder')}
          value={form.email}
          onChange={set('email')}
          leftIcon={<Mail size={16} />}
          error={errors.email}
          required
        />
        <Input
          label={t('auth.register.username')}
          placeholder={t('auth.register.usernamePlaceholder')}
          value={form.username}
          onChange={set('username')}
          leftIcon={<User size={16} />}
          error={errors.username}
          required
        />
        <Input
          label={t('auth.register.password')}
          type={showPw ? 'text' : 'password'}
          placeholder={t('auth.register.passwordPlaceholder')}
          value={form.password}
          onChange={set('password')}
          leftIcon={<Lock size={16} />}
          rightIcon={
            <button type="button" onClick={() => setShowPw((v) => !v)} className="text-slate-400 hover:text-slate-600">
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          }
          error={errors.password}
          required
        />

        {/* ── Dil seçimi ── */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium text-slate-600 mb-1.5">
              <Globe size={14} /> {t('auth.register.nativeLang')}
            </label>
            <select
              value={form.native_lang}
              onChange={setSelect('native_lang')}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition bg-white"
            >
              {languages.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.flag_emoji} {l.name_native}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium text-slate-600 mb-1.5">
              <GraduationCap size={14} /> {t('auth.register.learningLang')}
            </label>
            <select
              value={form.learning_lang}
              onChange={setSelect('learning_lang')}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition bg-white"
            >
              {languages.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.flag_emoji} {l.name_native}
                </option>
              ))}
            </select>
          </div>
        </div>
        {errors.learning_lang && (
          <p className="text-xs text-red-600 -mt-2">{errors.learning_lang}</p>
        )}

        {errors.form && (
          <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
            {errors.form}
          </div>
        )}

        <Button type="submit" className="w-full mt-2" size="lg" loading={loading}>
          {t('auth.register.submit')}
        </Button>
      </form>

      <p className="text-center text-sm text-slate-400 mt-6">
        {t('auth.register.haveAccount')}{' '}
        <Link href="/login" className="text-sky-600 font-medium hover:underline">
          {t('auth.register.loginLink')}
        </Link>
      </p>
    </Card>
  );
}
