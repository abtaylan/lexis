'use client';

// Admin panel — İstatistikler sayfası görünüm seçici + Raporlar sayfası
// entegrasyonu (kullanıcı isteği, 18 Eylül 2026 — "İstatistik & Analitik
// Kataloğu" doc, Ek kapsam madde 1-2). Kullanıcı ARA + SEÇ, seçilen
// kullanıcı/kurum için mevcut UserReport/OrganizationReport (haftalık/
// aylık) görüntülenir — aynı veri kaynağı kullanıcının kendi "Raporum"
// sayfasıyla paylaşılıyor (backend: admin_platform.py::admin_user_report /
// admin_organization_report). Admin panel iç kullanım olduğu için (10
// dilli web raporlarının aksine) bilinçli olarak sadece Türkçe.

import { useEffect, useMemo, useState } from 'react';
import { Search, Loader2, User as UserIcon, Building2 } from 'lucide-react';
import { adminApi } from '@/lib/api';
import type { UserReport, OrganizationReport, AdminOrganizationItem } from '@/lib/api';
import type { AdminUser } from '@/types';

function PeriodToggle({ period, onChange }: { period: 'week' | 'month'; onChange: (p: 'week' | 'month') => void }) {
  return (
    <div className="inline-flex rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden text-sm">
      {(['week', 'month'] as const).map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onChange(p)}
          className={`px-3 py-1.5 font-medium transition-colors ${
            period === p
              ? 'bg-[#534AB7] text-white'
              : 'bg-white dark:bg-slate-900 text-gray-500 dark:text-slate-400 hover:bg-gray-50 hover:dark:bg-slate-800'
          }`}
        >
          {p === 'week' ? 'Haftalık' : 'Aylık'}
        </button>
      ))}
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4">
      <p className="text-xs text-gray-500 dark:text-slate-400">{label}</p>
      <p className="text-xl font-bold text-gray-900 dark:text-slate-100 mt-0.5">{value}</p>
      {sub && <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{sub}</p>}
    </div>
  );
}

