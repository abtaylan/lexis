'use client';

// app/(app)/organizations/[orgId]/page.tsx — Kurum Detay / Üye Yönetimi.
//
// V2 öncelik #4 (12 Eylül 2026) — "B2B Kurumsal Lig Arayüzü": kurum-içi
// üye listesi (liderlik tablosu, bkz. backend routes/organizations.py::
// list_organization_members) + üye davet (SADECE owner/admin, bkz.
// MANAGE_ROLES) + üye çıkarma (SADECE owner/admin, son owner çıkarılamaz)
// + mevcut Kurum Raporu (madde B) ve Rapor Paylaşımı Onayı (madde G)
// sayfalarına linkler — o iki sayfa şimdiye kadar "linksiz ama işlevsel"
// bir desende, sadece org_id bilen birinin doğrudan URL ile erişebileceği
// şekildeydi; bu sayfa artık onları buraya bağlıyor.
//
// Kurum adı/planı/kendi-rolüm listMembers uç noktasında YOK (sadece üye
// listesi dönüyor) — bu yüzden organizationsApi.list() de çekilip org_id
// eşleşen kayıttan alınıyor (liste zaten küçük, ekstra bir round-trip
// maliyeti önemsiz).
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Loader2, AlertCircle, UserPlus, Trash2, FileBarChart2, ShieldCheck,
  ShieldOff, Crown, Shield, User as UserIcon,
} from 'lucide-react';
import { organizationsApi, type OrganizationListItem, type OrganizationMember } from '@/lib/api';
import { useLocale } from '@/lib/i18n';
import { ORG_MEMBERS_L } from '@/lib/orgMembersLocale';
import { PageHeader } from '@/components/layout/PageHeader';

const MANAGE_ROLES = new Set(['owner', 'admin']);

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-5">
      {children}
    </div>
  );
}

const ROLE_ICON: Record<string, typeof Crown> = {
  owner: Crown,
  admin: Shield,
  member: UserIcon,
};

