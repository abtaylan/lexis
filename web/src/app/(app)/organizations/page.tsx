'use client';

// app/(app)/organizations/page.tsx — "Kurumlarım" (Organizations) liste
// sayfası.
//
// V2 öncelik #4 (12 Eylül 2026) — "B2B Kurumsal Lig Arayüzü": backend
// (routes/organizations.py) madde B/F/G ile kurum RAPORU/export/onay
// tarafını bitirmişti ama kurum OLUŞTURMA/listeleme ekranı hiç yoktu —
// bu yüzden report/consent sayfaları "linksiz ama işlevsel" bir desende
// kalmıştı (Sidebar'a bağlanmamıştı). Bu sayfa o boşluğu kapatıyor: artık
// Sidebar'a EKLENDİ (bkz. components/layout/Sidebar.tsx) — kullanıcı
// buradan kurum oluşturup [orgId] detay sayfasına geçebiliyor, oradan da
// mevcut rapor/onay sayfalarına link var.
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Building2, Loader2, AlertCircle, Plus, X, ChevronRight } from 'lucide-react';
import { organizationsApi, type OrganizationListItem } from '@/lib/api';
import { useLocale } from '@/lib/i18n';
import { ORG_LIST_L } from '@/lib/orgListLocale';
import { PageHeader } from '@/components/layout/PageHeader';

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm">
      {children}
    </div>
  );
}

const ROLE_BADGE_CLASS: Record<string, string> = {
  owner: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
  admin: 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',
  member: 'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-300',
};

export default function OrganizationsListPage() {
  const { locale } = useLocale();
  const t = ORG_LIST_L[locale] ?? ORG_LIST_L.en;

  const [orgs, setOrgs] = useState<OrganizationListItem[] | null>(null);
  const [error, setError] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState(false);

  const roleLabel: Record<string, string> = {
    owner: t.roleOwner,
    admin: t.roleAdmin,
    member: t.roleMember,
  };

  const load = useCallback(() => {
    setOrgs(null);
    setError(false);
    organizationsApi.list().then(setOrgs).catch(() => setError(true));
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount'ta veri cekme (fetch-on-effect) deseni
    load();
  }, [load]);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setCreating(true);
    setCreateError(false);
    try {
      await organizationsApi.create(name.trim());
      setShowCreate(false);
      setName('');
      load();
    } catch {
      setCreateError(true);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <PageHeader
        title={t.title}
        subtitle={t.subtitle}
        action={
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-3.5 py-2 rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" />
            {t.createBtn}
          </button>
        }
      />

      <Card>
        {error ? (
          <div className="p-10 flex flex-col items-center gap-3 text-center">
            <p className="text-sm text-gray-500 dark:text-slate-400 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4" />
              {t.error}
            </p>
            <button type="button" onClick={load} className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline">
              {t.retryBtn}
            </button>
          </div>
        ) : orgs === null ? (
          <div className="p-10 flex justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
          </div>
        ) : orgs.length === 0 ? (
          <div className="p-10 flex flex-col items-center text-center gap-2">
            <Building2 className="w-8 h-8 text-gray-300 dark:text-slate-600 mb-1" />
            <p className="text-sm font-medium text-gray-700 dark:text-slate-200">{t.emptyTitle}</p>
            <p className="text-xs text-gray-400 dark:text-slate-500 max-w-xs">{t.emptyBody}</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-slate-800">
            {orgs.map((org) => (
              <li key={org.id}>
                <Link
                  href={`/organizations/${org.id}`}
                  className="flex items-center justify-between gap-3 px-5 py-4 hover:bg-gray-50 dark:hover:bg-slate-800/60 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center shrink-0">
                      <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-slate-100 truncate">{org.name}</p>
                      <span className={`inline-flex items-center text-[11px] font-medium px-1.5 py-0.5 rounded-full mt-0.5 ${ROLE_BADGE_CLASS[org.my_role] ?? ROLE_BADGE_CLASS.member}`}>
                        {roleLabel[org.my_role] ?? org.my_role}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 dark:text-slate-600 shrink-0" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {showCreate && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => !creating && setShowCreate(false)}>
          <div
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-sm p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-base font-bold text-gray-900 dark:text-slate-100">{t.createModalTitle}</h2>
              <button type="button" onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-gray-400 dark:text-slate-500 mb-4">{t.createModalSubtitle}</p>

            <label className="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1.5">{t.createNameLabel}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t.createNamePlaceholder}
              maxLength={100}
              autoFocus
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-gray-900 dark:text-slate-100 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            {createError && (
              <p className="text-xs text-red-600 dark:text-red-400 mb-3">{t.createErrorMsg}</p>
            )}

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                disabled={creating}
                className="px-3.5 py-2 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                {t.createCancelBtn}
              </button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={creating || !name.trim()}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50"
              >
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {creating ? t.createSubmitting : t.createSubmitBtn}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
