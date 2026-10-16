'use client';

import { useEffect, useState } from 'react';
import { AxiosError } from 'axios';
import { Flag, Loader2, Check, X, User, Clock } from 'lucide-react';
import { adminApi } from '@/lib/api';
import type { QuestionReportItem, ExamQuestionOption } from '@/types';
import { useAuth } from '@/store/auth';

// "Hata bildirimi" butonu -- 16 Ekim 2026. Kullanıcı talebi: "Hata bildirimi
// butonu işini de yap. bu işin mimarisini de çıkar, bildirim yapılan soruları
// inceleyip, doğru halini yeniden yayınla." exam-questions/page.tsx'teki
// bekleyen-kuyruk desenini izler, ama burada admin soruyu YERİNDE düzenleyip
// "Düzelt ve Yayınla" ile exam_questions satırını günceller (approve/reject
// gibi sadece status değiştirmez -- içeriği de değiştirir). Backend:
// GET /exams/admin/question-reports, POST /exams/admin/question-reports/{id}/resolve.

function errorDetail(err: unknown): string | undefined {
  if (err instanceof AxiosError) {
    return (err.response?.data as { detail?: string } | undefined)?.detail;
  }
  return undefined;
}

const REASON_LABELS: Record<string, string> = {
  wrong_answer: 'Doğru cevap yanlış işaretli',
  typo_unclear: 'Yazım hatası / anlaşılmıyor',
  other: 'Diğer',
};