export default function OrganizationDetailPage() {
  const params = useParams<{ orgId: string }>();
  const orgId = params.orgId;
  const { locale } = useLocale();
  const t = ORG_MEMBERS_L[locale] ?? ORG_MEMBERS_L.en;

  const roleLabel: Record<string, string> = {
    owner: t.roleOwner,
    admin: t.roleAdmin,
    member: t.roleMember,
  };

  const [org, setOrg] = useState<OrganizationListItem | null>(null);
  const [members, setMembers] = useState<OrganizationMember[] | null>(null);
  const [error, setError] = useState<'forbidden' | 'generic' | null>(null);

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member');
  const [inviting, setInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [removeErrorId, setRemoveErrorId] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    Promise.all([organizationsApi.list(), organizationsApi.listMembers(orgId)])
      .then(([orgs, memberItems]) => {
        const match = orgs.find((o) => o.id === orgId) ?? null;
        if (!match) {
          setError('forbidden');
          return;
        }
        setOrg(match);
        setMembers(memberItems);
      })
      .catch((e) => setError(e?.response?.status === 403 ? 'forbidden' : 'generic'));
  }, [orgId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount'ta veri cekme (fetch-on-effect) deseni
    load();
  }, [load]);

  const canManage = org ? MANAGE_ROLES.has(org.my_role) : false;

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setInviteMsg(null);
    try {
      const member = await organizationsApi.inviteMember(orgId, inviteEmail.trim(), inviteRole);
      setInviteMsg({ kind: 'ok', text: t.inviteSuccessTpl.replace('{name}', member.username ?? member.email ?? inviteEmail) });
      setInviteEmail('');
      load();
    } catch (e: unknown) {
      const status = (e as { response?: { status?: number } })?.response?.status;
      const text = status === 404 ? t.inviteErrorNotFound : status === 400 ? t.inviteErrorDuplicate : t.inviteErrorGeneric;
      setInviteMsg({ kind: 'err', text });
    } finally {
      setInviting(false);
    }
  };

  // Not: owner rolündeki bir üye için zaten aşağıda "Çıkar" butonu hiç
  // gösterilmiyor (bkz. render — canManage && m.role !== 'owner'), bu
  // yüzden backend'in "son owner çıkarılamaz" koruması (400) bu UI'dan
  // pratikte hiç tetiklenmiyor — yine de savunma amaçlı orada duruyor.
  const handleRemove = async (member: OrganizationMember) => {
    const label = member.username ?? member.email ?? member.user_id.slice(0, 8);
    if (!window.confirm(t.removeConfirmTpl.replace('{name}', label))) return;
    setRemovingId(member.user_id);
    setRemoveErrorId(null);
    try {
      await organizationsApi.removeMember(orgId, member.user_id);
      load();
    } catch {
      setRemoveErrorId(member.user_id);
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="max-w-2xl">
      <Link href="/organizations" className="inline-block text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline mb-3">
        {t.backToListBtn}
      </Link>

      {error ? (
        <Card>
          <div className="flex flex-col items-center text-center gap-3 py-6">
            <p className="text-sm text-gray-500 dark:text-slate-400 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4" />
              {error === 'forbidden' ? t.forbiddenError : t.error}
            </p>
            {error === 'generic' && (
              <button type="button" onClick={load} className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline">
                {t.retryBtn}
              </button>
            )}
          </div>
        </Card>
      ) : !org || !members ? (
        <div className="p-10 flex justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
        </div>
      ) : (
        <>
          <PageHeader
            title={org.name}
            subtitle={`${t.yourRoleLabel}: ${roleLabel[org.my_role] ?? org.my_role}`}
          />

          <div className="flex flex-wrap gap-2 mb-4">
            <Link
              href={`/organizations/${orgId}/report`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              <FileBarChart2 className="w-3.5 h-3.5" />
              {t.reportLinkLabel}
            </Link>
            <Link
              href={`/organizations/${orgId}/consent`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              {t.consentLinkLabel}
            </Link>
          </div>

          {canManage && (
            <Card>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-slate-100 mb-3">{t.inviteSectionTitle}</h2>
              <div className="flex flex-wrap items-end gap-2">
                <div className="flex-1 min-w-[180px]">
                  <label className="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">{t.inviteEmailLabel}</label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder={t.inviteEmailPlaceholder}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">{t.inviteRoleLabel}</label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as 'admin' | 'member')}
                    className="px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-gray-900 dark:text-slate-100"
                  >
                    <option value="member">{t.inviteRoleMember}</option>
                    <option value="admin">{t.inviteRoleAdmin}</option>
                  </select>
                </div>
                <button
                  type="button"
                  onClick={handleInvite}
                  disabled={inviting || !inviteEmail.trim()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50"
                >
                  {inviting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                  {inviting ? t.inviteSending : t.inviteSubmitBtn}
                </button>
              </div>
              {inviteMsg && (
                <p className={`mt-2.5 text-xs font-medium ${inviteMsg.kind === 'ok' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                  {inviteMsg.text}
                </p>
              )}
            </Card>
          )}

          <div className="h-4" />

          <Card>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-slate-100 mb-3">
              {t.membersSectionTitle} · {t.memberCountTpl.replace('{count}', String(members.length))}
            </h2>
            <ul className="divide-y divide-gray-100 dark:divide-slate-800">
              {members.map((m) => {
                const RoleIcon = ROLE_ICON[m.role] ?? UserIcon;
                const label = m.username ?? m.email ?? m.user_id.slice(0, 8);
                return (
                  <li key={m.user_id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <RoleIcon className="w-4 h-4 text-gray-400 dark:text-slate-500 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-slate-100 truncate">{label}</p>
                        <div className="flex items-center gap-1.5 text-[11px] text-gray-400 dark:text-slate-500">
                          <span>{roleLabel[m.role] ?? m.role}</span>
                          <span>·</span>
                          <span>{m.total_xp} {t.xpUnit}</span>
                          <span>·</span>
                          {m.consent_given ? (
                            <span className="inline-flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400">
                              <ShieldCheck className="w-3 h-3" />{t.consentGivenLabel}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-0.5">
                              <ShieldOff className="w-3 h-3" />{t.consentNotGivenLabel}
                            </span>
                          )}
                        </div>
                        {removeErrorId === m.user_id && (
                          <p className="text-[11px] text-red-600 dark:text-red-400 mt-0.5">{t.removeErrorGeneric}</p>
                        )}
                      </div>
                    </div>
                    {canManage && m.role !== 'owner' && (
                      <button
                        type="button"
                        onClick={() => handleRemove(m)}
                        disabled={removingId === m.user_id}
                        className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700 dark:text-red-400 disabled:opacity-50 shrink-0"
                      >
                        {removingId === m.user_id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                        {t.removeBtn}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </Card>
        </>
      )}
    </div>
  );
}
