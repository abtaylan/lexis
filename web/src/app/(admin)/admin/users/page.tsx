'use client';

import { useEffect, useState } from 'react';
import {
  ShieldCheck, ShieldOff, UserX, UserCheck, Loader2, Users, Plus, X,
  ChevronRight, BookOpen, CheckCircle2, RefreshCw, Archive, Target,
  Calendar, Globe, GraduationCap, KeyRound,
} from 'lucide-react';
import { adminApi, languagesApi } from '@/lib/api';
import type { AdminUser, AdminUserDetail, Language } from '@/types';

// ── Kullanıcı oluşturma modalı ────────────────────────────────
function CreateUserModal({ languages, onSave, onClose }: {
  languages: Language[];
  onSave: (data: any) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    display_name: '', email: '', password: '',
    role: 'user', daily_goal: 5, native_lang: 'tr', learning_lang: 'en',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const set = (f: string, v: string | number) => setForm((p) => ({ ...p, [f]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.password || !form.display_name) { setError('Ad, e-posta ve şifre zorunludur.'); return; }
    if (form.native_lang === form.learning_lang) { setError('Öğrenilen dil ana dilden farklı olmalı.'); return; }
    setSaving(true);
    try { await onSave(form); onClose(); }
    catch (err: any) { setError(err?.response?.data?.detail || 'Kullanıcı oluşturulamadı.'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100 sticky top-0 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#EEEDFE] flex items-center justify-center"><Users className="w-4 h-4 text-[#534AB7]" /></div>
            <h2 className="text-base font-semibold text-gray-900">Yeni Kullanıcı</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors"><X className="w-4 h-4" /></button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-3">
          {[
            { f: 'display_name', l: 'Ad Soyad *', t: 'text', ph: 'Ahmet Yılmaz' },
            { f: 'email', l: 'E-posta *', t: 'email', ph: 'ornek@email.com' },
            { f: 'password', l: 'Şifre *', t: 'password', ph: 'En az 6 karakter' },
          ].map(({ f, l, t, ph }) => (
            <div key={f}>
              <label className="block text-xs font-medium text-gray-600 mb-1">{l}</label>
              <input type={t} value={(form as any)[f]} onChange={(e) => set(f, e.target.value)} placeholder={ph}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#534AB7] focus:border-transparent transition" />
            </div>
          ))}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="flex items-center gap-1 text-xs font-medium text-gray-600 mb-1"><Globe className="w-3 h-3" />Ana dil</label>
              <select value={form.native_lang} onChange={(e) => set('native_lang', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#534AB7] focus:border-transparent transition">
                {languages.map((l) => <option key={l.code} value={l.code}>{l.flag_emoji} {l.name_native}</option>)}
              </select>
            </div>
            <div>
              <label className="flex items-center gap-1 text-xs font-medium text-gray-600 mb-1"><GraduationCap className="w-3 h-3" />Öğrenilen</label>
              <select value={form.learning_lang} onChange={(e) => set('learning_lang', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#534AB7] focus:border-transparent transition">
                {languages.map((l) => <option key={l.code} value={l.code}>{l.flag_emoji} {l.name_native}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Rol</label>
              <select value={form.role} onChange={(e) => set('role', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#534AB7] focus:border-transparent transition">
                <option value="user">user</option><option value="admin">admin</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Günlük Hedef</label>
              <input type="number" min={1} max={50} value={form.daily_goal} onChange={(e) => set('daily_goal', Number(e.target.value))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#534AB7] focus:border-transparent transition" />
            </div>
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>}
        </form>

        <div className="flex gap-3 px-6 pb-6">
          <button onClick={onClose} className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">İptal</button>
          <button onClick={handleSubmit as never} disabled={saving} className="flex-1 bg-[#534AB7] hover:bg-[#473fa0] disabled:opacity-50 text-white rounded-xl py-2.5 text-sm font-medium transition-colors">
            {saving ? 'Oluşturuluyor…' : 'Oluştur'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Detay paneli ──────────────────────────────────────────────
function UserDetailPanel({ userId, onClose }: { userId: string; onClose: () => void }) {
  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.getUserDetail(userId).then(setDetail).finally(() => setLoading(false));
  }, [userId]);

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100 sticky top-0 bg-white">
          <h2 className="text-base font-semibold text-gray-900">Kullanıcı Detayı</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors"><X className="w-4 h-4" /></button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
        ) : detail ? (
          <div className="px-6 py-5 space-y-5">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#EEEDFE] flex items-center justify-center text-[#534AB7] text-xl font-bold shrink-0">
                {(detail.display_name || detail.email || '?')[0].toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-gray-900">{detail.display_name || '—'}</p>
                <p className="text-sm text-gray-500">{detail.email}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${detail.role === 'admin' ? 'bg-[#EEEDFE] text-[#534AB7]' : 'bg-gray-100 text-gray-500'}`}>{detail.role}</span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${detail.is_active ? 'bg-[#EAF3DE] text-[#3B6D11]' : 'bg-red-50 text-red-600'}`}>{detail.is_active ? 'Aktif' : 'Pasif'}</span>
                </div>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Kelime İstatistikleri</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { l: 'Toplam', v: detail.total_words, bg: 'bg-[#E6F1FB]', t: 'text-[#185FA5]', i: <BookOpen className="w-4 h-4" /> },
                  { l: 'Öğrenildi', v: detail.learned, bg: 'bg-[#EAF3DE]', t: 'text-[#3B6D11]', i: <CheckCircle2 className="w-4 h-4" /> },
                  { l: 'Öğreniliyor', v: detail.learning, bg: 'bg-[#FAEEDA]', t: 'text-[#854F0B]', i: <RefreshCw className="w-4 h-4" /> },
                  { l: 'Bugün', v: detail.words_today, bg: 'bg-[#E1F5EE]', t: 'text-[#0F6E56]', i: <Target className="w-4 h-4" /> },
                  { l: 'Aktif Liste', v: detail.active_words, bg: 'bg-[#E6F1FB]', t: 'text-[#185FA5]', i: <Archive className="w-4 h-4" /> },
                  { l: 'Pasif Liste', v: detail.passive_words, bg: 'bg-gray-100', t: 'text-gray-500', i: <Archive className="w-4 h-4" /> },
                ].map(({ l, v, bg, t, i }) => (
                  <div key={l} className="bg-slate-50 rounded-xl p-3 flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-lg ${bg} ${t} flex items-center justify-center shrink-0`}>{i}</div>
                    <div><p className="text-base font-bold text-gray-900">{v}</p><p className="text-xs text-gray-500">{l}</p></div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Hesap Bilgileri</p>
              <div>
                {[
                  { l: 'Kullanıcı adı', v: detail.username || '—', i: <Users className="w-3.5 h-3.5" /> },
                  { l: 'Şifre', v: detail.password_masked || '••••••••••', i: <KeyRound className="w-3.5 h-3.5" /> },
                  { l: 'Ana dil', v: detail.native_lang || '—', i: <Globe className="w-3.5 h-3.5" /> },
                  { l: 'Öğrenilen dil', v: detail.learning_lang || '—', i: <GraduationCap className="w-3.5 h-3.5" /> },
                  { l: 'Günlük hedef', v: `${detail.daily_goal ?? 5} kelime`, i: <Target className="w-3.5 h-3.5" /> },
                  { l: 'Kayıt tarihi', v: new Date(detail.created_at).toLocaleDateString('tr-TR', { day:'numeric', month:'long', year:'numeric' }), i: <Calendar className="w-3.5 h-3.5" /> },
                  { l: 'Kullanıcı ID', v: detail.id, i: <Users className="w-3.5 h-3.5" /> },
                ].map(({ l, v, i }) => (
                  <div key={l} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
                    <div className="flex items-center gap-2 text-xs text-gray-500">{i}{l}</div>
                    <span className="text-xs font-medium text-gray-700 truncate max-w-[220px] font-mono">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : <p className="p-6 text-sm text-gray-400">Detay yüklenemedi.</p>}
      </div>
    </div>
  );
}

// ── Ana sayfa ─────────────────────────────────────────────────
export default function AdminUsersPage() {
  const [users, setUsers]     = useState<AdminUser[]>([]);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [detailId, setDetailId]     = useState<string | null>(null);
  const [search, setSearch]   = useState('');

  const load = async () => {
    setLoading(true);
    try { setUsers(await adminApi.getUsers()); }
    catch { setError('Kullanıcılar yüklenemedi.'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    load();
    languagesApi.getAll().then(setLanguages).catch(() => setLanguages([
      { code: 'en', name_native: 'English', name_en: 'English', flag_emoji: '🇬🇧', is_active: true },
      { code: 'tr', name_native: 'Türkçe', name_en: 'Turkish', flag_emoji: '🇹🇷', is_active: true },
    ]));
  }, []);

  const handleRoleToggle = async (u: AdminUser) => {
    const newRole = u.role === 'admin' ? 'user' : 'admin';
    if (!confirm(`${u.email} rolü "${newRole}" olsun mu?`)) return;
    try { await adminApi.updateUserRole(u.id, newRole); load(); } catch { alert('Rol güncellenemedi.'); }
  };

  const handleToggleActive = async (u: AdminUser) => {
    try {
      if (u.is_active) {
        if (!confirm(`${u.email} deaktif edilsin mi?`)) return;
        await adminApi.deactivateUser(u.id);
      } else {
        await adminApi.activateUser(u.id);
      }
      load();
    } catch { alert('İşlem başarısız.'); }
  };

  const handleCreate = async (data: any) => { await adminApi.createUser(data); load(); };

  const filtered = users.filter((u) =>
    !search ||
    (u.display_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.username || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kişiler</h1>
          <p className="text-sm text-gray-500 mt-0.5">Sistemdeki tüm kullanıcılar</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 bg-[#534AB7] hover:bg-[#473fa0] text-white rounded-xl px-4 py-2.5 text-sm font-medium shadow-sm transition-colors">
          <Plus className="w-4 h-4" />Kullanıcı Ekle
        </button>
      </div>

      <div className="relative max-w-sm">
        <Users className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input type="text" placeholder="İsim, e-posta veya kullanıcı adı ara…" value={search} onChange={(e) => setSearch(e.target.value)}
          className="pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm w-full focus:outline-none focus:ring-2 focus:ring-[#534AB7] focus:border-transparent transition" />
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-gray-400"><Loader2 className="w-6 h-6 animate-spin" /><span className="text-sm">Yükleniyor…</span></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 text-red-600 rounded-2xl px-4 py-3 text-sm">{error}</div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">Kullanıcılar</h2>
            <span className="text-xs font-medium bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{filtered.length} kayıt</span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {['Kullanıcı','E-posta','Kullanıcı adı','Şifre','Rol','Durum','Kayıt',''].map((h, i) => (
                  <th key={i} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id} className="border-b border-gray-50 last:border-0 hover:bg-slate-50 transition-colors group">
                  <td className="px-4 py-3 font-semibold text-gray-900">{u.display_name || '—'}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{u.email}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{u.username || '—'}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs font-mono tracking-wider">{u.password_masked || '••••••••••'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full ${u.role === 'admin' ? 'bg-[#EEEDFE] text-[#534AB7]' : 'bg-gray-100 text-gray-500'}`}>
                      {u.role === 'admin' ? '⬡ admin' : 'user'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full ${u.is_active ? 'bg-[#EAF3DE] text-[#3B6D11]' : 'bg-red-50 text-red-600'}`}>
                      {u.is_active ? 'Aktif' : 'Pasif'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">{new Date(u.created_at).toLocaleDateString('tr-TR', { day:'numeric', month:'short', year:'numeric' })}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => setDetailId(u.id)} className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-[#534AB7] hover:bg-[#EEEDFE] transition-colors" title="Detay"><ChevronRight className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleRoleToggle(u)} className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-[#534AB7] hover:bg-[#EEEDFE] transition-colors opacity-0 group-hover:opacity-100" title={u.role === 'admin' ? 'Admin kaldır' : 'Admin yap'}>
                        {u.role === 'admin' ? <ShieldOff className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                      </button>
                      <button onClick={() => handleToggleActive(u)} className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100 ${u.is_active ? 'text-gray-400 hover:text-red-500 hover:bg-red-50' : 'text-gray-400 hover:text-[#3B6D11] hover:bg-[#EAF3DE]'}`} title={u.is_active ? 'Deaktif et' : 'Aktif et'}>
                        {u.is_active ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && <CreateUserModal languages={languages} onSave={handleCreate} onClose={() => setShowCreate(false)} />}
      {detailId && <UserDetailPanel userId={detailId} onClose={() => setDetailId(null)} />}
    </div>
  );
}
