'use client';

// app/(app)/organizations/[orgId]/consent/page.tsx — Rapor Paylaşımı Onayı.
//
// İstatistik & Raporlama V2 öncelik #3, Faz 3 madde G — "KVKK onay
// mekanizması": kurum raporundaki (madde B, .../report/page.tsx)
// "top_learners" bölümü üyeleri İSİMLİ gösteriyor ve artık PDF/CSV/Excel'e
// export edilip e-postayla gönderilebiliyor (madde F) — bireysel performans
// verisinin bir üçüncü tarafa (kurum yöneticisi) düzenli raporlanması
// anlamına geliyor. Bu sayfa, üyenin KENDİ RIZASIYLA (opt-in, varsayılan
// KAPALI) bu görünürlüğe onay verdiği/geri çektiği yer — backend
// (routes/organizations.py::get_report_consent/set_report_consent) sadece
// current_user'ın KENDİ üyeliği için onay set etmesine izin veriyor, bir
// admin başka bir üye adına onay VEREMEZ.
//
// GÜNCELLEME (12 Eylül 2026, öncelik #4 "B2B Kurumsal Lig arayüzü" BİTTİ):
// artık kurum oluşturma/listeleme/üye yönetimi ekranları var
// (app/(app)/organizations/page.tsx + [orgId]/page.tsx, Sidebar'a
// eklendi) — bu sayfaya oradan link veriliyor. Bu dosyanın kendisi
// değişmedi, sadece artık "linksiz" değil.
//
// BİLİNÇLİ SINIR: bu, üyenin organization_members'a EKLENMESİNE onayı
// değil (bir admin hâlâ e-postayla doğrudan ekleyebiliyor — ayrı, daha
// büyük bir kapsam), sadece raporlarda İSİMLİ görünmeye onayı kapsıyor.
// Reşit olmayan üyeler için ebeveyn onayı gibi tam KVKK uyumluluğu da bu
// mekanizmanın kapsamı dışında.
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ShieldCheck, ShieldOff, Loader2, AlertCircle } from 'lucide-react';
import { clsx } from 'clsx';
import { organizationsApi, type OrganizationConsentStatus } from '@/lib/api';
import { useLocale } from '@/lib/i18n';
import { ORG_CONSENT_L } from '@/lib/orgConsentLocale';
import { PageHeader } from '@/components/layout/PageHeader';

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-6">
      {children}
    </div>
  );
}

export default function OrganizationConsentPage() {
  const params = useParams<{ orgId: string }>();
  const orgId = params.orgId;
  const { locale } = useLocale();
  const t = ORG_CONSENT_L[locale] ?? ORG_CONSENT_L.en;

  const [status, setStatus] = useState<OrganizationConsentStatus | null>(null);
  const [error, setError] = useState<'forbidden' | 'generic' | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);

  const load = useCallback(() => {
    setStatus(null);
    setError(null);
    organizationsApi.getConsent(orgId)
      .then(setStatus)
      .catch((e) => setError(e?.response?.status === 403 ? 'forbidden' : 'generic'));
  }, [orgId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount'ta veri cekme (fetch-on-effect) deseni, bkz. report/page.tsx
    load();
  }, [load]);

  const toggleConsent = async () => {
    if (!status) return;
    setSaving(true);
    setSaveError(false);
    try {
      const next = await organizationsApi.setConsent(orgId, !status.consent_given);
      setStatus(next);
    } catch {
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <PageHeader title={t.title} subtitle={t.subtitle} />

      <Card>
        <p className="text-sm text-gray-600 dark:text-slate-300 leading-relaxed mb-6">
          {t.explanation}
        </p>

        {error && (
          <div className="flex flex-col items-start gap-3">
            <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4" />
              {error === 'forbidden' ? t.forbiddenError : t.loadError}
            </p>
            {error === 'generic' && (
              <button
                type="button"
                onClick={load}
                className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
              >
                {t.retryBtn}
              </button>
            )}
          </div>
        )}

        {!error && !status && (
          <div className="flex items-center gap-2 text-sm text-gray-400 dark:text-slate-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            {t.loading}
          </div>
        )}

        {!error && status && (
          <div className="flex flex-col gap-4">
            <div
              className={clsx(
                'flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium',
                status.consent_given
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                  : 'bg-gray-50 text-gray-600 dark:bg-slate-800 dark:text-slate-300'
              )}
            >
              {status.consent_given ? <ShieldCheck className="w-4 h-4 shrink-0" /> : <ShieldOff className="w-4 h-4 shrink-0" />}
              <span>
                {status.consent_given ? t.grantedLabel : t.notGrantedLabel}
                {status.consent_given && status.consented_at && (
                  <span className="block text-xs font-normal opacity-80 mt-0.5">
                    {t.consentedAtTpl.replace('{date}', new Date(status.consented_at).toLocaleDateString())}
                  </span>
                )}
              </span>
            </div>

            <button
              type="button"
              onClick={toggleConsent}
              disabled={saving}
              className={clsx(
                'inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 w-fit',
                status.consent_given
                  ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              )}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {saving ? t.saving : (status.consent_given ? t.revokeBtn : t.grantBtn)}
            </button>

            {saveError && (
              <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" />
                {t.saveError}
              </p>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