function TopicList({ title, topics }: { title: string; topics: { topic_tag: string; attempts: number; accuracy: number }[] }) {
  if (!topics.length) return null;
  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">{title}</p>
      <ul className="space-y-1">
        {topics.map((t) => (
          <li key={t.topic_tag} className="text-sm text-gray-700 dark:text-slate-300 flex justify-between">
            <span>{t.topic_tag}</span>
            <span className="text-gray-400 dark:text-slate-500">%{t.accuracy} ({t.attempts})</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function pct(n: number | null): string {
  return n === null ? '—' : `${n >= 0 ? '+' : ''}${n}%`;
}

export function UserReportCards({ report }: { report: UserReport }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Çalışma süresi" value={`${report.study.minutes_current} dk`} sub={pct(report.study.minutes_change_pct)} />
        <StatCard label="Kelime hazinesi" value={report.vocabulary.total_words} sub={`%${report.vocabulary.learned_pct} öğrenildi`} />
        <StatCard label="Seri" value={`${report.streak.current} gün`} sub={`en uzun: ${report.streak.longest}`} />
        <StatCard
          label="Sınav/konu doğruluğu"
          value={report.exam.accuracy_current !== null ? `%${report.exam.accuracy_current}` : '—'}
          sub={report.exam.accuracy_previous !== null ? `önceki: %${report.exam.accuracy_previous}` : undefined}
        />
        <StatCard label="Oyun ort. skor" value={report.games.avg_score_current} sub={`${report.games.sessions_current} oturum`} />
        <StatCard label="Görev ilerlemesi" value={`%${report.quests.progress_pct}`} sub={`${report.quests.completed_total} tamamlandı`} />
        <StatCard label="Rozetler" value={report.badges.total_earned} sub={`bu dönem: +${report.badges.earned_current}`} />
        <StatCard label="Lig" value={report.league.current_tier || '—'} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <TopicList title="En zayıf konular" topics={report.exam.weak_topics} />
        <TopicList title="En güçlü konular" topics={report.exam.strong_topics} />
      </div>

      <div className="bg-[#EEEDFE] dark:bg-slate-800 rounded-xl p-4 text-sm text-[#534AB7] dark:text-slate-300">
        {report.platform.xp_percentile !== null
          ? `Platformdaki kullanıcıların %${report.platform.xp_percentile}'inden daha fazla XP kazanmış (kıyaslanan aktif kohort: ${report.platform.cohort_size} kullanıcı).`
          : 'Yüzdelik dilim için yeterli platform verisi yok.'}
      </div>
    </div>
  );
}

export function OrgReportCards({ report }: { report: OrganizationReport }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Üye sayısı" value={report.member_count} sub={`aktif: ${report.active_member_count}`} />
        <StatCard label="Çalışma süresi" value={`${report.study.minutes_current} dk`} sub={pct(report.study.minutes_change_pct)} />
        <StatCard label="Konu doğruluğu" value={report.accuracy.current !== null ? `%${report.accuracy.current}` : '—'} />
        <StatCard label="Yeni kelime" value={report.vocabulary.new_words_current} sub={pct(report.vocabulary.new_words_change_pct)} />
      </div>

      <div>
        <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 mb-2">En aktif üyeler</p>
        {report.top_learners.length ? (
          <ul className="space-y-1">
            {report.top_learners.map((m) => (
              <li key={m.user_id} className="text-sm text-gray-700 dark:text-slate-300 flex justify-between bg-slate-50 dark:bg-slate-800 rounded-lg px-3 py-1.5">
                <span>{m.username || 'İsimsiz üye'}</span>
                <span className="text-gray-400 dark:text-slate-500">{m.xp_gained} XP</span>
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-gray-400 dark:text-slate-500">Veri yok.</p>}
      </div>

      <TopicList title="Kurum geneli zayıf konular" topics={report.weak_topics} />

      <p className="text-xs text-gray-400 dark:text-slate-500">
        Rapor paylaşımına onay veren üye: {report.consent_summary.consented_count} / {report.consent_summary.total_count}
      </p>
    </div>
  );
}

export function UserReportExplorer() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<AdminUser | null>(null);
  const [period, setPeriod] = useState<'week' | 'month'>('week');
  const [report, setReport] = useState<UserReport | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    adminApi.getUsers().then(setUsers).catch(() => {}).finally(() => setLoadingUsers(false));
  }, []);

  useEffect(() => {
    if (!selected) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- seçim/periyot değişince yeniden çekme (fetch-on-effect) deseni
    setLoadingReport(true);
    setError('');
    adminApi.getUserReport(selected.id, period)
      .then(setReport)
      .catch(() => setError('Rapor yüklenemedi.'))
      .finally(() => setLoadingReport(false));
  }, [selected, period]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return users.filter((u) =>
      (u.display_name || '').toLowerCase().includes(q)
      || (u.username || '').toLowerCase().includes(q)
      || (u.email || '').toLowerCase().includes(q)
    ).slice(0, 8);
  }, [users, query]);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-6 space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-10 h-10 rounded-xl bg-[#E6F1FB] text-[#185FA5] flex items-center justify-center"><UserIcon className="w-5 h-5" /></div>
        <div>
          <h2 className="text-sm font-semibold text-gray-700 dark:text-slate-300">Kullanıcı raporu</h2>
          <p className="text-xs text-gray-400 dark:text-slate-500">Bir kullanıcı seç, kendi &quot;Raporum&quot; sayfasındaki verileri gör.</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={selected ? (selected.display_name || selected.username || selected.email) : query}
            onChange={(e) => { setSelected(null); setReport(null); setQuery(e.target.value); }}
            placeholder="İsim, kullanıcı adı veya e-posta ara…"
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#534AB7]/30"
          />
          {!selected && results.length > 0 && (
            <div className="absolute z-10 mt-1 w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl shadow-lg max-h-64 overflow-y-auto">
              {results.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => { setSelected(u); setQuery(''); }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 hover:dark:bg-slate-800 flex flex-col"
                >
                  <span className="text-gray-900 dark:text-slate-100 font-medium">{u.display_name || u.username || '(isim yok)'}</span>
                  <span className="text-xs text-gray-400 dark:text-slate-500">{u.email}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <PeriodToggle period={period} onChange={setPeriod} />
      </div>

      {loadingUsers && <p className="text-xs text-gray-400 dark:text-slate-500">Kullanıcı listesi yükleniyor…</p>}
      {!selected && !loadingUsers && <p className="text-sm text-gray-400 dark:text-slate-500">Bir kullanıcı seçmek için yukarıdan ara.</p>}
      {loadingReport && <div className="p-6 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>}
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      {selected && report && !loadingReport && <UserReportCards report={report} />}
    </div>
  );
}

export function OrgReportExplorer() {
  const [orgs, setOrgs] = useState<AdminOrganizationItem[]>([]);
  const [loadingOrgs, setLoadingOrgs] = useState(true);
  const [selectedId, setSelectedId] = useState<string>('');
  const [period, setPeriod] = useState<'week' | 'month'>('week');
  const [report, setReport] = useState<OrganizationReport | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    adminApi.listOrganizations().then(setOrgs).catch(() => {}).finally(() => setLoadingOrgs(false));
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- seçim/periyot değişince yeniden çekme (fetch-on-effect) deseni
    setLoadingReport(true);
    setError('');
    adminApi.getOrganizationReportAdmin(selectedId, period)
      .then(setReport)
      .catch(() => setError('Rapor yüklenemedi.'))
      .finally(() => setLoadingReport(false));
  }, [selectedId, period]);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-6 space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-10 h-10 rounded-xl bg-[#EAF3DE] text-[#3B6D11] flex items-center justify-center"><Building2 className="w-5 h-5" /></div>
        <div>
          <h2 className="text-sm font-semibold text-gray-700 dark:text-slate-300">Kurum raporu</h2>
          <p className="text-xs text-gray-400 dark:text-slate-500">Bir kurum seç, kurum geneli ilerleme raporunu gör.</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <select
          value={selectedId}
          onChange={(e) => { setSelectedId(e.target.value); setReport(null); }}
          className="flex-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#534AB7]/30"
        >
          <option value="">Kurum seç…</option>
          {orgs.map((o) => (
            <option key={o.id} value={o.id}>{o.name} ({o.member_count} üye)</option>
          ))}
        </select>
        <PeriodToggle period={period} onChange={setPeriod} />
      </div>

      {loadingOrgs && <p className="text-xs text-gray-400 dark:text-slate-500">Kurum listesi yükleniyor…</p>}
      {!selectedId && !loadingOrgs && <p className="text-sm text-gray-400 dark:text-slate-500">Bir kurum seçmek için yukarıdan seç.</p>}
      {loadingReport && <div className="p-6 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>}
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      {selectedId && report && !loadingReport && <OrgReportCards report={report} />}
    </div>
  );
}
