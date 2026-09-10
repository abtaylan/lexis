'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ShieldCheck, ShieldOff, UserX, UserCheck, Loader2, Users, Plus, X,
  ChevronRight, BookOpen, CheckCircle2, RefreshCw, Archive, Target,
  Calendar, Globe, GraduationCap, KeyRound, Eye, Trash2, AlertTriangle,
  ArrowUpDown, ArrowUp, ArrowDown,
} from 'lucide-react';
import { adminApi, languagesApi } from '@/lib/api';
import type { AdminUser, AdminUserDetail, Language } from '@/types';
import { useAuth } from '@/store/auth';
import { getErrorMessage } from '@/lib/errors';

// NOT: Bu dosya önceden artık var olmayan bir i18n API'sine (useT/t,
// dot-notation anahtarlar + interpolation) bağlıydı — lexis-subscription-
// multilang branch merge'inde i18n.ts silinip yerine i18n.tsx (farklı bir
// API) geldiğinde bu dosya güncellenmemiş kalmıştı ve derlenmiyordu (Madde
// 1d kapsamında bulunup düzeltildi). Admin panel iç kullanım için
// olduğundan burada bilinçli olarak sabit Türkçe metin kullanılıyor — aynı
// desen Premium/checkout sayfalarında da kabul edilmişti.

const DATE_LOCALE = 'tr-TR';

type SortKey = 'display_name' | 'email' | 'username' | 'password_masked' | 'role' | 'is_active' | 'created_at' | null;

const ROLE_LABELS: Record<string, string> = {
  admin: 'admin', admin_readonly: 'salt-okunur admin', user: 'user',
};

interface NewUserForm {
  display_name: string;
  email: string;
  password: string;
  role: string;
  daily_goal: number;
  native_lang: string;
  learning_lang: string;
}

