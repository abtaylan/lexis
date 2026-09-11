'use client';

import { useEffect, useState } from 'react';
import { Loader2, HelpCircle, BookOpen, User, Flame, ShieldAlert, RefreshCw } from 'lucide-react';
import { adminApi } from '@/lib/api';
import type {
  ContentAccuracySummary, ContentAccuracyAgg, QuestionAccuracyItem, WordAccuracyItem, ExamType,
  ContentFlagItem, ContentFlagType, ContentFlagStatus,
} from '@/types';

// İstatistik & Raporlama Faz 2 — içerik doğruluk raporları (11 Eylül 2026).
// Backend: admin_platform.py /content-accuracy/{summary,questions,words}
// (bkz. migration 062 + exam_question_stats view'i). "3'lü segmentasyon":
// sistem soruları (exam_questions), sistem kelimeleri (general_word_pool,
// tüm kullanıcılar bazında global doğruluk), kullanıcı kelimeleri (words,
// kişisel doğruluk).
//
// Faz 3 madde C (aynı gün, ikinci ekleme) — "Veri doğruluğu/güvenilirlik
// paneli": Faz 1/2'nin salt "doğruluğa göre sırala" görünümüne ek olarak,
// otomatik ANOMALİ TESPİTİ + admin inceleme iş akışı (FlagsPanel, altta).
// Backend: admin_platform.py /content-accuracy/flags/* (bkz. migration
// 065_content_flags.sql, content_flag_service.py). Sıradaki fazlar:
// periyodik özet + e-posta gönderimi, kurum/ülke bazlı kırılım.

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

// ── Faz 3 madde C — Veri Güvenilirliği / İşaretlenen İçerik ──────────────

const CONTENT_TYPE_LABEL: Record<ContentFlagType, string> = {
  exam_question: 'Sınav sorusu',
  system_word: 'Sistem kelimesi',
  user_word: 'Kullanıcı kelimesi',
};

const STATUS_LABEL: Record<ContentFlagStatus, string> = {
  open: 'Açık',
  fixed: 'Düzeltildi',
  dismissed: 'Göz ardı edildi',
};

function FlagContentLabel({ item }: { item: ContentFlagItem }) {
  if (!item.content) return <span className="text-gray-400 italic">(içerik bulunamadı — silinmiş olabilir)</span>;
  if (item.content_type === 'exam_question') {
    return (
      <div>
        <p className="text-gray-900 dark:text-slate-100 truncate max-w-md" title={item.content.question_text || undefined}>
          {item.content.question_text || '(metin yok)'}
        </p>
        <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
          {item.content.exam_type?.toUpperCase()} {item.content.topic_tag ? `· ${item.content.topic_tag}` : ''}
        </p>
      </div>
    );
  }
  return (
    <div>
      <p className="text-gray-900 dark:text-slate-100 font-medium">{item.content.word}</p>
      <p className="text-xs text-gray-400 dark:text-slate-500 uppercase mt-0.5">
        {item.content.source_lang} → {item.content.target_lang}
      </p>
    </div>
  );
}

function FlagReasonBadge({ item }: { item: ContentFlagItem }) {
  const snap = item.metric_snapshot;
  const accuracyPct = snap.accuracy_ratio != null ? Math.round(snap.accuracy_ratio * 100) : null;
  if (item.reason === 'dominant_wrong_option') {
    return (
      <div>
        <span className="inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300">
          Baskın yanlış şık
        </span>
        <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
          Doğru: <b>{snap.correct_option}</b> · Çoğunluk: <b>{snap.dominant_wrong_option}</b> seçmiş ({accuracyPct !== null ? `%${accuracyPct}` : '—'} doğruluk, {snap.total_attempts} deneme)
        </p>
      </div>
    );
  }
  return (
    <div>
      <span className="inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300">
        Çok düşük doğruluk
      </span>
      <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
        {accuracyPct !== null ? `%${accuracyPct}` : '—'} doğruluk, {snap.total_attempts} deneme
      </p>
    </div>
  );
}

