'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';
import { authApi } from '@/lib/api';
import { Button, Input, Card } from '@/components/ui';
import { useLocale } from '@/lib/i18n';
import { getErrorMessage } from '@/lib/errors';

export default function LoginPage() {
  const router = useRouter();
  const { t } = useLocale();

  const [form, setForm] = useState({ email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Şifre doğrulanır, OTP kodu gönderilir — token burada dönmez.
      await authApi.login(form);
      router.push(`/verify-otp?email=${encodeURIComponent(form.email)}&purpose=login`);
    } catch (err) {
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
        <h1 className="text-2xl font-bold text-slate-800">{t('loginTitle')}</h1>
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
              <button type="button" onClick={() => setShowPw((v) => !v)} className="text-slate-400 hover:text-slate-600">
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            }
            required
          />
          <div className="text-right mt-1.5">
            <Link href="/forgot-password" className="text-xs text-sky-600 font-medium hover:underline">
              {t('forgotPasswordLink')}
            </Link>
          </div>
        </div>

        {error && (
          <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <Button type="submit" className="w-full mt-2" size="lg" loading={loading}>
          {loading ? t('loggingInBtn') : t('loginBtnText')}
        </Button>
      </form>

      <p className="text-center text-sm text-slate-400 mt-6">
        {t('noAccountQuestion')}{' '}
        <Link href="/register" className="text-sky-600 font-medium hover:underline">
          {t('registerLinkText')}
        </Link>
      </p>
    </Card>
  );
}