// ── Kullanıcı oluşturma modalı ────────────────────────────────
function CreateUserModal({ languages, onSave, onClose }: {
  languages: Language[];
  onSave: (data: NewUserForm) => Promise<void>;
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
    if (!form.email || !form.password || !form.display_name) { setError('Lütfen zorunlu alanları doldurun.'); return; }
    if (form.native_lang === form.learning_lang) { setError('Ana dil ve öğrenilen dil aynı olamaz.'); return; }
    setSaving(true);
    try { await onSave(form); onClose(); }
    catch (err: unknown) { setError(getErrorMessage(err, 'Kullanıcı oluşturulamadı.')); }
    finally { setSaving(false); }
  };

  const fields = [
    { f: 'display_name', l: 'Ad Soyad', inputType: 'text', ph: 'Ad Soyad' },
    { f: 'email', l: 'E-posta', inputType: 'email', ph: 'ornek@eposta.com' },
    { f: 'password', l: 'Şifre', inputType: 'password', ph: '••••••••' },
  ];

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#EEEDFE] flex items-center justify-center"><Users className="w-4 h-4 text-[#534AB7]" /></div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">Yeni Kullanıcı</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 dark:text-slate-500 hover:bg-gray-100 hover:dark:bg-slate-800 transition-colors"><X className="w-4 h-4" /></button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-3">
          {fields.map(({ f, l, inputType, ph }) => (
            <div key={f}>
              <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">{l}</label>
              <input type={inputType} value={form[f as keyof typeof form]} onChange={(e) => set(f, e.target.value)} placeholder={ph}
                className="w-full border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#534AB7] focus:border-transparent transition" />
            </div>
          ))}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="flex items-center gap-1 text-xs font-medium text-gray-600 dark:text-slate-400 mb-1"><Globe className="w-3 h-3" />Ana dil</label>
              <select value={form.native_lang} onChange={(e) => set('native_lang', e.target.value)}
                className="w-full border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#534AB7] focus:border-transparent transition">
                {languages.map((l) => <option key={l.code} value={l.code}>{l.flag_emoji} {l.name_native}</option>)}
              </select>
            </div>
            <div>
              <label className="flex items-center gap-1 text-xs font-medium text-gray-600 dark:text-slate-400 mb-1"><GraduationCap className="w-3 h-3" />Öğrenilen dil</label>
              <select value={form.learning_lang} onChange={(e) => set('learning_lang', e.target.value)}
                className="w-full border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#534AB7] focus:border-transparent transition">
                {languages.map((l) => <option key={l.code} value={l.code}>{l.flag_emoji} {l.name_native}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Rol</label>
              <select value={form.role} onChange={(e) => set('role', e.target.value)}
                className="w-full border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#534AB7] focus:border-transparent transition">
                <option value="user">user</option>
                <option value="admin">admin</option>
                <option value="admin_readonly">salt-okunur admin</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Günlük hedef</label>
              <input type="number" min={1} max={50} value={form.daily_goal} onChange={(e) => set('daily_goal', Number(e.target.value))}
                className="w-full border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#534AB7] focus:border-transparent transition" />
            </div>
          </div>

          {error && <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 rounded-xl px-3 py-2">{error}</p>}
        </form>

        <div className="flex gap-3 px-6 pb-6">
          <button onClick={onClose} className="flex-1 border border-gray-200 dark:border-slate-700 rounded-xl py-2.5 text-sm font-medium text-gray-600 dark:text-slate-400 hover:bg-gray-50 hover:dark:bg-slate-800 transition-colors">Vazgeç</button>
          <button onClick={handleSubmit as never} disabled={saving} className="flex-1 bg-[#534AB7] hover:bg-[#473fa0] disabled:opacity-50 text-white rounded-xl py-2.5 text-sm font-medium transition-colors">
            {saving ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Kalıcı silme onay modalı ─────────────────────────────────
// Deaktif etmenin aksine GERİ ALINAMAZ bir işlem olduğu için tek tıkla
// çalışan native confirm() yerine, adminin kullanıcının e-postasını
// birebir yazmasını isteyen daha ağır bir onay adımı kullanılıyor
// (6 Eylül 2026, kullanıcı isteği).
function DeleteUserModal({ user, onConfirm, onClose }: {
  user: AdminUser;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}) {
  const [typed, setTyped] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const matches = typed.trim().toLowerCase() === (user.email || '').toLowerCase();

  const handleDelete = async () => {
    setDeleting(true);
    setError('');
    try { await onConfirm(); onClose(); }
    catch (err: unknown) { setError(getErrorMessage(err, 'Kullanıcı silinemedi.')); }
    finally { setDeleting(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center"><AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" /></div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">Kullanıcıyı Kalıcı Sil</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 dark:text-slate-500 hover:bg-gray-100 hover:dark:bg-slate-800 transition-colors"><X className="w-4 h-4" /></button>
        </div>

        <div className="px-6 py-5 space-y-3">
          <p className="text-sm text-gray-600 dark:text-slate-400">
            <strong>{user.display_name || user.email}</strong> ve tüm verisi (kelimeler, oyun geçmişi, XP,
            rozetler, arkadaşlıklar, mesajlar) kalıcı olarak silinecek. Bu işlem <strong>geri alınamaz</strong>.
          </p>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">
              Onaylamak için e-postayı yaz: <span className="font-mono">{user.email}</span>
            </label>
            <input type="text" value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={user.email}
              className="w-full border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition" />
          </div>
          {error && <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 rounded-xl px-3 py-2">{error}</p>}
        </div>

        <div className="flex gap-3 px-6 pb-6">
          <button onClick={onClose} className="flex-1 border border-gray-200 dark:border-slate-700 rounded-xl py-2.5 text-sm font-medium text-gray-600 dark:text-slate-400 hover:bg-gray-50 hover:dark:bg-slate-800 transition-colors">Vazgeç</button>
          <button onClick={handleDelete} disabled={!matches || deleting}
            className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl py-2.5 text-sm font-medium transition-colors">
            {deleting ? 'Siliniyor…' : 'Kalıcı Sil'}
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
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900">
          <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">Kullanıcı Detayı</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 dark:text-slate-500 hover:bg-gray-100 hover:dark:bg-slate-800 transition-colors"><X className="w-4 h-4" /></button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400 dark:text-slate-500" /></div>
        ) : detail ? (
          <div className="px-6 py-5 space-y-5">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#EEEDFE] flex items-center justify-center text-[#534AB7] text-xl font-bold shrink-0">
                {(detail.display_name || detail.email || '?')[0].toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-slate-100">{detail.display_name || '—'}</p>
                <p className="text-sm text-gray-500 dark:text-slate-400">{detail.email}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${detail.role === 'admin' ? 'bg-[#EEEDFE] text-[#534AB7]' : detail.role === 'admin_readonly' ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400' : 'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400'}`}>{ROLE_LABELS[detail.role] || detail.role}</span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${detail.is_active ? 'bg-[#EAF3DE] text-[#3B6D11]' : 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400'}`}>{detail.is_active ? 'Aktif' : 'Pasif'}</span>
                </div>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-3">Kelime İstatistikleri</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { l: 'Toplam kelime', v: detail.total_words, bg: 'bg-[#E6F1FB]', t: 'text-[#185FA5]', i: <BookOpen className="w-4 h-4" /> },
                  { l: 'Öğrenildi', v: detail.learned, bg: 'bg-[#EAF3DE]', t: 'text-[#3B6D11]', i: <CheckCircle2 className="w-4 h-4" /> },
                  { l: 'Öğreniliyor', v: detail.learning, bg: 'bg-[#FAEEDA]', t: 'text-[#854F0B]', i: <RefreshCw className="w-4 h-4" /> },
                  { l: 'Bugün eklenen', v: detail.words_today, bg: 'bg-[#E1F5EE]', t: 'text-[#0F6E56]', i: <Target className="w-4 h-4" /> },
                  { l: 'Aktif liste', v: detail.active_words, bg: 'bg-[#E6F1FB]', t: 'text-[#185FA5]', i: <Archive className="w-4 h-4" /> },
                  { l: 'Pasif liste', v: detail.passive_words, bg: 'bg-gray-100 dark:bg-slate-800', t: 'text-gray-500 dark:text-slate-400', i: <Archive className="w-4 h-4" /> },
                ].map(({ l, v, bg, t: color, i }) => (
                  <div key={l} className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-lg ${bg} ${color} flex items-center justify-center shrink-0`}>{i}</div>
                    <div><p className="text-base font-bold text-gray-900 dark:text-slate-100">{v}</p><p className="text-xs text-gray-500 dark:text-slate-400">{l}</p></div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-3">Hesap Bilgileri</p>
              <div>
                {[
                  { l: 'Kullanıcı adı', v: detail.username || '—', i: <Users className="w-3.5 h-3.5" /> },
                  { l: 'Şifre', v: detail.password_masked || '••••••••••', i: <KeyRound className="w-3.5 h-3.5" /> },
                  { l: 'Ana dil', v: detail.native_lang || '—', i: <Globe className="w-3.5 h-3.5" /> },
                  { l: 'Öğrenilen dil', v: detail.learning_lang || '—', i: <GraduationCap className="w-3.5 h-3.5" /> },
                  { l: 'Günlük hedef', v: `${detail.daily_goal ?? 5} kelime`, i: <Target className="w-3.5 h-3.5" /> },
                  { l: 'Kayıt tarihi', v: new Date(detail.created_at).toLocaleDateString(DATE_LOCALE, { day: 'numeric', month: 'long', year: 'numeric' }), i: <Calendar className="w-3.5 h-3.5" /> },
                  { l: 'Kullanıcı ID', v: detail.id, i: <Users className="w-3.5 h-3.5" /> },
                ].map(({ l, v, i }) => (
                  <div key={l} className="flex items-center justify-between py-2.5 border-b border-gray-50 dark:border-slate-800 last:border-0">
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-slate-400">{i}{l}</div>
                    <span className="text-xs font-medium text-gray-700 dark:text-slate-300 truncate max-w-[220px] font-mono">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : <p className="p-6 text-sm text-gray-400 dark:text-slate-500">Kullanıcı bilgileri yüklenemedi.</p>}
      </div>
    </div>
  );
}

// ── Ana sayfa ─────────────────────────────────────────────────
export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const isReadonly = currentUser?.role === 'admin_readonly';

  const [users, setUsers]     = useState<AdminUser[]>([]);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [detailId, setDetailId]     = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [search, setSearch]   = useState('');
  // Yönetim Paneli Faz devamı (10 Eylül 2026 kullanıcı isteği --
  // "Kullanıcı Listesi altında bulunan tüm sütunlarda artan azalan
  // özelliği olsun"): her sütun başlığına tıklanınca o alana göre
  // artan/azalan sıralama. `null` = varsayılan (backend zaten
  // created_at DESC döndürüyor, bkz. list_users).
  const [sortKey, setSortKey] = useState<SortKey>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const handleSort = (key: SortKey) => {
    if (key === null) return;
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const load = async () => {
    setLoading(true);
    try { setUsers(await adminApi.getUsers()); }
    catch { setError('Kullanıcılar yüklenemedi.'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount/parametre değişiminde veri çekme (fetch-on-effect) deseni; senkron setState çağrısı kasıtlı, davranış değiştirilmedi
    load();
    languagesApi.getAll().then(setLanguages).catch(() => setLanguages([
      { code: 'en', name_native: 'English', name_en: 'English', flag_emoji: '🇬🇧', is_active: true },
      { code: 'tr', name_native: 'Türkçe', name_en: 'Turkish', flag_emoji: '🇹🇷', is_active: true },
    ]));
  }, []);

  const handleRoleToggle = async (u: AdminUser) => {
    const newRole = u.role === 'admin' ? 'user' : 'admin';
    if (!confirm(`${u.email} için rol '${newRole}' olarak değiştirilsin mi?`)) return;
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
    } catch { alert('İşlem başarısız oldu.'); }
  };

  const handleCreate = async (data: NewUserForm) => { await adminApi.createUser(data); load(); };

  const handleDeletePermanent = async (u: AdminUser) => {
    await adminApi.deleteUserPermanently(u.id);
    load();
  };

  const filtered = users.filter((u) =>
    !search ||
    (u.display_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.username || '').toLowerCase().includes(search.toLowerCase())
  );

  // Yönetim Paneli Faz devamı (10 Eylül 2026 -- "tüm sütunlarda artan
  // azalan özelliği olsun"): sortKey seçiliyken filtrelenmiş listeyi o
  // alana göre sırala -- boolean (Durum) ve tarih (Kayıt tarihi) için
  // özel karşılaştırma, geri kalanı yerel (tr) string karşılaştırması.
  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      if (sortKey === 'is_active') {
        return (Number(a.is_active) - Number(b.is_active)) * dir;
      }
      if (sortKey === 'created_at') {
        return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * dir;
      }
      const av = (a[sortKey] ?? '') as string;
      const bv = (b[sortKey] ?? '') as string;
      return av.localeCompare(bv, 'tr') * dir;
    });
  }, [filtered, sortKey, sortDir]);

  const columns: { label: string; key: SortKey }[] = [
    { label: 'Kullanıcı', key: 'display_name' },
    { label: 'E-posta', key: 'email' },
    { label: 'Kullanıcı adı', key: 'username' },
    { label: 'Şifre', key: 'password_masked' },
    { label: 'Rol', key: 'role' },
    { label: 'Durum', key: 'is_active' },
    { label: 'Kayıt tarihi', key: 'created_at' },
    { label: '', key: null },
  ];

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Kullanıcılar</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">Tüm kullanıcıları görüntüle ve yönet</p>
        </div>
        {!isReadonly && (
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 bg-[#534AB7] hover:bg-[#473fa0] text-white rounded-xl px-4 py-2.5 text-sm font-medium shadow-sm transition-colors">
            <Plus className="w-4 h-4" />Kullanıcı Ekle
          </button>
        )}
      </div>

      {isReadonly && (
        <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 rounded-2xl px-4 py-3 text-sm">
          <Eye className="w-4 h-4 shrink-0" />Salt görüntüleme modundasınız — kullanıcı ekleme/düzenleme işlemleri kapalı.
        </div>
      )}

      <div className="relative max-w-sm">
        <Users className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
        <input type="text" placeholder="Kullanıcı ara…" value={search} onChange={(e) => setSearch(e.target.value)}
          className="pl-9 pr-3 py-2 border border-gray-200 dark:border-slate-700 rounded-xl text-sm w-full focus:outline-none focus:ring-2 focus:ring-[#534AB7] focus:border-transparent transition" />
      </div>

      {loading ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-12 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-gray-400 dark:text-slate-500"><Loader2 className="w-6 h-6 animate-spin" /><span className="text-sm">Yükleniyor…</span></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 rounded-2xl px-4 py-3 text-sm">{error}</div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-slate-300">Kullanıcı Listesi</h2>
            <span className="text-xs font-medium bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400 px-2 py-0.5 rounded-full">{sorted.length} kayıt</span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-slate-800">
                {columns.map((col, i) => (
                  <th key={i} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide">
                    {col.key ? (
                      <button
                        type="button"
                        onClick={() => handleSort(col.key)}
                        className="flex items-center gap-1 hover:text-gray-700 hover:dark:text-slate-200 transition-colors"
                      >
                        {col.label}
                        {sortKey === col.key ? (
                          sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 opacity-40" />
                        )}
                      </button>
                    ) : col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((u) => (
                <tr key={u.id} className="border-b border-gray-50 dark:border-slate-800 last:border-0 hover:bg-slate-50 hover:dark:bg-slate-800 transition-colors group">
                  <td className="px-4 py-3 font-semibold text-gray-900 dark:text-slate-100">{u.display_name || '—'}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-slate-400 text-xs">{u.email}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-slate-400 text-xs">{u.username || '—'}</td>
                  <td className="px-4 py-3 text-gray-400 dark:text-slate-500 text-xs font-mono tracking-wider">{u.password_masked || '••••••••••'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full ${u.role === 'admin' ? 'bg-[#EEEDFE] text-[#534AB7]' : u.role === 'admin_readonly' ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400' : 'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400'}`}>
                      {u.role === 'admin' ? '⬡ admin' : u.role === 'admin_readonly' ? '👁 salt-okunur' : 'user'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full ${u.is_active ? 'bg-[#EAF3DE] text-[#3B6D11]' : 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400'}`}>
                      {u.is_active ? 'Aktif' : 'Pasif'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400 dark:text-slate-500">{new Date(u.created_at).toLocaleDateString(DATE_LOCALE, { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => setDetailId(u.id)} className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 dark:text-slate-500 hover:text-[#534AB7] hover:bg-[#EEEDFE] transition-colors" title="Detay"><ChevronRight className="w-3.5 h-3.5" /></button>
                      {!isReadonly && (
                        <>
                          <button onClick={() => handleRoleToggle(u)} className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 dark:text-slate-500 hover:text-[#534AB7] hover:bg-[#EEEDFE] transition-colors opacity-0 group-hover:opacity-100" title={u.role === 'admin' ? 'Adminliği kaldır' : 'Admin yap'}>
                            {u.role === 'admin' ? <ShieldOff className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                          </button>
                          <button onClick={() => handleToggleActive(u)} className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100 ${u.is_active ? 'text-gray-400 dark:text-slate-500 hover:text-red-500 hover:dark:text-red-400 hover:bg-red-50 hover:dark:bg-red-500/10' : 'text-gray-400 dark:text-slate-500 hover:text-[#3B6D11] hover:bg-[#EAF3DE]'}`} title={u.is_active ? 'Deaktif et' : 'Aktifleştir'}>
                            {u.is_active ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                          </button>
                          {u.role !== 'admin' && u.role !== 'admin_readonly' && (
                            <button onClick={() => setDeleteTarget(u)} className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 dark:text-slate-500 hover:text-red-600 hover:dark:text-red-400 hover:bg-red-50 hover:dark:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100" title="Kalıcı sil">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </>
                      )}
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
      {deleteTarget && (
        <DeleteUserModal
          user={deleteTarget}
          onConfirm={() => handleDeletePermanent(deleteTarget)}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
