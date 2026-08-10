'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { authApi } from '@/lib/api';
import { useAuth } from '@/store/auth';
import { Button, Card } from '@/components/ui';
import type { User as UserType } from '@/types';

function VerifyOtpContent() {
  const router = useRouter();
  const params = useSearchParams();
  const { login } = useAuth();

  const email = params.get('email') || '';
  const purpose = (params.get('purpose') === 'register' ? 'register' : 'login') as
    | 'login'
    | 'register';

  const [digits, setDigits] = useState<string[]>(Array(6).fill(''));
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputsRef.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const handleDigitChange = (idx: number, value: string) => {
    const v = value.replace(/[^0-9]/g, '').slice(-1);
    setDigits((prev) => {
      const next = [...prev];
      next[idx] = v;
      return next;
    });
    if (v && idx < 5) inputsRef.current[idx + 1]?.focus();
  };

  const handleKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[idx] && idx > 0) {
      inputsRef.current[idx - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 6);
    if (!text) return;
    e.preventDefault();
    setDigits(Array.from({ length: 6 }, (_, i) => text[i] || ''));
    inputsRef.current[Math.min(text.length, 5)]?.focus();
  };

  const submitCode = async (code: string) => {
    setError('');
    setLoading(true);
    try {
      const res = await authApi.verifyOtp({ email, code, purpose });
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

      login(res.access_token, user);
      router.push('/dashboard');
    } catch (err: any) {
      localStorage.removeItem('lexis_token');
      setError(err?.response?.data?.detail || 'Kod hatalı veya süresi dolmuş.');
      setDigits(Array(6).fill(''));
      inputsRef.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = digits.join('');
    if (code.length !== 6) {
      setError('6 haneli kodu eksiksiz gir.');
      return;
    }
    await submitCode(code);
  };

  const handleResend = async () => {
    setError('');
    setResending(true);
    try {
      await authApi.resendOtp({ email, purpose });
      setCooldown(60);
      setDigits(Array(6).fill(''));
      inputsRef.current[0]?.focus();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Kod tekrar gönderilemedi.');
    } finally {
      setResending(false);
    }
  };

  if (!email) {
    return (
      <Card padding="lg" className="border-0 shadow-xl shadow-slate-200/60 text-center">
        <p className="text-slate-600">Geçersiz doğrulama bağlantısı.</p>
        <Link href="/login" className="text-sky-600 font-medium hover:underline mt-4 inline-block">
          Girişe dön
        </Link>
      </Card>
    );
  }

  return (
    <Card padding="lg" className="border-0 shadow-xl shadow-slate-200/60">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-slate-800">Doğrulama kodu gir</h1>
        <p className="text-slate-400 text-sm mt-2">
          <span className="font-medium text-slate-600">{email}</span> adresine gönderilen
          6 haneli kodu gir.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="flex justify-center gap-2" onPaste={handlePaste}>
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => {
                inputsRef.current[i] = el;
              }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={d}
              onChange={(e) => handleDigitChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              className="w-11 h-12 text-center text-lg font-semibold rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
            />
          ))}
        </div>

        {error && (
          <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600 text-center">
            {error}
          </div>
        )}

        <Button type="submit" className="w-full" size="lg" loading={loading}>
          Doğrula
        </Button>
      </form>

      <div className="text-center mt-5">
        <button
          type="button"
          onClick={handleResend}
          disabled={resending || cooldown > 0}
          className="text-sm text-sky-600 font-medium hover:underline disabled:text-slate-400 disabled:no-underline disabled:cursor-not-allowed"
        >
          {cooldown > 0
            ? `Yeni kod (${cooldown}sn)`
            : resending
            ? 'Gönderiliyor…'
            : 'Kodu tekrar gönder'}
        </button>
      </div>

      <p className="text-center text-sm text-slate-400 mt-6">
        <Link href="/login" className="text-sky-600 font-medium hover:underline">
          Girişe dön
        </Link>
      </p>
    </Card>
  );
}

export default function VerifyOtpPage() {
  return (
    <Suspense fallback={null}>
      <VerifyOtpContent />
    </Suspense>
  );
}