function FlagsPanel() {
  const [items, setItems] = useState<ContentFlagItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [status, setStatus] = useState<ContentFlagStatus | ''>('open');
  const [contentType, setContentType] = useState<ContentFlagType | ''>('');
  const [scanMessage, setScanMessage] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    adminApi.getContentFlags({
      status: status || undefined,
      content_type: contentType || undefined,
      limit: 100,
    })
      .then((res) => setItems(res.items))
      .finally(() => setLoading(false));
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect -- filtre değişince yeniden çekme (fetch-on-effect) deseni
  useEffect(load, [status, contentType]);

  const handleScan = async () => {
    setScanning(true);
    setScanMessage(null);
    try {
      const result = await adminApi.scanContentFlags();
      setScanMessage(`Tarama tamamlandı: ${result.total.created} yeni, ${result.total.updated} güncellendi, ${result.total.skipped} atlandı (zaten düzeltildi/göz ardı edildi).`);
      load();
    } catch {
      setScanMessage('Tarama sırasında bir hata oluştu.');
    } finally {
      setScanning(false);
    }
  };

  const handleStatusChange = async (item: ContentFlagItem, newStatus: ContentFlagStatus) => {
    setUpdatingId(item.id);
    try {
      await adminApi.updateContentFlag(item.id, { status: newStatus });
      setItems((prev) => prev.filter((i) => i.id !== item.id || status === ''));
      if (status !== '') load();
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800">
      <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-gray-400 dark:text-slate-500" />
          <h2 className="text-sm font-semibold text-gray-900 dark:text-slate-100">Veri Güvenilirliği — İşaretlenen İçerik</h2>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select value={contentType} onChange={(e) => setContentType(e.target.value as ContentFlagType | '')}
            className="border border-gray-200 dark:border-slate-700 dark:bg-slate-800 rounded-lg px-2.5 py-1.5 text-xs">
            <option value="">Tüm türler</option>
            <option value="exam_question">Sınav soruları</option>
            <option value="system_word">Sistem kelimeleri</option>
            <option value="user_word">Kullanıcı kelimeleri</option>
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value as ContentFlagStatus | '')}
            className="border border-gray-200 dark:border-slate-700 dark:bg-slate-800 rounded-lg px-2.5 py-1.5 text-xs">
            <option value="open">Açık</option>
            <option value="fixed">Düzeltildi</option>
            <option value="dismissed">Göz ardı edildi</option>
            <option value="">Tümü</option>
          </select>
          <button onClick={handleScan} disabled={scanning}
            className="inline-flex items-center gap-1.5 bg-[#534AB7] hover:bg-[#463da0] disabled:opacity-60 text-white text-xs font-semibold px-3 py-1.5 rounded-lg">
            {scanning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Tara
          </button>
        </div>
      </div>

      {scanMessage && (
        <p className="px-6 pt-4 text-xs text-gray-500 dark:text-slate-400">{scanMessage}</p>
      )}

      <p className="px-6 pt-4 text-xs text-gray-400 dark:text-slate-500">
        Otomatik anomali tespiti: yeterli deneme sayısına rağmen doğruluğu çok düşük içerik, ya da bir soruda doğru şıktan daha çok seçilen bir yanlış şık (&quot;baskın yanlış şık&quot; — cevap anahtarı hatalı olabilir) burada listelenir. Tarama manuel tetiklenir.
      </p>

      {loading ? (
        <div className="p-10 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
      ) : items.length === 0 ? (
        <p className="p-10 text-center text-sm text-gray-500 dark:text-slate-400">Bu filtrelerle eşleşen işaretlenmiş içerik yok. &quot;Tara&quot; butonuyla yeni bir tarama başlatabilirsiniz.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400 dark:text-slate-500 border-b border-gray-100 dark:border-slate-800">
                <th className="px-6 py-3 font-medium">İçerik</th>
                <th className="px-3 py-3 font-medium">Tür</th>
                <th className="px-3 py-3 font-medium">Sebep</th>
                <th className="px-3 py-3 font-medium">Durum</th>
                <th className="px-6 py-3 font-medium text-right">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="px-6 py-3 max-w-md"><FlagContentLabel item={item} /></td>
                  <td className="px-3 py-3 text-xs text-gray-500 dark:text-slate-400">{CONTENT_TYPE_LABEL[item.content_type]}</td>
                  <td className="px-3 py-3"><FlagReasonBadge item={item} /></td>
                  <td className="px-3 py-3 text-xs text-gray-500 dark:text-slate-400">{STATUS_LABEL[item.status]}</td>
                  <td className="px-6 py-3 text-right">
                    {item.status !== 'fixed' && (
                      <button disabled={updatingId === item.id} onClick={() => handleStatusChange(item, 'fixed')}
                        className="text-xs font-medium text-emerald-700 dark:text-emerald-300 hover:underline mr-3 disabled:opacity-50">
                        Düzeltildi
                      </button>
                    )}
                    {item.status !== 'dismissed' && (
                      <button disabled={updatingId === item.id} onClick={() => handleStatusChange(item, 'dismissed')}
                        className="text-xs font-medium text-gray-500 dark:text-slate-400 hover:underline disabled:opacity-50">
                        Göz ardı et
                      </button>
                    )}
                  </td>
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
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <SummaryCard label="Sistem Soruları" agg={summary.system_questions} icon={<HelpCircle className="w-6 h-6" />} />
            <SummaryCard label="Sistem Kelimeleri" agg={summary.system_words} icon={<Flame className="w-6 h-6" />} />
            <SummaryCard label="Kullanıcı Kelimeleri" agg={summary.user_words} icon={<User className="w-6 h-6" />} />
          </div>
          {summary.topic_practice_attempts_total === 0 && (
            <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 rounded-lg px-4 py-2">
              Veri kapsamı notu: &quot;Bu Konuyu Pratik Et&quot; akışından (zayıf konu kartı) henüz hiç kayıt (topic_practice_attempts) gelmemiş — konu bazlı doğruluk/zayıf konu bölümleri (Raporum, Kurum Raporu) bu yüzden şu an boş görünüyor. Kod bunu güvenle ele alıyor, acil bir müdahale gerekmiyor.
            </p>
          )}
        </>
      ) : null}

      <QuestionsPanel />
      <WordsPanel />
      <FlagsPanel />
    </div>
  );
}
