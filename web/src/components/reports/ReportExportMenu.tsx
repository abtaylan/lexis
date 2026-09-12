'use client';

// src/components/reports/ReportExportMenu.tsx
//
// İstatistik & Raporlama V2 öncelik #3, Faz 3 madde F — "Dağıtım: Resend
// e-posta + PDF/CSV/Excel export". Hem "Raporum" (user report) hem "Kurum
// Raporu" (org report) sayfalarının ortak kullandığı, format seçimi +
// indir + e-posta ile gönder kontrolü.
//
// Üretilen dosyanın İÇERİĞİ, kullanıcının profiles.native_lang'ına göre
// render ediliyor (bkz. backend/app/services/report_export_service.py modül
// docstring'i) — ekrandaki rapor sayfasıyla aynı 10 dil. Bu bileşenin kendi
// buton/etiket metinleri ise ayrıca kullanıcının arayüz diline göre çevriliyor
// (props üzerinden verilen `labels`) — iki ayrı dil kararı aynı sonuca çıkıyor
// (native_lang), ama farklı kod yollarından geliyor.
import { useState } from 'react';
import { Download, Mail, Loader2, Check, AlertCircle } from 'lucide-react';
import { clsx } from 'clsx';
import type { ReportExportFormat } from '@/lib/api';

export interface ReportExportMenuLabels {
  formatCsv: string;
  formatXlsx: string;
  formatPdf: string;
  downloadBtn: string;
  emailBtn: string;
  downloading: string;
  sending: string;
  sentToTpl: string; // "{email} adresine gönderildi" gibi — {email} yer tutucusu
  errorMsg: string;
}

interface Props {
  labels: ReportExportMenuLabels;
  onExport: (format: ReportExportFormat) => Promise<void>;
  onEmail: (format: ReportExportFormat) => Promise<{ sent: boolean; to: string }>;
  className?: string;
}

const FORMATS: ReportExportFormat[] = ['pdf', 'xlsx', 'csv'];

export function ReportExportMenu({ labels, onExport, onEmail, className }: Props) {
  const [format, setFormat] = useState<ReportExportFormat>('pdf');
  const [busy, setBusy] = useState<'download' | 'email' | null>(null);
  const [status, setStatus] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const formatLabel: Record<ReportExportFormat, string> = {
    pdf: labels.formatPdf,
    xlsx: labels.formatXlsx,
    csv: labels.formatCsv,
  };

  const handleExport = async () => {
    setBusy('download');
    setStatus(null);
    try {
      await onExport(format);
    } catch {
      setStatus({ kind: 'err', text: labels.errorMsg });
    } finally {
      setBusy(null);
    }
  };

  const handleEmail = async () => {
    setBusy('email');
    setStatus(null);
    try {
      const res = await onEmail(format);
      setStatus({ kind: 'ok', text: labels.sentToTpl.replace('{email}', res.to) });
    } catch {
      setStatus({ kind: 'err', text: labels.errorMsg });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className={clsx('flex flex-col gap-2', className)}>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg border border-gray-200 dark:border-slate-700 overflow-hidden">
          {FORMATS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFormat(f)}
              className={clsx(
                'px-2.5 py-1.5 text-xs font-medium transition-colors',
                format === f
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400'
                  : 'text-gray-500 hover:bg-gray-50 dark:text-slate-400 dark:hover:bg-slate-800'
              )}
            >
              {formatLabel[f]}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={handleExport}
          disabled={busy !== null}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors"
        >
          {busy === 'download' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
          {busy === 'download' ? labels.downloading : labels.downloadBtn}
        </button>

        <button
          type="button"
          onClick={handleEmail}
          disabled={busy !== null}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors"
        >
          {busy === 'email' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
          {busy === 'email' ? labels.sending : labels.emailBtn}
        </button>
      </div>

      {status && (
        <div
          className={clsx(
            'inline-flex items-center gap-1.5 text-xs font-medium w-fit',
            status.kind === 'ok' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
          )}
        >
          {status.kind === 'ok' ? <Check className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
          {status.text}
        </div>
      )}
    </div>
  );
}
