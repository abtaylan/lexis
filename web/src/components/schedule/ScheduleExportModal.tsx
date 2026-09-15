'use client';

import { useMemo, useRef, useState } from 'react';
import { X, Download, Loader2, FileText } from 'lucide-react';
import type { ScheduleItem } from '@/types';
import { useLocale } from '@/lib/i18n';
import {
  EXPORT_TEMPLATES, EXPORT_TEMPLATE_SIZE, GradientPosterTemplate, MinimalPosterTemplate, ChecklistTemplate,
  exportScheduleToPdf, type ExportTemplateId, type ScheduleExportData,
} from '@/lib/scheduleExport';

// KULLANICI İSTEĞİ (15 Eylül 2026): çalışma programının PDF çıktısı — bkz.
// lib/scheduleExport.tsx başındaki not. Bu modal, şablon seçimini ve
// önizlemeyi yönetip gerçek boyutlu (offscreen) render'ı PDF'e çeviriyor.

const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0]; // Pazartesi → Pazar (data model 0=Pazar)
const PREVIEW_SCALE = 0.4;
const PREVIEW_W = Math.round(EXPORT_TEMPLATE_SIZE.width * PREVIEW_SCALE);
const PREVIEW_H = Math.round(EXPORT_TEMPLATE_SIZE.height * PREVIEW_SCALE);

export function ScheduleExportModal({ items, weekdays, ownerName, onClose }: {
  items: ScheduleItem[];
  /** t('weekdayLabels').split(',') — index 0 = Pazar */
  weekdays: string[];
  ownerName: string;
  onClose: () => void;
}) {
  const { t } = useLocale();
  const [templateId, setTemplateId] = useState<ExportTemplateId>('gradient');
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const exportRef = useRef<HTMLDivElement>(null);

  const data: ScheduleExportData = useMemo(() => {
    const active = items.filter((it) => it.is_active !== false);
    const groups = WEEKDAY_ORDER.map((dayIndex) => ({
      day: weekdays[dayIndex] ?? String(dayIndex),
      dayIndex,
      items: active
        .filter((it) => it.day_of_week === dayIndex)
        .sort((a, b) => a.time_slot.localeCompare(b.time_slot)),
    }));
    return {
      groups,
      totalItems: active.length,
      activeDays: groups.filter((g) => g.items.length > 0).length,
      dateLabel: new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }),
      ownerName,
    };
  }, [items, weekdays, ownerName]);

  const isEmpty = data.totalItems === 0;

  const renderTemplate = () => {
    if (templateId === 'gradient') return <GradientPosterTemplate data={data} />;
    if (templateId === 'minimal') return <MinimalPosterTemplate data={data} />;
    return <ChecklistTemplate data={data} />;
  };

  const handleExport = async () => {
    if (!exportRef.current || isEmpty) return;
    setExporting(true);
    setError('');
    try {
      await exportScheduleToPdf(exportRef.current, {
        filename: `lexis-calisma-programi-${templateId}.pdf`,
        fixedSize: templateId !== 'checklist',
      });
    } catch (err) {
      console.error(err);
      setError(t('exportPdfFailed'));
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#FDEEEA] flex items-center justify-center"><FileText className="w-4 h-4 text-[#9A3412]" /></div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">{t('exportModalTitle')}</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 dark:text-slate-500 hover:bg-gray-100 hover:dark:bg-slate-800 transition-colors"><X className="w-4 h-4" /></button>
        </div>

        <div className="px-6 py-4 space-y-4">
          <p className="text-sm text-gray-500 dark:text-slate-400">{t('exportModalDesc')}</p>

          {isEmpty ? (
            <p className="text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 rounded-xl px-3 py-2">
              {t('exportEmptyMsg')}
            </p>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {EXPORT_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => setTemplateId(tpl.id)}
                    className={`text-left border rounded-2xl p-3 transition-colors ${
                      templateId === tpl.id
                        ? 'border-[#378ADD] ring-2 ring-[#378ADD]/20'
                        : 'border-gray-100 dark:border-slate-800 hover:border-gray-200 hover:dark:border-slate-700'
                    }`}
                  >
                    <div className="w-full h-2 rounded-full mb-2" style={{ backgroundColor: tpl.accent }} />
                    <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">{tpl.name}</p>
                    <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{tpl.desc}</p>
                  </button>
                ))}
              </div>

              <div className="flex justify-center bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4">
                <div
                  style={{ width: PREVIEW_W, height: PREVIEW_H, overflow: 'hidden', position: 'relative', borderRadius: 8, boxShadow: '0 2px 12px rgba(0,0,0,0.12)' }}
                >
                  <div style={{ transform: `scale(${PREVIEW_SCALE})`, transformOrigin: 'top left', position: 'absolute', top: 0, left: 0 }}>
                    {renderTemplate()}
                  </div>
                </div>
              </div>

              {error && <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 rounded-xl px-3 py-2">{error}</p>}
            </>
          )}
        </div>

        <div className="flex gap-3 px-6 pb-6">
          <button onClick={onClose} className="flex-1 border border-gray-200 dark:border-slate-700 rounded-xl py-2.5 text-sm font-medium text-gray-600 dark:text-slate-400 hover:bg-gray-50 hover:dark:bg-slate-800 transition-colors">
            {t('cancelBtn')}
          </button>
          <button
            onClick={handleExport}
            disabled={exporting || isEmpty}
            className="flex-1 flex items-center justify-center gap-2 bg-[#378ADD] hover:bg-[#2d73c4] disabled:opacity-50 text-white rounded-xl py-2.5 text-sm font-medium transition-colors"
          >
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {exporting ? t('exportGeneratingBtn') : t('exportDownloadBtn')}
          </button>
        </div>

        {/* Ekran dışı, tam boyutlu render — html2canvas-pro bunu yakalar. display:none
            KULLANILMIYOR çünkü öyle bir eleman html2canvas tarafından doğru
            yakalanamıyor; bunun yerine viewport dışına konumlandırılıyor. */}
        {!isEmpty && (
          <div style={{ position: 'fixed', top: 0, left: -9999, pointerEvents: 'none' }} aria-hidden="true">
            <div ref={exportRef}>{renderTemplate()}</div>
          </div>
        )}
      </div>
    </div>
  );
}
