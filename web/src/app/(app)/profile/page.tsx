'use client';

import { useEffect, useState } from 'react';
import { User, Save, CheckCircle, Lock, Mail, AtSign, Eye, EyeOff } from 'lucide-react';
import { authApi } from '@/lib/api';
import type { User as UserType } from '@/types';

export default function ProfilePage() {
  const [user, setUser]               = useState<UserType | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername]       = useState('');
  const [email, setEmail]             = useState('');
  const [dailyGoal, setDailyGoal]     = useState(10);
  const [password, setPassword]       = useState('');
  const [showPw, setShowPw]           = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [error, setError]     = useState('');

  useEffect(() => {
    authApi.getMe()
      .then((u) => {
        setUser(u);
        setDisplayName(u.display_name ?? '');
        setUsername(u.username ?? '');
        setEmail(u.email ?? '');
        setDailyGoal(u.daily_goal ?? 10);
      })
      .catch(() => setError('Profil bilgileri yüklenemedi.'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        display_name: displayName.trim() || undefined,
        daily_goal: dailyGoal,
      };
      // Sadece değişenleri gönder
      if (username.trim() && username.trim() !== user?.username) payload.username = username.trim();
      if (email.trim() && email.trim() !== user?.email) payload.email = email.trim();
      if (password.trim()) payload.password = password.trim();

      const updated = await authApi.updateProfile(payload);
      setUser(updated);
      setPassword('');
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);

      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('lexis_user');
        if (stored) {
          const parsed = JSON.parse(stored);
          localStorage.setItem('lexis_user', JSON.stringify({ ...parsed, ...updated }));
        }
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Kaydedilemedi, tekrar deneyin.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-6 text-sm text-gray-400">Yükleniyor…</div>;

  const inputCls = "w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition";

  return (
    <div className="p-6 max-w-lg space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
          <User className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Profil</h1>
          <p className="text-sm text-gray-400">{user?.email}</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
        {/* Görünen ad */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Görünen ad</label>
          <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Adınız" maxLength={60} className={inputCls} />
        </div>

        {/* Kullanıcı adı — düzenlenebilir */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1"><AtSign className="w-3 h-3" />Kullanıcı adı</label>
          <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="kullaniciadi" maxLength={50} className={inputCls} />
        </div>

        {/* E-posta — düzenlenebilir */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1"><Mail className="w-3 h-3" />E-posta</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ornek@email.com" className={inputCls} />
          <p className="text-xs text-gray-400 mt-1">E-postayı değiştirirsen Supabase doğrulama maili gönderebilir.</p>
        </div>

        {/* Şifre — yeni şifre */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1"><Lock className="w-3 h-3" />Yeni şifre</label>
          <div className="relative">
            <input type={showPw ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Değiştirmek istemiyorsan boş bırak" className={inputCls} />
            <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Günlük hedef */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Günlük kelime hedefi</label>
          <div className="flex items-center gap-3">
            <input type="range" min={1} max={50} value={dailyGoal} onChange={(e) => setDailyGoal(Number(e.target.value))} className="flex-1 accent-blue-600" />
            <span className="w-12 text-center text-sm font-semibold text-blue-600 bg-blue-50 rounded-lg py-1">{dailyGoal}</span>
          </div>
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>}

        <button type="submit" disabled={saving} className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl py-2.5 text-sm font-medium transition-colors">
          {saved ? <><CheckCircle className="w-4 h-4" /> Kaydedildi</> : <><Save className="w-4 h-4" />{saving ? 'Kaydediliyor…' : 'Kaydet'}</>}
        </button>
      </form>

      <div className="bg-gray-50 rounded-2xl border border-gray-100 p-5 space-y-3">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Hesap Bilgileri</h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><p className="text-gray-400 text-xs">Rol</p><p className="font-medium text-gray-700 capitalize">{user?.role ?? '—'}</p></div>
          <div><p className="text-gray-400 text-xs">Üyelik tarihi</p><p className="font-medium text-gray-700">{user?.created_at ? new Date(user.created_at).toLocaleDateString('tr-TR') : '—'}</p></div>
        </div>
      </div>
    </div>
  );
}
