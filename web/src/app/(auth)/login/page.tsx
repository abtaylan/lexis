'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';
import { authApi } from '@/lib/api';
import { useAuth } from '@/store/auth';
import type { User as UserType } from '@/types';
import { Button, Input, Card } from '@/components/ui';
import { useLocale } from '@/lib/i18n';
import { getErrorMessage } from '@/lib/errors';
import { AppleSignInButton } from '@/components/AppleSignInButton';
import { GoogleSignInButton } from '@/components/GoogleSignInButton';
import { SOCIAL_AUTH_STRINGS } from '@/lib/socialAuthStrings';

export default function LoginPage() {
  const router = useRouter();
  const { t, locale } = useLocale();
  const { login: loginToStore } = useAuth();

  const [form, setForm] = useState({ email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const st = SOCIAL_AUTH_STRINGS[locale] ?? SOCIAL_AUTH_STRINGS.tr!;
  const handleSocialError = () => setError(st.socialError);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await authApi.login(form);

      // KULLANICI İSTEĞİ (7-8 Eylül 2026): "OTP sadece üye olurken/kayıt
      // sonrası ilk girişte gelsin, sonraki girişlerde gerek yok" — mobil
      // tarafta zaten uygulanmıştı (mobile/src/app/(auth)/login.tsx), web
      // burada eksikti: backend 'access_token' ile DİREKT dönse bile web
      // hep /verify-otp'a yönlendiriyordu, kullanıcı her girişte OTP
      // ekranına düşüyordu. Artık backend cevabında 'access_token' varsa
      // (yani bu email için daha önce en az bir kez doğrulanmışsa) OTP
      // ekranına hiç gitmeden doğrudan oturum açılıp dashboard'a geçiliyor;
      // 'pending: true' geldiyse (kayıt sonrası ilk giriş) eskisi gibi OTP
      // ekranına yönlendiriliyor.
      if ('access_token' in res) {
        localStorage.setItem('lexis_token', res.access_token);
        const me = await authApi.getMe();
        const user: UserType = {
          id: me.id,
          email: me.email,
          username: me.username || '',
          display_name: me.display_name,
          is_admin: me.is_admin ?? me.role === 'admin',
          role: me.role,
          daily_goal: me.daily_goal ?? 5,
          native_lang: me.native_lang,
          learning_lang: me.learning_lang,
          created_at: me.created_at || new Date().toISOString(),
        };
        loginToStore(res.access_token, user);
        router.push(user.role === 'admin' || user.role === 'admin_readonly' ? '/admin' : '/dashboard');
        return;
      }

      router.push(`/verify-otp?email=${encodeURIComponent(form.email)}&purpose=login`);
    } catch (err) {
      localStorage.removeItem('lexis_token');
      setError(getErrorMessage(err, t('loginErrorMsg')));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card padding="lg" className="border-0 shadow-xl shadow-slate-200/60">
      <div className="mb-8 flex items-center gap-3">
        <div className="w-11 h-11 bg-sky-500 rounded-xl flex items-center justify-center shrink-0 p-2">
          <Image src="/logo-icon.png" alt="Lexis" width={28} height={28} />
        </div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{t('loginTitle')}</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label={t('emailLabel')}
          type="email"
          name="email"
          value={form.email}
          onChange={handleChange}
          leftIcon={<Mail size={16} />}
          required
          autoFocus
        />

        <div>
          <Input
            label={t('passwordLabel')}
            type={showPw ? 'text' : 'password'}
            name="password"
            value={form.password}
            onChange={handleChange}
            leftIcon={<Lock size={16} />}
            rightIcon={
              <button type="button" onClick={() => setShowPw((v) => !v)} className="text-slate-400 hover:text-slate-600 hover:dark:text-slate-300">
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            }
            required
          />
          <div className="text-right mt-1.5">
            <Link href="/forgot-password" className="text-xs text-sky-600 dark:text-sky-400 font-medium hover:underline">
              {t('forgotPasswordLink')}
            </Link>
          </div>
        </div>

        {error && (
          <div className="rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 px-4 py-3 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        <Button type="submit" className="w-full mt-2" size="lg" loading={loading}>
          {loading ? t('loggingInBtn') : t('loginBtnText')}
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

      <p className="text-center text-sm text-slate-400 mt-6">
        {t('noAccountQuestion')}{' '}
        <Link href="/register" className="text-sky-600 dark:text-sky-400 font-medium hover:underline">
          {t('registerLinkText')}
        </Link>
      </p>
    </Card>
  );
}
