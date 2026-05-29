'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authApi } from '@/lib/api';
import { useAuth } from '@/store/auth';
import type { User } from '@/types';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [form, setForm] = useState({ email: '', password: '' });
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
      const res = await authApi.login(form);

      // Interceptor'un getMe() için token'i okuyabilmesi amacıyla
      // once localStorage'a yaz, sonra /auth/me'yi cagir
      localStorage.setItem('lexis_token', res.access_token);
      const me = await authApi.getMe();

      const user: User = {
        id:           me.id,
        email:        me.email,
        display_name: me.display_name,
        username:     (me as any).username || me.display_name || '',
        is_admin:     (me as any).is_admin ?? (me as any).role === 'admin',
        role:         (me as any).role,
        daily_goal:   (me as any).daily_goal ?? 5,
        created_at:   (me as any).created_at || new Date().toISOString(),
      };

      login(res.access_token, user);
      router.push('/dashboard');
    } catch (err: any) {
      localStorage.removeItem('lexis_token');
      setError(
        err?.response?.data?.detail || 'Giriş yapılamadı. Bilgilerinizi kontrol edin.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-md p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">Lexis'e Giriş Yap</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">E-posta</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              required
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Şifre</label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              required
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-lg py-2 text-sm transition-colors"
          >
            {loading ? 'Giriş yapılıyor…' : 'Giriş Yap'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-500">
          Hesabın yok mu?{' '}
          <Link href="/register" className="text-blue-600 hover:underline">
            Kayıt ol
          </Link>
        </p>
      </div>
    </div>
  );
}