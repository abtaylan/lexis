'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, Lock, KeyRound } from 'lucide-react';
import { authApi } from '@/lib/api';
import { Button, Input, Card } from '@/components/ui';

function ResetPasswordContent() {
  const router = useRouter();
  const params = useSearchParams();
  const email = params.get('email') || '';

  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (code.trim().length !== 6) {
      setError('6 haneli kodu eksiksiz gir.');
      return;
    }
    if (newPassword.length < 6) {
      setError('Şifre en az 6 karakter olmalı.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Şifreler eşleşmiyor.');
      return;
    }

    setLoading(true);
    try {
      await authApi.resetPassword({ email, code: code.trim(), new_password: newPassword });
      setDone(true);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setError(axiosErr?.response?.data?.detail || 'Kod hatalı veya süresi dolmuş.');
    } finally {
      setLoading(false);
    }
  };

  if (!email) {
    return (
      <Card padding="lg" className="border-0 shadow-xl shadow-slate-200/60 text-center">
        <p className="text-slate-600">Geçersiz bağlantı.</p>
        <Link href="/forgot-password" className="text-sky-600 font-medium hover:underline mt-4 inline-block">
          Şifremi unuttum sayfasına dön
        </Link>
      </Card>
    );
  }

  if (done) {
    return (
      <Card padding="lg" className="border-0 shadow-xl shadow-slate-200/60 text-center">
        <div className="w-11 h-11 bg-sky-500 rounded-xl flex items-center justify-center shrink-0 mx-auto mb-4">
          <KeyRound size={20} className="text-white" strokeWidth={2.5} />
        </div>
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Şifren güncellendi</h1>
        <p className="text-slate-400 text-sm mb-6">
          Yeni şifrenle giriş yapabilirsin.
        </p>
        <Button type="button" className="w-full" size="lg" onClick={() => router.push('/login')}>
          Girişe git
        </Button>
      </Card>
    );
  }

  return (
    <Card padding="lg" className="border-0 shadow-xl shadow-slate-200/60">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-slate-800">Şifreni sıfırla</h1>
        <p className="text-slate-400 text-sm mt-2">
          <span className="font-medium text-slate-600">{email}</span> adresine gönderilen
          6 haneli kodu ve yeni şifreni gir.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Doğrulama kodu"
          type="text"
          inputMode="numeric"
          maxLength={6}
          placeholder="123456"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
          leftIcon={<KeyRound size={16} />}
          autoFocus
          required
        />

        <Input
          label="Yeni şifre"
          type={showPw ? 'text' : 'password'}
          placeholder="En az 6 karakter"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          leftIcon={<Lock size={16} />}
          rightIcon={
            <button type="button" onClick={() => setShowPw((v) => !v)} className="text-slate-400 hover:text-slate-600">
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          }
          required
        />

        <Input
          label="Yeni şifre (tekrar)"
          type={showPw ? 'text' : 'password'}
          placeholder="Şifreni tekrar gir"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          leftIcon={<Lock size={16} />}
          required
        />

        {error && (
          <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <Button type="submit" className="w-full mt-2" size="lg" loading={loading}>
          Şifreyi güncelle
        </Button>
      </form>

      <p className="text-center text-sm text-slate-400 mt-6">
        <Link href="/login" className="text-sky-600 font-medium hover:underline">
          Girişe dön
        </Link>
      </p>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordContent />
    </Suspense>
  );
}
