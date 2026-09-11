'use client';

import { useEffect, useState } from 'react';
import { Loader2, HelpCircle, BookOpen, User, Flame } from 'lucide-react';
import { adminApi } from '@/lib/api';
import type {
  ContentAccuracySummary, ContentAccuracyAgg, QuestionAccuracyItem, WordAccuracyItem, ExamType,
} from '@/types';

// İstatistik & Raporlama Faz 2 — içerik doğruluk raporları (11 Eylül 2026).
// Backend: admin_platform.py /content-accuracy/{summary,questions,words}
// (bkz. migration 062 + exam_question_stats view'i). "3'lü segmentasyon":
// sistem soruları (exam_questions), sistem kelimeleri (general_word_pool,
// tüm kullanıcılar bazında global doğruluk), kullanıcı kelimeleri (words,
// kişisel doğruluk). Sıradaki fazlar: periyodik özet + e-posta gönderimi,
// kurum/ülke bazlı kırılım (bkz. devir notları).

const EXAM_TYPES: { value: ExamType; label: string }[] = [
  { value: 'yds', label: 'YDS' },
  { value: 'yokdil', label: 'YÖKDİL' },
  { value: 'ielts', label: 'IELTS' },
  { value: 'toefl', label: 'TOEFL' },
];

const ORDER_OPTIONS: { value: 'weakest' | 'strongest' | 'most_attempted'; label: string }[] = [
  { value: 'weakest', label: 'En zayıf (düşük doğruluk)' },
  { value: 'strongest', label: 'En güçlü (yüksek doğruluk)' },
  { value: 'most_attempted', label: 'En çok denenen' },
];

