'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, User, Lock, Mail, Globe, GraduationCap, Zap, Gift } from 'lucide-react';
import { authApi, languagesApi } from '@/lib/api';
import { Button, Input, Card } from '@/components/ui';
import { useLocale, LOCALE_META, type Locale } from '@/lib/i18n';
import type { Language } from '@/types';
import { AppleSignInButton } from '@/components/AppleSignInButton';
import { GoogleSignInButton } from '@/components/GoogleSignInButton';
import { SOCIAL_AUTH_STRINGS } from '@/lib/socialAuthStrings';

// Referans/Davet Programı (V2 öncelik #8) — merkezi i18n.tsx sözlüğüne
// dokunmadan yerel çeviri (profile/page.tsx'teki BLOCK_LABELS deseniyle aynı).
const INVITE_CODE_LABELS: Record<Locale, { label: string; placeholder: string; appliedHint: string }> = {
  tr: { label: 'Davet Kodu (opsiyonel)', placeholder: 'Örn. A1B2C3D4', appliedHint: 'Bir arkadaşının davetiyle katılıyorsun 🎉' },
  en: { label: 'Invite Code (optional)', placeholder: 'e.g. A1B2C3D4', appliedHint: "You're joining via a friend's invite 🎉" },
  de: { label: 'Einladungscode (optional)', placeholder: 'z. B. A1B2C3D4', appliedHint: 'Du trittst über die Einladung eines Freundes bei 🎉' },
  fr: { label: "Code d'invitation (optionnel)", placeholder: 'ex. A1B2C3D4', appliedHint: "Tu rejoins via l'invitation d'un ami 🎉" },
  es: { label: 'Código de invitación (opcional)', placeholder: 'ej. A1B2C3D4', appliedHint: 'Te unes mediante la invitación de un amigo 🎉' },
  it: { label: 'Codice invito (opzionale)', placeholder: 'es. A1B2C3D4', appliedHint: "Ti stai unendo tramite l'invito di un amico 🎉" },
  ar: { label: 'رمز الدعوة (اختياري)', placeholder: 'مثال A1B2C3D4', appliedHint: 'أنت تنضم عبر دعوة صديق 🎉' },
  ru: { label: 'Код приглашения (необязательно)', placeholder: 'напр. A1B2C3D4', appliedHint: 'Вы присоединяетесь по приглашению друга 🎉' },
  ja: { label: '招待コード(任意)', placeholder: '例: A1B2C3D4', appliedHint: '友達の招待から参加しています 🎉' },
  pt: { label: 'Código de convite (opcional)', placeholder: 'ex. A1B2C3D4', appliedHint: 'Estás a juntar-te através do convite de um amigo 🎉' },
};

// Arayüz (UI) çevirisi olmayan diller ana dil seçeneği olarak sunulmamalı —
// aksi halde LocaleProvider sessizce Türkçe'ye düşüyor (bkz. Bug 2, Ağustos 2026).
// Öğrenme dili (learning_langs) için bu kısıtlama geçerli değil, çünkü o UI dilini
// değil sadece kelime havuzu hedef dilini belirliyor.
const UI_SUPPORTED_CODES = new Set<string>(LOCALE_META.map((l) => l.code));

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, locale } = useLocale();
  const st = SOCIAL_AUTH_STRINGS[locale] ?? SOCIAL_AUTH_STRINGS.tr!;
  const it2 = INVITE_CODE_LABELS[locale] ?? INVITE_CODE_LABELS.en;
  const [socialError, setSocialError] = useState('');
  const handleSocialError = () => setSocialError(st.socialError);

  // Referans/Davet Programı — ?ref=KOD URL parametresi otomatik yakalanır,
  // kullanıcı isterse elle de değiştirebilir/silebilir (manuel alan aşağıda).
  const prefilledRef = (searchParams.get('ref') || '').trim().toUpperCase();

  const [form, setForm] = useState({
    email: '',
    username: '',
    password: '',
    display_name: '',
    native_lang: 'tr',
    learning_langs: ['en'] as string[],
    referral_code: prefilledRef,
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
    if (languages.some((l) => l.code === locale)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- mount/parametre değişiminde veri çekme (fetch-on-effect) deseni; senkron setState çağrısı kasıtlı, davranış değiştirilmedi
      setForm((p) => ({
        ...p,
        native_lang: locale,
        // Ana dil misafir arayüz diline eşitleniyor — o dil öğrenme
        // listesinde kalmışsa çıkar (setNativeLang'daki desenle aynı).
        learning_langs: p.learning_langs.filter((c) => c !== locale),
      }));
    }
  }, [languages, locale]);

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
        referral_code: form.referral_code.trim() || undefined,
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
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{t('registerTitleText')}</h1>
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
          placeholder="ornek@email.com"
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
            <button type="button" onClick={() => setShowPw((v) => !v)} className="text-slate-400 hover:text-slate-600 hover:dark:text-slate-300">
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          }
          error={errors.password}
          required
        />

        {/* ── Dil seçimi ── */}
        <div className="space-y-3">
          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">
              <Globe size={14} /> {t('nativeLangSelectLabel')}
            </label>
            <select
              value={form.native_lang}
              onChange={setNativeLang}
              className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition bg-white dark:bg-slate-900"
            >
              {languages.filter((l) => UI_SUPPORTED_CODES.has(l.code)).map((l) => (
                <option key={l.code} value={l.code}>
                  {l.flag_emoji} {l.name_native}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">
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
                          ? 'border-sky-500 bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-400'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:border-slate-300'
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
          <p className="text-xs text-red-600 dark:text-red-400 -mt-2">{errors.learning_langs}</p>
        )}

        {/* Referans/Davet Programı — ?ref= ile otomatik dolar, elle de girilebilir */}
        <div>
          <Input
            label={it2.label}
            placeholder={it2.placeholder}
            value={form.referral_code}
            onChange={(e) => setForm((p) => ({ ...p, referral_code: e.target.value.toUpperCase() }))}
            leftIcon={<Gift size={16} />}
            maxLength={8}
          />
          {form.referral_code && (
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">{it2.appliedHint}</p>
          )}
        </div>

        {errors.form && (
          <div className="rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 px-4 py-3 text-sm text-red-600 dark:text-red-400">
            {errors.form}
          </div>
        )}

        <Button type="submit" className="w-full mt-2" size="lg" loading={loading}>
          {t('createAccountBtn')}
        </Button>
      </form>

      <div className="flex items-center gap-3 mt-6">
        <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
        <span className="text-xs font-medium text-slate-400">{st.orDivider}</span>
        <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
      </div>

      <div className="flex flex-col gap-2.5 mt-4">
        <AppleSignInButton label={st.appleBtn} onError={handleSocialError} />
        <GoogleSignInButton locale={locale} onError={handleSocialError} />
      </div>
      {socialError && (
        <p className="text-center text-xs text-red-600 dark:text-red-400 mt-2.5">{socialError}</p>
      )}

      <p className="text-center text-sm text-slate-400 mt-6">
        {t('haveAccountQuestion')}{' '}
        <Link href="/login" className="text-sky-600 dark:text-sky-400 font-medium hover:underline">
          {t('loginLinkText')}
        </Link>
      </p>
    </Card>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterContent />
    </Suspense>
  );
}
