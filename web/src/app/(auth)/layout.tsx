'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Zap } from 'lucide-react';
import { useAuth } from '@/store/auth';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, isLoading, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-slate-50 flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-sky-500 to-sky-700 text-white flex-col justify-between p-12 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-64 h-64 rounded-full bg-white blur-3xl" />
          <div className="absolute bottom-20 right-10 w-48 h-48 rounded-full bg-white blur-3xl" />
        </div>

        {/* Logo */}
        <div className="flex items-center gap-3 relative">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
            <Zap size={20} className="text-white" strokeWidth={2.5} />
          </div>
          <span className="text-2xl font-bold tracking-tight">Lexis</span>
        </div>

        {/* Headline */}
        <div className="relative">
          <h2 className="text-3xl font-bold leading-tight mb-4">
            Kelime öğrenmenin<br />en akıllı yolu
          </h2>
          <p className="text-sky-100 text-lg leading-relaxed">
            Spaced repetition algoritması ile yalnızca doğru anda tekrar et.
            Daha az çalış, daha çok öğren.
          </p>

          {/* Stats */}
          <div className="mt-10 grid grid-cols-3 gap-4">
            {[
              { label: 'Algoritma', value: 'SM-2' },
              { label: 'Dil desteği', value: 'EN→TR' },
              { label: 'Ücretsiz', value: '100%' },
            ].map((s) => (
              <div key={s.label} className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-sky-200 text-sm mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-sky-200 text-sm relative">
          © {new Date().getFullYear()} Lexis. Tüm hakları saklıdır.
        </p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md animate-fade-in">
          {children}
        </div>
      </div>
    </div>
  );
}
