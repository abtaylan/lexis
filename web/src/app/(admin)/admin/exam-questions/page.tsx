'use client';

import { useEffect, useState } from 'react';
import { Sparkles, Loader2, Check, X, Clock, User, Bot, FileText } from 'lucide-react';
import { adminApi } from '@/lib/api';
import type { PendingExamQuestion, ExamType, AIQuestionGenerateResult } from '@/types';
import { useAuth } from '@/store/auth';

// Sınav Hazırlık — İstatistik & İçerik Motoru Faz 2b: admin moderasyon
// kuyruğu (kullanıcı önerileri + AI ile üretilen sorular) + AI'a soru
// ürettirme paneli. Backend: app/api/routes/exams.py
// (GET /admin/questions/pending, POST /admin/questions/{id}/approve|reject,
// POST /admin/questions/generate-ai).

const EXAM_TYPES: { value: ExamType; label: string }[] = [
  { value: 'yds', label: 'YDS' },
  { value: 'yokdil', label: 'YÖKDİL' },
  { value: 'ielts', label: 'IELTS' },
  { value: 'toefl', label: 'TOEFL' },
];

function SourceBadge({ source }: { source: string }) {
  if (source === 'ai') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300">
        <Bot className="w-3 h-3" />AI
      </span>
    );
  }
  if (source === 'user') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-300">
        <User className="w-3 h-3" />Kullanıcı
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400">
      <FileText className="w-3 h-3" />Sistem
    </span>
  );
}

function GenerateAiPanel({ onGenerated, disabled }: { onGenerated: () => void; disabled: boolean }) {
  const [examType, setExamType] = useState<ExamType>('yds');
  const [count, setCount] = useState(5);
  const [topicTag, setTopicTag] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AIQuestionGenerateResult | null>(null);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await adminApi.generateAiExamQuestions({
        exam_type: examType,
        count,
        topic_tag: topicTag.trim() || undefined,
      });
      setResult(res);
      onGenerated();
    } catch {
      setError('Soru üretilemedi — ANTHROPIC_API_KEY yapılandırılmamış olabilir ya da model geçici bir hata döndürmüş olabilir.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-6 space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-xl bg-violet-50 dark:bg-violet-500/10 flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-violet-600 dark:text-violet-400" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-slate-100">AI ile Soru Üret</h2>
          <p className="text-xs text-gray-500 dark:text-slate-400">Üretilen sorular doğrudan havuza girmez — aşağıdaki bekleyen kuyruğuna düşer, onaylamadan kullanıcıya gösterilmez.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Sınav türü</label>
          <select value={examType} onChange={(e) => setExamType(e.target.value as ExamType)}
            className="w-full border border-gray-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl px-3 py-2 text-sm">
            {EXAM_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Adet (1-20)</label>
          <input type="number" min={1} max={20} value={count}
            onChange={(e) => setCount(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
            className="w-full border border-gray-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl px-3 py-2 text-sm" />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Konu (opsiyonel)</label>
          <input value={topicTag} onChange={(e) => setTopicTag(e.target.value)} placeholder="örn. phrasal verbs, tenses"
            className="w-full border border-gray-200 dark:border-slate-700 dark:bg-slate-800 rounded-xl px-3 py-2 text-sm" />
        </div>
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 rounded-xl px-3 py-2">{error}</p>}
      {result && (
        <p className="text-sm text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl px-3 py-2">
          {result.created}/{result.requested} soru üretildi ve bekleyen kuyruğuna eklendi.
        </p>
      )}

      <button onClick={handleGenerate} disabled={disabled || loading}
        className="inline-flex items-center gap-2 bg-[#534AB7] hover:bg-[#473fa0] disabled:opacity-50 text-white rounded-xl px-4 py-2.5 text-sm font-medium">
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
        {loading ? 'Üretiliyor…' : 'Soru Üret'}
      </button>
    </div>
  );
}

export default function ExamQuestionsAdminPage() {
  const { user } = useAuth();
  const isReadonly = user?.role === 'admin_readonly';

  const [items, setItems] = useState<PendingExamQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    adminApi.getPendingExamQuestions()
      .then(setItems)
      .finally(() => setLoading(false));
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect -- mount'ta veri çekme (fetch-on-effect) deseni, senkron setState kasıtlı
  useEffect(load, []);

  const handleApprove = async (id: string) => {
    setActingId(id);
    try { await adminApi.approveExamQuestion(id); setItems((prev) => prev.filter((q) => q.id !== id)); }
    finally { setActingId(null); }
  };

  const handleReject = async (id: string) => {
    if (!confirm('Bu soru reddedilsin mi?')) return;
    setActingId(id);
    try { await adminApi.rejectExamQuestion(id); setItems((prev) => prev.filter((q) => q.id !== id)); }
    finally { setActingId(null); }
  };

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-slate-100">Sınav Soruları</h1>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Kullanıcı önerileri ve AI ile üretilen sorular — onaylanmadan Sınav Hazırlık Alanı&apos;nda kullanıcıya gösterilmez.</p>
      </div>

      {!isReadonly && <GenerateAiPanel onGenerated={load} disabled={isReadonly} />}

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-slate-100">Bekleyen Kuyruk ({items.length})</h2>
          <Clock className="w-4 h-4 text-gray-400 dark:text-slate-500" />
        </div>

        {loading ? (
          <div className="p-10 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
        ) : items.length === 0 ? (
          <p className="p-10 text-center text-sm text-gray-500 dark:text-slate-400">Bekleyen soru yok.</p>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-slate-800">
            {items.map((q) => (
              <li key={q.id} className="p-6 space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500">{q.exam_type}</span>
                  <SourceBadge source={q.source_type} />
                  {q.submitted_by_email && <span className="text-xs text-gray-500 dark:text-slate-400">{q.submitted_by_email}</span>}
                  {q.topic_tag && <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400">{q.topic_tag}</span>}
                </div>

                <p className="text-sm text-gray-900 dark:text-slate-100 font-medium">{q.question_text}</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {q.options.map((opt) => (
                    <div key={opt.id} className={`text-sm rounded-lg px-3 py-2 border ${
                      opt.id === q.correct_option
                        ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-300'
                        : 'border-gray-100 dark:border-slate-800 text-gray-600 dark:text-slate-400'
                    }`}>
                      <span className="font-semibold uppercase mr-1">{opt.id})</span>{opt.text}
                    </div>
                  ))}
                </div>

                {q.explanation && <p className="text-xs text-gray-500 dark:text-slate-400 italic">{q.explanation}</p>}

                {!isReadonly && (
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => handleApprove(q.id)} disabled={actingId === q.id}
                      className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl px-3 py-1.5 text-xs font-medium">
                      <Check className="w-3.5 h-3.5" />Onayla
                    </button>
                    <button onClick={() => handleReject(q.id)} disabled={actingId === q.id}
                      className="inline-flex items-center gap-1.5 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 hover:dark:bg-slate-800 disabled:opacity-50 text-gray-600 dark:text-slate-400 rounded-xl px-3 py-1.5 text-xs font-medium">
                      <X className="w-3.5 h-3.5" />Reddet
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
