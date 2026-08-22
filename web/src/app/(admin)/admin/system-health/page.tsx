'use client';

import { useEffect, useState } from 'react';
import {
  Activity, Loader2, CheckCircle2, XCircle, Clock, Database, Mail,
  CreditCard, Send, Smartphone, RefreshCw,
} from 'lucide-react';
import { adminApi } from '@/lib/api';
import type { SystemHealth } from '@/types';

const JOB_LABELS: Record<string, string> = {
  expire_premium: 'Premium süresi dolan kullanıcıları kapat',
  send_schedule_reminders: 'Program hatırlatmaları gönder',
  post_daily_content: 'Günlük sosyal medya içeriği paylaş',
};

function formatDate(iso?: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${ok ? 'bg-[#EAF3DE] text-[#3B6D11]' : 'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400'}`}>
      {ok ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}{label}
    </span>
  );
}

export default function SystemHealthPage() {
  const [data, setData] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    adminApi.getSystemHealth().then(setData).catch(() => setError('Sistem sağlığı bilgisi alınamadı.')).finally(() => setLoading(false));
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect -- mount/parametre değişiminde veri çekme (fetch-on-effect) deseni; senkron setState çağrısı kasıtlı, davranış değiştirilmedi
  useEffect(load, []);

  if (loading) {
    return <div className="p-8 flex items-center justify-center min-h-[60vh]"><Loader2 className="w-6 h-6 animate-spin text-gray-400 dark:text-slate-500" /></div>;
  }
  if (error || !data) return <div className="p-8"><div className="bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 rounded-2xl px-4 py-3 text-sm">{error}</div></div>;

  const uptimeHours = Math.floor(data.backend.uptime_seconds / 3600);
  const uptimeMinutes = Math.floor((data.backend.uptime_seconds % 3600) / 60);

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Sistem Sağlığı</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">Backend, veritabanı, entegrasyonlar ve arka plan işleri</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 text-sm text-gray-500 dark:text-slate-400 hover:text-[#534AB7] transition-colors">
          <RefreshCw className="w-4 h-4" />Yenile
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#EAF3DE] text-[#3B6D11] flex items-center justify-center shrink-0"><Activity className="w-6 h-6" /></div>
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">Backend — çalışıyor</p>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">Çalışma süresi: {uptimeHours}s {uptimeMinutes}dk · v{data.backend.version}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-5 flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${data.database.status === 'ok' ? 'bg-[#E6F1FB] text-[#185FA5]' : 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400'}`}><Database className="w-6 h-6" /></div>
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">Veritabanı — {data.database.status === 'ok' ? 'erişilebilir' : 'hata'}</p>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">Gecikme: {data.database.latency_ms != null ? `${data.database.latency_ms} ms` : '—'}</p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-6">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-4">Entegrasyon durumu</h2>
        <div className="flex flex-wrap gap-2">
          <StatusPill ok={data.integrations.iyzico_configured} label={`iyzico ${data.integrations.iyzico_configured ? 'yapılandırıldı' : 'yapılandırılmadı'}`} />
          <StatusPill ok={data.integrations.otp_mode === 'real'} label={`OTP: ${data.integrations.otp_mode}`} />
          <StatusPill ok={data.integrations.smtp_configured} label={`SMTP ${data.integrations.smtp_configured ? 'yapılandırıldı' : 'yapılandırılmadı'}`} />
          <StatusPill ok={data.integrations.social_post_mode === 'real'} label={`Sosyal paylaşım: ${data.integrations.social_post_mode}`} />
          <StatusPill ok={data.integrations.telegram_configured} label={`Telegram ${data.integrations.telegram_configured ? 'yapılandırıldı' : 'yapılandırılmadı'}`} />
          <StatusPill ok={data.integrations.slack_configured} label={`Slack ${data.integrations.slack_configured ? 'yapılandırıldı' : 'yapılandırılmadı'}`} />
        </div>
        <p className="text-xs text-gray-400 dark:text-slate-500 mt-3">&quot;OTP: fixed&quot; ve &quot;Sosyal paylaşım: fixed&quot; test modunda olduğunu gösterir — production&apos;a geçişte &quot;real&quot; yapılması gerekir (bkz. Bölüm 4).</p>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-slate-300">Arka plan işleri (cron script&apos;leri)</h2>
          <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">Henüz VPS cron&apos;una bağlanmadılar — manuel/lokal çalıştırmalar burada görünür</p>
        </div>
        <div className="divide-y divide-gray-50 dark:divide-slate-800">
          {data.cron_jobs.map((job) => (
            <div key={job.job_name} className="px-6 py-4 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">{job.job_name}</p>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{JOB_LABELS[job.job_name] || ''}</p>
              </div>
              <div className="text-right shrink-0">
                {job.last_run ? (
                  <>
                    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
                      job.last_run.status === 'success' ? 'bg-[#EAF3DE] text-[#3B6D11]' :
                      job.last_run.status === 'failed' ? 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400' : 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400'
                    }`}>
                      {job.last_run.status === 'success' ? <CheckCircle2 className="w-3 h-3" /> : job.last_run.status === 'failed' ? <XCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                      {job.last_run.status}
                    </span>
                    <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">{formatDate(job.last_run.started_at)}</p>
                  </>
                ) : <span className="text-xs text-gray-400 dark:text-slate-500">Hiç çalışmadı</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-6 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-slate-500 flex items-center justify-center shrink-0"><Smartphone className="w-6 h-6" /></div>
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">Mobil uygulama — geliştirme aşamasında</p>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{data.mobile_app.note}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-gray-400 dark:text-slate-500">
        <span className="flex items-center gap-1"><Mail className="w-3 h-3" />OTP + hatırlatma e-postaları → Bildirim Logları sayfası</span>
        <span className="flex items-center gap-1"><Send className="w-3 h-3" />Telegram/Slack paylaşımları → Sosyal Medya sayfası</span>
        <span className="flex items-center gap-1"><CreditCard className="w-3 h-3" />Abonelik/ödeme durumu → Ödemeler sayfası</span>
      </div>
    </div>
  );
}