function ReasonBadge({ reason }: { reason: string }) {
  const label = REASON_LABELS[reason] ?? reason;
  const isWrongAnswer = reason === 'wrong_answer';
  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${
        isWrongAnswer
          ? 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300'
          : 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300'
      }`}
    >
      <Flag className="w-3 h-3" />
      {label}
    </span>
  );
}

interface EditState {
  question_text: string;
  options: ExamQuestionOption[];
  correct_option: string;
  explanation: string;
  topic_tag: string;
  admin_note: string;
}

function toEditState(r: QuestionReportItem): EditState {
  return {
    question_text: r.question_text,
    options: r.options.map((o) => ({ ...o })),
    correct_option: r.correct_option,
    explanation: r.explanation ?? '',
    topic_tag: r.topic_tag ?? '',
    admin_note: '',
  };
}

function ReportCard({
  report,
  isReadonly,
  onResolved,
}: {
  report: QuestionReportItem;
  isReadonly: boolean;
  onResolved: (id: string) => void;
}) {
  const [edit, setEdit] = useState<EditState>(() => toEditState(report));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handleOptionChange = (id: string, text: string) => {
    setEdit((prev) => ({ ...prev, options: prev.options.map((o) => (o.id === id ? { ...o, text } : o)) }));
  };

  const handleFix = async () => {
    setError('');
    const allFilled = edit.question_text.trim().length > 0 && edit.options.every((o) => o.text.trim().length > 0);
    if (!allFilled) {
      setError('Soru metni ve tüm şıklar doldurulmalı.');
      return;
    }
    setBusy(true);
    try {
      await adminApi.resolveQuestionReport(report.id, {
        action: 'fix',
        question_text: edit.question_text.trim(),
        options: edit.options.map((o) => ({ id: o.id, text: o.text.trim() })),
        correct_option: edit.correct_option,
        explanation: edit.explanation.trim() || undefined,
        topic_tag: edit.topic_tag.trim() || undefined,
        admin_note: edit.admin_note.trim() || undefined,
      });
      onResolved(report.id);
    } catch (err) {
      const detail = errorDetail(err);
      setError(detail ?? 'Düzeltme kaydedilemedi.');
    } finally {
      setBusy(false);
    }
  };

  const handleReject = async () => {
    if (!confirm('Bu bildirim reddedilsin mi? Soru değişmeden kalacak.')) return;
    setBusy(true);
    setError('');
    try {
      await adminApi.resolveQuestionReport(report.id, {
        action: 'reject',
        admin_note: edit.admin_note.trim() || undefined,
      });
      onResolved(report.id);
    } catch (err) {
      const detail = errorDetail(err);
      setError(detail ?? 'İşlem başarısız.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className="p-6 space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500">{report.exam_type}</span>
        <ReasonBadge reason={report.reason} />
        {report.report_count > 1 && (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300">
            {report.report_count} kullanıcı bildirdi
          </span>
        )}
        {report.reporter_email && (
          <span className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-slate-400">
            <User className="w-3 h-3" />{report.reporter_email}
          </span>
        )}
        {report.topic_tag && (
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400">{report.topic_tag}</span>
        )}
      </div>

      {report.details && (
        <p className="text-xs text-gray-500 dark:text-slate-400 italic">
          <span className="font-semibold">Kullanıcı notu:</span> {report.details}
        </p>
      )}

      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Soru Metni</label>
        <textarea
          value={edit.question_text}
          disabled={isReadonly}
          onChange={(e) => setEdit((prev) => ({ ...prev, question_text: e.target.value }))}
          rows={3}
          className="w-full border border-gray-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl px-3 py-2 text-sm"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {edit.options.map((opt) => (
          <div key={opt.id} className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 shrink-0" title="Doğru şık">
              <input
                type="radio"
                name={`correct-${report.id}`}
                checked={edit.correct_option === opt.id}
                disabled={isReadonly}
                onChange={() => setEdit((prev) => ({ ...prev, correct_option: opt.id }))}
              />
              <span className="text-xs font-semibold uppercase text-gray-500 dark:text-slate-400">{opt.id}</span>
            </label>
            <input
              value={opt.text}
              disabled={isReadonly}
              onChange={(e) => handleOptionChange(opt.id, e.target.value)}
              className={`flex-1 text-sm rounded-lg px-3 py-2 border ${
                opt.id === edit.correct_option
                  ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-500/10'
                  : 'border-gray-100 dark:border-slate-800'
              }`}
            />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Açıklama (opsiyonel)</label>
          <input
            value={edit.explanation}
            disabled={isReadonly}
            onChange={(e) => setEdit((prev) => ({ ...prev, explanation: e.target.value }))}
            className="w-full border border-gray-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Konu Etiketi (opsiyonel)</label>
          <input
            value={edit.topic_tag}
            disabled={isReadonly}
            onChange={(e) => setEdit((prev) => ({ ...prev, topic_tag: e.target.value }))}
            className="w-full border border-gray-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Admin notu (opsiyonel)</label>
        <input
          value={edit.admin_note}
          disabled={isReadonly}
          onChange={(e) => setEdit((prev) => ({ ...prev, admin_note: e.target.value }))}
          placeholder="örn. düzeltildi, doğru şık güncellendi"
          className="w-full border border-gray-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl px-3 py-2 text-sm"
        />
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 rounded-xl px-3 py-2">{error}</p>}

      {!isReadonly && (
        <div className="flex gap-2 pt-1">
          <button onClick={handleFix} disabled={busy}
            className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl px-3 py-1.5 text-xs font-medium">
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            Düzelt ve Yayınla
          </button>
          <button onClick={handleReject} disabled={busy}
            className="inline-flex items-center gap-1.5 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 hover:dark:bg-slate-800 disabled:opacity-50 text-gray-600 dark:text-slate-400 rounded-xl px-3 py-1.5 text-xs font-medium">
            <X className="w-3.5 h-3.5" />Reddet
          </button>
        </div>
      )}
    </li>
  );
}

export default function QuestionReportsAdminPage() {
  const { user } = useAuth();
  const isReadonly = user?.role === 'admin_readonly';

  const [items, setItems] = useState<QuestionReportItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    adminApi.getQuestionReports('pending')
      .then(setItems)
      .finally(() => setLoading(false));
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect -- mount'ta veri çekme (fetch-on-effect) deseni, senkron setState kasıtlı
  useEffect(load, []);

  const handleResolved = (id: string) => {
    setItems((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-slate-100">Hata Bildirimleri</h1>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
          Kullanıcıların &quot;Soruyu Bildir&quot; ile işaretlediği sorular — soruyu burada düzenleyip <strong>Düzelt ve Yayınla</strong> ile canlıya aynı anda alabilirsin, ya da bildirimi reddedebilirsin.
        </p>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-slate-100">Bekleyen Bildirimler ({items.length})</h2>
          <Clock className="w-4 h-4 text-gray-400 dark:text-slate-500" />
        </div>

        {loading ? (
          <div className="p-10 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
        ) : items.length === 0 ? (
          <p className="p-10 text-center text-sm text-gray-500 dark:text-slate-400">Bekleyen bildirim yok.</p>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-slate-800">
            {items.map((r) => (
              <ReportCard key={r.id} report={r} isReadonly={isReadonly} onResolved={handleResolved} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
