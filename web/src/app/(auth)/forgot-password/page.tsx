'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mail, KeyRound } from 'lucide-react';
import { authApi } from '@/lib/api';
import { Button, Input, Card } from '@/components/ui';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.includes('@')) {
      setError('Geçerli bir e-posta gir.');
      return;
    }

    setLoading(true);
    try {
      await authApi.forgotPassword(email);
      setSent(true);
    } catch (err: unknown) {
      // Backend güvenlik gereği zaten hata döndürmüyor (her zaman genel mesaj) —
      // ama ağ hatası gibi durumlar için yine de bir fallback bırakıyoruz.
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setError(axiosErr?.response?.data?.detail || 'Bir şeyler ters gitti, tekrar dene.');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <Card padding="lg" className="border-0 shadow-xl shadow-slate-200/60 text-center">
        <div className="w-11 h-11 bg-sky-500 rounded-xl flex items-center justify-center shrink-0 mx-auto mb-4">
          <KeyRound size={20} className="text-white" strokeWidth={2.5} />
        </div>
        <h1 className="text-2xl font-bold text-slate-800 mb-2">E-postanı kontrol et</h1>
        <p className="text-slate-400 text-sm mb-6">
          <span className="font-medium text-slate-600">{email}</span> adresi sistemde kayıtlıysa,
          şifreni sıfırlamak için 6 haneli bir kod gönderdik.
        </p>
        <Button
          type="button"
          className="w-full"
          size="lg"
          onClick={() => router.push(`/reset-password?email=${encodeURIComponent(email)}`)}
        >
          Kodu gir
        </Button>
        <p className="text-center text-sm text-slate-400 mt-6">
          <Link href="/login" className="text-sky-600 font-medium hover:underline">
            Girişe dön
          </Link>
        </p>
      </Card>
    );
  }

  return (
    <Card padding="lg" className="border-0 shadow-xl shadow-slate-200/60">
      <div className="mb-8 flex items-center gap-3">
        <div className="w-11 h-11 bg-sky-500 rounded-xl flex items-center justify-center shrink-0">
          <KeyRound size={20} className="text-white" strokeWidth={2.5} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Şifreni mi unuttun?</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            E-postanı gir, sana bir sıfırlama kodu gönderelim.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="E-posta"
          type="email"
          placeholder="ornek@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          leftIcon={<Mail size={16} />}
          autoFocus
          required
        />

        {error && (
          <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <Button type="submit" className="w-full mt-2" size="lg" loading={loading}>
          Sıfırlama kodu gönder
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