function AccuracyPill({ percent }: { percent: number | null }) {
  if (percent === null) return <span className="text-xs text-gray-400 dark:text-slate-500">—</span>;
  const color = percent >= 70
    ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
    : percent >= 40
      ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300'
      : 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300';
  return <span className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full ${color}`}>%{percent}</span>;
}

function SummaryCard({ label, agg, icon }: { label: string; agg: ContentAccuracyAgg; icon: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-5">
      <div className="w-12 h-12 rounded-xl bg-[#EEEDFE] text-[#534AB7] flex items-center justify-center mb-4">{icon}</div>
      <p className="text-sm text-gray-500 dark:text-slate-400">{label}</p>
      <div className="flex items-baseline gap-2 mt-1">
        <p className="text-3xl font-bold text-gray-900 dark:text-slate-100">
          {agg.accuracy_percent !== null ? `%${agg.accuracy_percent}` : '—'}
        </p>
        <span className="text-xs text-gray-400 dark:text-slate-500">doğruluk</span>
      </div>
      <p className="text-xs text-gray-400 dark:text-slate-500 mt-2">
        {agg.items_with_attempts} içerik · {agg.total_attempts} deneme
      </p>
    </div>
  );
}

function QuestionsPanel() {
  const [items, setItems] = useState<QuestionAccuracyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [examType, setExamType] = useState<ExamType | ''>('');
  const [minAttempts, setMinAttempts] = useState(5);
  const [order, setOrder] = useState<'weakest' | 'strongest' | 'most_attempted'>('weakest');

  const load = () => {
    setLoading(true);
    adminApi.getContentAccuracyQuestions({
      exam_type: examType || undefined,
      min_attempts: minAttempts,
      order,
      limit: 50,
    })
      .then((res) => setItems(res.items))
      .finally(() => setLoading(false));
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect -- filtre değişince yeniden çekme (fetch-on-effect) deseni
  useEffect(load, [examType, minAttempts, order]);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800">
      <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-gray-400 dark:text-slate-500" />
          <h2 className="text-sm font-semibold text-gray-900 dark:text-slate-100">Soru Bazında Doğruluk</h2>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select value={examType} onChange={(e) => setExamType(e.target.value as ExamType | '')}
            className="border border-gray-200 dark:border-slate-700 dark:bg-slate-800 rounded-lg px-2.5 py-1.5 text-xs">
            <option value="">Tüm sınavlar</option>
            {EXAM_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <select value={order} onChange={(e) => setOrder(e.target.value as typeof order)}
            className="border border-gray-200 dark:border-slate-700 dark:bg-slate-800 rounded-lg px-2.5 py-1.5 text-xs">
            {ORDER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <input type="number" min={0} value={minAttempts}
            onChange={(e) => setMinAttempts(Math.max(0, Number(e.target.value) || 0))}
            title="Minimum deneme sayısı"
            className="w-24 border border-gray-200 dark:border-slate-700 dark:bg-slate-800 rounded-lg px-2.5 py-1.5 text-xs" />
        </div>
      </div>

      {loading ? (
        <div className="p-10 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
      ) : items.length === 0 ? (
        <p className="p-10 text-center text-sm text-gray-500 dark:text-slate-400">Kriterlere uyan soru bulunamadı (deneme sayısı eşiğini düşürmeyi deneyin).</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400 dark:text-slate-500 border-b border-gray-100 dark:border-slate-800">
                <th className="px-6 py-3 font-medium">Soru</th>
                <th className="px-3 py-3 font-medium">Sınav</th>
                <th className="px-3 py-3 font-medium">Konu</th>
                <th className="px-3 py-3 font-medium text-right">Deneme</th>
                <th className="px-3 py-3 font-medium text-right">Doğru/Yanlış</th>
                <th className="px-6 py-3 font-medium text-right">Doğruluk</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
              {items.map((q) => (
                <tr key={q.question_id}>
                  <td className="px-6 py-3 max-w-md">
                    <p className="text-gray-900 dark:text-slate-100 truncate" title={q.question_text || undefined}>
                      {q.question_text || <span className="text-gray-400 italic">(metin bulunamadı)</span>}
                    </p>
                  </td>
                  <td className="px-3 py-3 text-xs uppercase text-gray-500 dark:text-slate-400">{q.exam_type}</td>
                  <td className="px-3 py-3 text-xs text-gray-500 dark:text-slate-400">{q.topic_tag || '—'}</td>
                  <td className="px-3 py-3 text-right text-gray-600 dark:text-slate-400">{q.total_attempts}</td>
                  <td className="px-3 py-3 text-right text-xs text-gray-500 dark:text-slate-400">{q.correct_count}/{q.wrong_count}</td>
                  <td className="px-6 py-3 text-right"><AccuracyPill percent={q.accuracy_ratio !== null ? Math.round(q.accuracy_ratio * 100) : null} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function WordsPanel() {
  const [items, setItems] = useState<WordAccuracyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<'system' | 'user'>('system');
  const [minAttempts, setMinAttempts] = useState(5);
  const [order, setOrder] = useState<'weakest' | 'strongest' | 'most_attempted'>('weakest');

  const load = () => {
    setLoading(true);
    adminApi.getContentAccuracyWords({ source, min_attempts: minAttempts, order, limit: 50 })
      .then((res) => setItems(res.items))
      .finally(() => setLoading(false));
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect -- filtre değişince yeniden çekme (fetch-on-effect) deseni
  useEffect(load, [source, minAttempts, order]);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800">
      <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-gray-400 dark:text-slate-500" />
          <h2 className="text-sm font-semibold text-gray-900 dark:text-slate-100">Kelime Bazında Doğruluk</h2>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex rounded-lg border border-gray-200 dark:border-slate-700 overflow-hidden text-xs">
            <button onClick={() => setSource('system')}
              className={`px-3 py-1.5 font-medium ${source === 'system' ? 'bg-[#534AB7] text-white' : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-400'}`}>
              Sistem havuzu
            </button>
            <button onClick={() => setSource('user')}
              className={`px-3 py-1.5 font-medium ${source === 'user' ? 'bg-[#534AB7] text-white' : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-400'}`}>
              Kullanıcı kelimeleri
            </button>
          </div>
          <select value={order} onChange={(e) => setOrder(e.target.value as typeof order)}
            className="border border-gray-200 dark:border-slate-700 dark:bg-slate-800 rounded-lg px-2.5 py-1.5 text-xs">
            {ORDER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <input type="number" min={0} value={minAttempts}
            onChange={(e) => setMinAttempts(Math.max(0, Number(e.target.value) || 0))}
            title="Minimum deneme sayısı"
            className="w-24 border border-gray-200 dark:border-slate-700 dark:bg-slate-800 rounded-lg px-2.5 py-1.5 text-xs" />
        </div>
      </div>

      {loading ? (
        <div className="p-10 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
      ) : items.length === 0 ? (
        <p className="p-10 text-center text-sm text-gray-500 dark:text-slate-400">Kriterlere uyan kelime bulunamadı (deneme sayısı eşiğini düşürmeyi deneyin).</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400 dark:text-slate-500 border-b border-gray-100 dark:border-slate-800">
                <th className="px-6 py-3 font-medium">Kelime</th>
                <th className="px-3 py-3 font-medium">Dil çifti</th>
                <th className="px-3 py-3 font-medium text-right">Deneme</th>
                <th className="px-3 py-3 font-medium text-right">Doğru/Yanlış</th>
                <th className="px-6 py-3 font-medium text-right">Doğruluk</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
              {items.map((w) => (
                <tr key={w.general_word_id || w.word_id}>
                  <td className="px-6 py-3 text-gray-900 dark:text-slate-100 font-medium">{w.word}</td>
                  <td className="px-3 py-3 text-xs text-gray-500 dark:text-slate-400 uppercase">{w.source_lang} → {w.target_lang}</td>
                  <td className="px-3 py-3 text-right text-gray-600 dark:text-slate-400">{w.total_attempts}</td>
                  <td className="px-3 py-3 text-right text-xs text-gray-500 dark:text-slate-400">{w.correct_count}/{w.wrong_count}</td>
                  <td className="px-6 py-3 text-right"><AccuracyPill percent={w.accuracy_ratio !== null ? Math.round(w.accuracy_ratio * 100) : null} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function AdminReportsPage() {
  const [summary, setSummary] = useState<ContentAccuracySummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.getContentAccuracySummary().then(setSummary).finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-slate-100">Raporlar</h1>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
          İçerik doğruluk analitiği — sistem soruları, sistem kelime havuzu ve kullanıcı kelimeleri için doğru/yanlış tahmin oranları.
          Hangi soru ve kelimelerin en çok zorlandırdığını görüp içeriği buna göre iyileştirebilirsiniz.
        </p>
      </div>

      {loading ? (
        <div className="p-10 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
      ) : summary ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <SummaryCard label="Sistem Soruları" agg={summary.system_questions} icon={<HelpCircle className="w-6 h-6" />} />
          <SummaryCard label="Sistem Kelimeleri" agg={summary.system_words} icon={<Flame className="w-6 h-6" />} />
          <SummaryCard label="Kullanıcı Kelimeleri" agg={summary.user_words} icon={<User className="w-6 h-6" />} />
        </div>
      ) : null}

      <QuestionsPanel />
      <WordsPanel />
    </div>
  );
}
