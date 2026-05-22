'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, User, Lock } from 'lucide-react';
import { authApi } from '@/lib/api';
import { useAuth } from '@/store/auth';
import { Button, Input, Card } from '@/components/ui';
import type { User as UserType } from '@/types';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [form, setForm] = useState({ username: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authApi.login(form);
      // Backend returns token — build a minimal user object from what we have
      const user: UserType = {
        id: '',
        email: form.username,
        username: form.username,
        is_admin: false,
        daily_goal: 10,
        created_at: new Date().toISOString(),
      };
      login(res.access_token, user);
      router.push('/dashboard');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string | object } } };
      const detail = axiosErr?.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'Kullanıcı adı veya şifre hatalı.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card padding="lg" className="border-0 shadow-xl shadow-slate-200/60">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Hoş geldin 👋</h1>
        <p className="text-slate-400 text-sm mt-1">Hesabına giriş yap ve öğrenmeye devam et.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="E-posta veya kullanıcı adı"
          placeholder="ornek@email.com"
          value={form.username}
          onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))}
          leftIcon={<User size={16} />}
          required
          autoComplete="username"
          autoFocus
        />

        <Input
          label="Şifre"
          type={showPw ? 'text' : 'password'}
          placeholder="••••••••"
          value={form.password}
          onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
          leftIcon={<Lock size={16} />}
          rightIcon={
            <button type="button" onClick={() => setShowPw((v) => !v)} className="text-slate-400 hover:text-slate-600">
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          }
          required
          autoComplete="current-password"
        />

        {error && (
          <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <Button type="submit" className="w-full mt-2" size="lg" loading={loading}>
          Giriş Yap
        </Button>
      </form>

      <p className="text-center text-sm text-slate-400 mt-6">
        Hesabın yok mu?{' '}
        <Link href="/register" className="text-sky-600 font-medium hover:underline">
          Kayıt ol
        </Link>
      </p>
    </Card>
  );
}
