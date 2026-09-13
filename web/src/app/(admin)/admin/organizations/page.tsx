'use client';

// app/(admin)/admin/organizations/page.tsx — Admin paneli: Kurumlar.
//
// 13 Eylül 2026 — madde 9 (B2B Satış Paketi) kapsamı netleşirken kapatılan
// bir güvenlik/ürün boşluğunun düzeltmesi: "Kurumlarım" (organizations)
// self-serve'dü — HERHANGİ bir tüketici kullanıcı, hiçbir onay/ödeme
// olmadan kendi kurumunu açıp owner olabiliyordu (Sidebar'da koşulsuz
// görünen link + backend'de sadece get_current_user isteyen POST
// /organizations). Artık kurum oluşturma SADECE admin panelden yapılıyor
// (backend get_current_admin_full istiyor, bkz. routes/organizations.py)
// — B2B paketini satın alan müşterinin kendi Lexis hesabının e-postası
// owner_email olarak verilip o kullanıcı 'owner' yapılıyor, admin
// kendisi kurumun üyesi OLMUYOR. Üye ekleme/çıkarma, kurum raporu vb.
// hâlâ mevcut tüketici ekranlarından (app/(app)/organizations/[orgId])
// owner/admin rolündeki gerçek üye tarafından yapılıyor — bu sayfa sadece
// provizyon (oluşturma) + genel görünüm içindir, üye yönetimine
// karışmıyor (admin kurumun üyesi olmadığı için o ekranlara zaten giremez).
import { useEffect, useState } from 'react';
import { Building2, Loader2, AlertCircle, Plus, X, Users2 } from 'lucide-react';
import { adminApi, type AdminOrganizationItem } from '@/lib/api';
import { useAuth } from '@/store/auth';
import { getErrorMessage } from '@/lib/errors';

const DATE_LOCALE = 'tr-TR';

const PLAN_BADGE_CLASS: Record<string, string> = {
  free: 'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400',
  paid: 'bg-[#EAF3DE] text-[#3B6D11]',
};

function CreateOrgModal({ onSave, onClose }: {
  onSave: (name: string, ownerEmail: string) => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !ownerEmail.trim()) { setError('Lütfen kurum adı ve sahibinin e-postasını gir.'); return; }
    setSaving(true);
    setError('');
    try { await onSave(name.trim(), ownerEmail.trim()); onClose(); }
    catch (err: unknown) { setError(getErrorMessage(err, 'Kurum oluşturulamadı.')); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#EEEDFE] flex items-center justify-center"><Building2 className="w-4 h-4 text-[#534AB7]" /></div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">Yeni Kurum</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 dark:text-slate-500 hover:bg-gray-100 hover:dark:bg-slate-800 transition-colors"><X className="w-4 h-4" /></button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Kurum adı</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Örn. ABC Dil Kursu" maxLength={100} autoFocus
              className="w-full border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#534AB7] focus:border-transparent transition" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Sahibinin (owner) e-postası</label>
            <input type="email" value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} placeholder="musteri@ornek.com"
              className="w-full border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#534AB7] focus:border-transparent transition" />
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">Bu e-postayla kayıtlı bir Lexis hesabı olmalı — kurum bu kullanıcıya “owner” olarak açılır, sen kurumun üyesi olmazsın.</p>
          </div>

          {error && <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 rounded-xl px-3 py-2">{error}</p>}
        </form>

        <div className="flex gap-3 px-6 pb-6">
          <button onClick={onClose} className="flex-1 border border-gray-200 dark:border-slate-700 rounded-xl py-2.5 text-sm font-medium text-gray-600 dark:text-slate-400 hover:bg-gray-50 hover:dark:bg-slate-800 transition-colors">Vazgeç</button>
          <button onClick={handleSubmit as never} disabled={saving} className="flex-1 bg-[#534AB7] hover:bg-[#473fa0] disabled:opacity-50 text-white rounded-xl py-2.5 text-sm font-medium transition-colors">
            {saving ? 'Oluşturuluyor…' : 'Oluştur'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminOrganizationsPage() {
  const { user: currentUser } = useAuth();
  const isReadonly = currentUser?.role === 'admin_readonly';

  const [orgs, setOrgs] = useState<AdminOrganizationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const load = async () => {
    setLoading(true);
    try { setOrgs(await adminApi.listOrganizations()); }
    catch { setError('Kurumlar yüklenemedi.'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount'ta veri çekme (fetch-on-effect) deseni
    load();
  }, []);

  const handleCreate = async (name: string, ownerEmail: string) => {
    await adminApi.createOrganization(name, ownerEmail);
    load();
  };

  if (loading) {
    return <div className="p-8 flex items-center justify-center min-h-[60vh]"><Loader2 className="w-6 h-6 animate-spin text-gray-400 dark:text-slate-500" /></div>;
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Kurumlar</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
            B2B paketini satın alan müşteriler için kurum açma — self-serve oluşturma kapalı (13 Eylül 2026).
          </p>
        </div>
        {!isReadonly && (
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-1.5 bg-[#534AB7] hover:bg-[#473fa0] text-white text-sm font-semibold px-3.5 py-2 rounded-xl transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" />Yeni Kurum
          </button>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 rounded-xl px-3 py-2">{error}</p>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-slate-300 flex items-center gap-2"><Building2 className="w-4 h-4" />Tüm kurumlar</h2>
          <span className="text-xs font-medium bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400 px-2 py-0.5 rounded-full">{orgs.length} kayıt</span>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 dark:border-slate-800">
              {['Kurum', 'Sahip (owner)', 'Plan', 'Üye sayısı', 'Oluşturulma'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {orgs.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-gray-400 dark:text-slate-500">Henüz kurum açılmamış.</td></tr>
            ) : orgs.map((o) => (
              <tr key={o.id} className="border-b border-gray-50 dark:border-slate-800 last:border-0 hover:bg-slate-50 hover:dark:bg-slate-800">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-[#EEEDFE] flex items-center justify-center shrink-0"><Building2 className="w-3.5 h-3.5 text-[#534AB7]" /></div>
                    <span className="font-medium text-gray-900 dark:text-slate-100">{o.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-gray-600 dark:text-slate-400">
                  {o.owner_email ? (
                    <div>
                      <p className="text-gray-900 dark:text-slate-100">{o.owner_username || '—'}</p>
                      <p className="text-gray-400 dark:text-slate-500">{o.owner_email}</p>
                    </div>
                  ) : '—'}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${PLAN_BADGE_CLASS[o.plan] ?? PLAN_BADGE_CLASS.free}`}>{o.plan}</span>
                </td>
                <td className="px-4 py-3 text-xs text-gray-600 dark:text-slate-400">
                  <span className="inline-flex items-center gap-1"><Users2 className="w-3.5 h-3.5" />{o.member_count}</span>
                </td>
                <td className="px-4 py-3 text-xs text-gray-500 dark:text-slate-400">{new Date(o.created_at).toLocaleDateString(DATE_LOCALE)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-2xl px-4 py-3 text-xs text-gray-500 dark:text-slate-400 bg-gray-50 dark:bg-slate-900/60 flex items-start gap-2">
        <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
        <span>Üye ekleme/çıkarma ve kurum raporları artık sadece owner/admin rolündeki gerçek üyenin kendi hesabından (Kurumlarım → kurum detayı) yönetiliyor — bu panel sadece kurumu açar, üyeliğe karışmaz.</span>
      </div>

      {showCreate && <CreateOrgModal onSave={handleCreate} onClose={() => setShowCreate(false)} />}
    </div>
  );
}
