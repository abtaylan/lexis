'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, User, Lock, Mail, Globe, GraduationCap, Zap } from 'lucide-react';
import { authApi, languagesApi } from '@/lib/api';
import { Button, Input, Card } from '@/components/ui';
import { useLocale, LOCALE_META } from '@/lib/i18n';
import type { Language } from '@/types';

// Arayüz (UI) çevirisi olmayan diller ana dil seçeneği olarak sunulmamalı —
// aksi halde LocaleProvider sessizce Türkçe'ye düşüyor (bkz. Bug 2, Ağustos 2026).
// Öğrenme dili (learning_langs) için bu kısıtlama geçerli değil, çünkü o UI dilini
// değil sadece kelime havuzu hedef dilini belirliyor.
const UI_SUPPORTED_CODES = new Set<string>(LOCALE_META.map((l) => l.code));

export default function RegisterPage() {
  const router = useRouter();
  const { t } = useLocale();

  const [form, setForm] = useState({
    email: '',
    username: '',
    password: '',
    display_name: '',
    native_lang: 'tr',
    learning_langs: ['en'] as string[],
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
        { code: 'tr', name_native: 'Türkçe', name_en: 'Turkish', flag_emoji: '🇹🇷', is_active: true },
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
    if (!form.email.includes('@')) e.email = t('emailInvalidError');
    if (form.username.length < 3) e.username = t('usernameMinError');
    if (form.password.length < 6) e.password = t('passwordMinError');
    if (form.learning_langs.length === 0) {
      e.learning_langs = t('selectAtLeastOneLanguageError');
    } else if (form.learning_langs.includes(form.native_lang)) {
      e.learning_langs = t('sameLangError');
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
        learning_lang: form.learning_langs[0],
        learning_langs: form.learning_langs,
      });

      // Hesap oluşturuldu — token burada verilmez, önce e-postaya gönderilen
      // OTP kodu doğrulanmalı. Doğrulanınca otomatik giriş yapılır.
      router.push(`/verify-otp?email=${encodeURIComponent(form.email)}&purpose=register`);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string | object } } };
      const detail = axiosErr?.response?.data?.detail;
      setErrors({ form: typeof detail === 'string' ? detail : t('registerFailedGeneric') });
    } finally {
      setLoading(false);
    }
  };

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  const setNativeLang = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setForm((p) => ({
      ...p,
      native_lang: val,
      // Ana dil değişince, o dil öğrenme listesinde kalmışsa çıkar
      learning_langs: p.learning_langs.filter((c) => c !== val),
    }));
  };

  const toggleLearningLang = (code: string) => {
    setForm((p) => {
      const has = p.learning_langs.includes(code);
      return {
        ...p,
        learning_langs: has
          ? p.learning_langs.filter((c) => c !== code)
          : [...p.learning_langs, code],
      };
    });
  };

  return (
    <Card padding="lg" className="border-0 shadow-xl shadow-slate-200/60">
      <div className="mb-8 flex items-center gap-3">
        <div className="w-11 h-11 bg-sky-500 rounded-xl flex items-center justify-center shrink-0">
          <Zap size={20} className="text-white" strokeWidth={2.5} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{t('registerTitleText')}</h1>
          <p className="text-slate-400 text-sm mt-0.5">{t('registerSubtitleText')}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label={t('fullNameLabel')}
          placeholder="Ahmet Yılmaz"
          value={form.display_name}
          onChange={set('display_name')}
          leftIcon={<User size={16} />}
          autoFocus
        />
        <Input
          label={t('emailLabel')}
          type="email"
          placeholder={t('auth.register.emailPlaceholder')}
          value={form.email}
          onChange={set('email')}
          leftIcon={<Mail size={16} />}
          error={errors.email}
          required
        />
        <Input
          label={t('usernameLabel')}
          placeholder="kullaniciadi"
          value={form.username}
          onChange={set('username')}
          leftIcon={<User size={16} />}
          error={errors.username}
          required
        />
        <Input
          label={t('passwordLabel')}
          type={showPw ? 'text' : 'password'}
          placeholder={t('passwordHintText')}
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
        <div className="space-y-3">
          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium text-slate-600 mb-1.5">
              <Globe size={14} /> {t('nativeLangSelectLabel')}
            </label>
            <select
              value={form.native_lang}
              onChange={setNativeLang}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition bg-white"
            >
              {languages.filter((l) => UI_SUPPORTED_CODES.has(l.code)).map((l) => (
                <option key={l.code} value={l.code}>
                  {l.flag_emoji} {l.name_native}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium text-slate-600 mb-1.5">
              <GraduationCap size={14} /> {t('learningLangsSelectLabel')}
            </label>
            <div className="flex flex-wrap gap-2">
              {languages
                .filter((l) => l.code !== form.native_lang)
                .map((l) => {
                  const selected = form.learning_langs.includes(l.code);
                  return (
                    <button
                      type="button"
                      key={l.code}
                      onClick={() => toggleLearningLang(l.code)}
                      className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm transition ${
                        selected
                          ? 'border-sky-500 bg-sky-50 text-sky-700'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <span>{l.flag_emoji}</span>
                      <span>{l.name_native}</span>
                    </button>
                  );
                })}
            </div>
          </div>
        </div>
        {errors.learning_langs && (
          <p className="text-xs text-red-600 -mt-2">{errors.learning_langs}</p>
        )}

        {errors.form && (
          <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
            {errors.form}
          </div>
        )}

        <Button type="submit" className="w-full mt-2" size="lg" loading={loading}>
          {t('createAccountBtn')}
        </Button>
      </form>

      <p className="text-center text-sm text-slate-400 mt-6">
        {t('haveAccountQuestion')}{' '}
        <Link href="/login" className="text-sky-600 font-medium hover:underline">
          {t('loginLinkText')}
        </Link>
      </p>
    </Card>
  );
}
