'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, User, Lock, Mail } from 'lucide-react';
import { authApi } from '@/lib/api';
import { useAuth } from '@/store/auth';
import { Button, Input, Card } from '@/components/ui';
import type { User as UserType } from '@/types';

export default function RegisterPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [form, setForm] = useState({ email: '', username: '', password: '', display_name: '' });
  const [showPw, setShowPw] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.email.includes('@')) e.email = 'Geçerli bir e-posta gir.';
    if (form.username.length < 3) e.username = 'En az 3 karakter olmalı.';
    if (form.password.length < 6) e.password = 'En az 6 karakter olmalı.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await authApi.register(form);
      const tokenRes = await authApi.login({ username: form.email, password: form.password });
      const user: UserType = {
        id: '',
        email: form.email,
        username: form.username,
        full_name: form.display_name,
        is_admin: false,
        daily_goal: 10,
        created_at: new Date().toISOString(),
      };
      login(tokenRes.access_token, user);
      router.push('/dashboard');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string | object } } };
      const detail = axiosErr?.response?.data?.detail;
      setErrors({ form: typeof detail === 'string' ? detail : 'Kayıt başarısız. Bu e-posta zaten kullanılıyor olabilir.' });
    } finally {
      setLoading(false);
    }
  };

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  return (
    <Card padding="lg" className="border-0 shadow-xl shadow-slate-200/60">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Hesap oluştur</h1>
        <p className="text-slate-400 text-sm mt-1">Birkaç saniyede başlangıç yap.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Ad Soyad"
          placeholder="Ahmet Yılmaz"
          value={form.display_name}
          onChange={set('display_name')}
          leftIcon={<User size={16} />}
          autoFocus
        />
        <Input
          label="E-posta"
          type="email"
          placeholder="ornek@email.com"
          value={form.email}
          onChange={set('email')}
          leftIcon={<Mail size={16} />}
          error={errors.email}
          required
        />
        <Input
          label="Kullanıcı adı"
          placeholder="kullaniciadi"
          value={form.username}
          onChange={set('username')}
          leftIcon={<User size={16} />}
          error={errors.username}
          required
        />
        <Input
          label="Şifre"
          type={showPw ? 'text' : 'password'}
          placeholder="En az 6 karakter"
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

        {errors.form && (
          <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
            {errors.form}
          </div>
        )}

        <Button type="submit" className="w-full mt-2" size="lg" loading={loading}>
          Hesap Oluştur
        </Button>
      </form>

      <p className="text-center text-sm text-slate-400 mt-6">
        Zaten hesabın var mı?{' '}
        <Link href="/login" className="text-sky-600 font-medium hover:underline">
          Giriş yap
        </Link>
      </p>
    </Card>
  );
}