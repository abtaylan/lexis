'use client';

import { useEffect, useState } from 'react';
import { Loader2, HelpCircle, BookOpen, User, Flame, ShieldAlert, RefreshCw, TrendingUp, TrendingDown, Crown, Users, CalendarDays } from 'lucide-react';
import { adminApi } from '@/lib/api';
import type {
  ContentAccuracySummary, ContentAccuracyAgg, QuestionAccuracyItem, WordAccuracyItem, ExamType,
  ContentFlagItem, ContentFlagType, ContentFlagStatus, PlatformDailySnapshot,
  SubscriptionSegmentMetrics, SubscriptionSegmentsResponse,
  PlatformSnapshotBenchmark, PlatformSnapshotBenchmarkMetrics,
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
// 065_content_flags.sql, content_flag_service.py).
//
// Faz 3 madde E (aynı gün, üçüncü ekleme) — "Zaman bazlı periyodik
// snapshot+cron": platform_daily_snapshots (SnapshotsPanel, altta) +
// content_flags taraması artık GÜNLÜK bir Claude scheduled task ile de
// otomatik çalışıyor (bu sayfadaki "Tara" butonu hâlâ manuel tetikleme
// için duruyor). Backend: admin_platform.py /platform-stats/snapshots/*
// (bkz. migration 066_platform_daily_snapshots.sql,
// platform_snapshot_service.py).
//
// Faz 3 madde H (12 Eylül 2026) — "Abonelik-segment korelasyonu"
// (SegmentsPanel, altta): premium vs free kullanıcıların katılım/
// performans karşılaştırması. Backend: admin_platform.py
// /subscription-segments (bkz. subscription_segment_service.py — o
// dosyanın docstring'i, bu maddeyi tasarlarken keşfedilen ÖNEMLİ bir
// bulguyu da içeriyor: study_sessions VE topic_practice_attempts
// tabloları üretimde TAMAMEN BOŞ, bu yüzden metrikler daily_progress/
// words/xp_events'ten hesaplanıyor). 12 Eylül 2026 itibarıyla canlı
// veride premium segment 0 kullanıcı — panel bunu "yeterli veri yok"
// olarak gösteriyor, kod değişikliği gerekmeden ilk gerçek premium
// kullanıcıyla birlikte dolmaya başlayacak. Bu sayfa admin-only olduğu
// için (10 dilli web raporlarının aksine) SADECE Türkçe.
//
// Faz 3 madde I (12 Eylül 2026, aynı gün, ikinci ekleme) — "Admin
// filtreleme/benchmark/takvim" (TrendPanel, altta): seçilen gün aralığını
// (filtreleme) bir önceki eşit uzunluktaki periyotla karşılaştırır
// (benchmark) + günlük aktiflik ısı haritası (takvim). Backend:
// admin_platform.py /platform-stats/benchmark (bkz. platform_snapshot_
// service.py::get_snapshot_benchmark) — takvim/filtreleme tarafı SAF
// FRONTEND, zaten var olan /platform-stats/snapshots verisiyle besleniyor.
// platform_daily_snapshots üretimde henüz sadece birkaç gün veri
// içeriyor (cron 11 Eylül'de başladı) — bu yüzden panel çoğu zaman
// "yeterli veri yok" gösterecek, gün geçtikçe otomatik dolacak.
//
// Faz 3'ün TÜM maddeleri (A-I) bu güncellemeyle BİTTİ.

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
        Otomatik anomali tespiti: yeterli deneme sayısına rağmen doğruluğu çok düşük içerik, ya da bir soruda doğru şıktan daha çok seçilen bir yanlış şık (&quot;baskın yanlış şık&quot; — cevap anahtarı hatalı olabilir) burada listelenir. Tarama her gün otomatik çalışır; &quot;Tara&quot; butonu hemen/manuel yeniden taramak içindir.
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

// ── Faz 3 madde E — Zaman bazlı periyodik snapshot (platform trendi) ────

function SnapshotsPanel() {
  const [items, setItems] = useState<PlatformDailySnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [capturing, setCapturing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    adminApi.getPlatformSnapshots(30)
      .then((res) => setItems(res.items))
      .finally(() => setLoading(false));
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect -- mount olunca veri cekme (fetch-on-effect) deseni
  useEffect(load, []);

  const handleCapture = async () => {
    setCapturing(true);
    setMessage(null);
    try {
      await adminApi.capturePlatformSnapshot();
      setMessage('Yakalama tamamlandı.');
      load();
    } catch {
      setMessage('Yakalama sırasında bir hata oluştu.');
    } finally {
      setCapturing(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800">
      <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-gray-400 dark:text-slate-500" />
          <h2 className="text-sm font-semibold text-gray-900 dark:text-slate-100">Platform Geçmişi (Günlük Snapshot)</h2>
        </div>
        <button onClick={handleCapture} disabled={capturing}
          className="inline-flex items-center gap-1.5 bg-[#534AB7] hover:bg-[#463da0] disabled:opacity-60 text-white text-xs font-semibold px-3 py-1.5 rounded-lg">
          {capturing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          Dünü yeniden yakala
        </button>
      </div>

      {message && (
        <p className="px-6 pt-4 text-xs text-gray-500 dark:text-slate-400">{message}</p>
      )}

      <p className="px-6 pt-4 text-xs text-gray-400 dark:text-slate-500">
        Her gün otomatik (bot hariç) yakalanan platform genelinde özet metrikler — trend görünümü için. Bu tablo Faz 3 madde H/I&apos;nin (abonelik-segment korelasyonu, admin filtreleme/benchmark/takvim) üzerine inşa edeceği ham veri.
      </p>

      {loading ? (
        <div className="p-10 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
      ) : items.length === 0 ? (
        <p className="p-10 text-center text-sm text-gray-500 dark:text-slate-400">Henüz hiç snapshot yok. &quot;Dünü yeniden yakala&quot; ile ilk kaydı oluşturabilirsiniz.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400 dark:text-slate-500 border-b border-gray-100 dark:border-slate-800">
                <th className="px-6 py-3 font-medium">Tarih</th>
                <th className="px-3 py-3 font-medium text-right">Yeni Kayıt</th>
                <th className="px-3 py-3 font-medium text-right">Aktif Kullanıcı</th>
                <th className="px-3 py-3 font-medium text-right">Çalışma (dk)</th>
                <th className="px-3 py-3 font-medium text-right">Yeni Kelime</th>
                <th className="px-3 py-3 font-medium text-right">Doğruluk</th>
                <th className="px-3 py-3 font-medium text-right">XP</th>
                <th className="px-6 py-3 font-medium text-right">Premium / Toplam Aktif</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
              {items.map((s) => (
                <tr key={s.id}>
                  <td className="px-6 py-3 text-gray-900 dark:text-slate-100 font-medium">{s.snapshot_date}</td>
                  <td className="px-3 py-3 text-right text-gray-600 dark:text-slate-400">{s.new_signups_count}</td>
                  <td className="px-3 py-3 text-right text-gray-600 dark:text-slate-400">{s.active_users_count}</td>
                  <td className="px-3 py-3 text-right text-gray-600 dark:text-slate-400">{s.total_study_minutes}</td>
                  <td className="px-3 py-3 text-right text-gray-600 dark:text-slate-400">{s.total_new_words}</td>
                  <td className="px-3 py-3 text-right"><AccuracyPill percent={s.avg_topic_accuracy} /></td>
                  <td className="px-3 py-3 text-right text-gray-600 dark:text-slate-400">{s.total_xp_awarded}</td>
                  <td className="px-6 py-3 text-right text-xs text-gray-500 dark:text-slate-400">{s.premium_users_count} / {s.total_active_profiles}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SegmentMetricCard({
  title, icon, metrics,
}: {
  title: string;
  icon: React.ReactNode;
  metrics: SubscriptionSegmentMetrics;
}) {
  return (
    <div className="rounded-xl border border-gray-100 dark:border-slate-800 p-5">
      <div className="flex items-center gap-2 mb-4">
        {icon}
        <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100">{title}</h3>
        <span className="ml-auto text-xs text-gray-400 dark:text-slate-500">{metrics.total_users} kullanıcı</span>
      </div>

      {metrics.insufficient_data ? (
        <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 rounded-lg px-3 py-2">
          Yeterli veri yok (en az 5 kullanıcı gerekiyor, şu an {metrics.total_users}).
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-xs text-gray-400 dark:text-slate-500">Aktiflik oranı</div>
            <div className="font-semibold text-gray-900 dark:text-slate-100">%{metrics.active_rate_percent}</div>
            <div className="text-xs text-gray-400 dark:text-slate-500">{metrics.active_users}/{metrics.total_users} aktif</div>
          </div>
          <div>
            <div className="text-xs text-gray-400 dark:text-slate-500 mb-1">Konu doğruluğu</div>
            <AccuracyPill percent={metrics.avg_topic_accuracy_percent} />
          </div>
          <div>
            <div className="text-xs text-gray-400 dark:text-slate-500">Kelime tekrarı / aktif kullanıcı</div>
            <div className="font-semibold text-gray-900 dark:text-slate-100">{metrics.avg_words_reviewed_per_active_user}</div>
          </div>
          <div>
            <div className="text-xs text-gray-400 dark:text-slate-500">Yeni kelime / aktif kullanıcı</div>
            <div className="font-semibold text-gray-900 dark:text-slate-100">{metrics.avg_new_words_per_active_user}</div>
          </div>
          <div>
            <div className="text-xs text-gray-400 dark:text-slate-500">XP / aktif kullanıcı</div>
            <div className="font-semibold text-gray-900 dark:text-slate-100">{metrics.avg_xp_per_active_user}</div>
          </div>
          <div>
            <div className="text-xs text-gray-400 dark:text-slate-500">Ortalama güncel seri</div>
            <div className="font-semibold text-gray-900 dark:text-slate-100">{metrics.avg_current_streak} gün</div>
          </div>
        </div>
      )}
    </div>
  );
}

// Faz 3 madde H — bkz. bu dosyanın üstündeki modül yorumu +
// subscription_segment_service.py docstring'i (study_sessions/
// topic_practice_attempts'in üretimde boş olması bulgusu dahil).
function SegmentsPanel() {
  const [data, setData] = useState<SubscriptionSegmentsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    adminApi.getSubscriptionSegments(30).then(setData).finally(() => setLoading(false));
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect -- mount olunca veri cekme (fetch-on-effect) deseni
  useEffect(load, []);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800">
      <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center gap-2">
        <Crown className="w-4 h-4 text-gray-400 dark:text-slate-500" />
        <h2 className="text-sm font-semibold text-gray-900 dark:text-slate-100">Abonelik-Segment Karşılaştırması (Premium vs Free)</h2>
      </div>

      <p className="px-6 pt-4 text-xs text-gray-400 dark:text-slate-500">
        Son 30 gün, bot hariç. Premium kullanıcıların gerçekten daha aktif/başarılı olup olmadığını gösterir.
      </p>

      {loading ? (
        <div className="p-10 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
      ) : data ? (
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SegmentMetricCard title="Premium" icon={<Crown className="w-4 h-4 text-amber-500" />} metrics={data.premium} />
            <SegmentMetricCard title="Free" icon={<Users className="w-4 h-4 text-gray-400" />} metrics={data.free} />
          </div>
          {data.by_plan.length > 0 && (
            <div className="text-xs text-gray-500 dark:text-slate-400">
              <span className="font-medium">Plana göre aktif abonelik: </span>
              {data.by_plan.map((p) => `${p.plan_code}: ${p.active_count}`).join(', ')}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

const BENCHMARK_METRIC_LABELS: { key: keyof PlatformSnapshotBenchmarkMetrics; label: string; suffix?: string }[] = [
  { key: 'total_new_signups', label: 'Yeni Kayıt' },
  { key: 'avg_active_users', label: 'Ort. Aktif Kullanıcı' },
  { key: 'total_study_minutes', label: 'Çalışma (dk)' },
  { key: 'total_new_words', label: 'Yeni Kelime' },
  { key: 'avg_topic_accuracy', label: 'Konu Doğruluğu', suffix: '%' },
  { key: 'total_xp_awarded', label: 'XP' },
  { key: 'avg_premium_users', label: 'Ort. Premium Kullanıcı' },
  { key: 'avg_total_active_profiles', label: 'Ort. Toplam Aktif Profil' },
];

const DAY_RANGE_OPTIONS = [30, 60, 90, 180];

function PctBadge({ value }: { value: number | null }) {
  if (value === null) return <span className="text-xs text-gray-400 dark:text-slate-500">—</span>;
  if (value === 0) return <span className="text-xs text-gray-500 dark:text-slate-400">%0</span>;
  const positive = value > 0;
  const color = positive
    ? 'text-emerald-600 dark:text-emerald-400'
    : 'text-red-600 dark:text-red-400';
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${color}`}>
      {positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {positive ? '+' : ''}{value}%
    </span>
  );
}

// today dahil, geriye doğru `days` günlük tarih listesi (YYYY-MM-DD) —
// takvim ısı haritasının hiç veri olmayan günleri de göstermesi için
// (backend sadece VAR OLAN snapshot satırlarını döndürüyor, boşlukları
// biz dolduruyoruz).
function buildDayRange(days: number): string[] {
  const result: string[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    result.push(d.toISOString().slice(0, 10));
  }
  return result;
}

function CalendarHeatmap({ days, snapshots }: { days: number; snapshots: PlatformDailySnapshot[] }) {
  const byDate = new Map(snapshots.map((s) => [s.snapshot_date, s]));
  const dayRange = buildDayRange(days);
  const max = Math.max(1, ...snapshots.map((s) => s.active_users_count));

  return (
    <div className="flex flex-wrap gap-1">
      {dayRange.map((date) => {
        const snap = byDate.get(date);
        const intensity = snap ? snap.active_users_count / max : 0;
        const bg = !snap || intensity === 0
          ? 'bg-gray-100 dark:bg-slate-800'
          : intensity < 0.25
            ? 'bg-emerald-100 dark:bg-emerald-900/40'
            : intensity < 0.5
              ? 'bg-emerald-300 dark:bg-emerald-700/60'
              : intensity < 0.75
                ? 'bg-emerald-500 dark:bg-emerald-600'
                : 'bg-emerald-700 dark:bg-emerald-500';
        const title = snap
          ? `${date}: ${snap.active_users_count} aktif kullanıcı, ${snap.total_xp_awarded} XP`
          : `${date}: veri yok`;
        return <div key={date} title={title} className={`w-3 h-3 rounded-sm ${bg}`} />;
      })}
    </div>
  );
}

// Faz 3 madde I — bkz. bu dosyanın üstündeki modül yorumu +
// platform_snapshot_service.py::get_snapshot_benchmark docstring'i.
function TrendPanel() {
  const [days, setDays] = useState(30);
  const [benchmark, setBenchmark] = useState<PlatformSnapshotBenchmark | null>(null);
  const [snapshots, setSnapshots] = useState<PlatformDailySnapshot[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    Promise.all([
      adminApi.getPlatformSnapshotBenchmark(days),
      adminApi.getPlatformSnapshots(days),
    ])
      .then(([b, s]) => {
        setBenchmark(b);
        setSnapshots(s.items);
      })
      .finally(() => setLoading(false));
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect -- gun araligi degisince yeniden cek (fetch-on-effect deseni)
  useEffect(load, [days]);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800">
      <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-gray-400 dark:text-slate-500" />
          <h2 className="text-sm font-semibold text-gray-900 dark:text-slate-100">Platform Trend &amp; Karşılaştırma</h2>
        </div>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="text-xs border border-gray-200 dark:border-slate-700 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-200"
        >
          {DAY_RANGE_OPTIONS.map((d) => (
            <option key={d} value={d}>Son {d} gün</option>
          ))}
        </select>
      </div>

      <p className="px-6 pt-4 text-xs text-gray-400 dark:text-slate-500">
        Seçilen periyodu bir önceki eşit uzunluktaki periyotla karşılaştırır + günlük aktiflik ısı haritası. Platform genelinde snapshot verisi 11 Eylül 2026&apos;dan itibaren birikiyor — geçmiş dönemler için &quot;yeterli veri yok&quot; görebilirsin, bu beklenen ve geçici bir durum.
      </p>

      {loading ? (
        <div className="p-10 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
      ) : benchmark ? (
        <div className="p-6 space-y-6">
          {benchmark.insufficient_data && (
            <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 rounded-lg px-3 py-2">
              Yeterli veri yok — karşılaştırma için hem bu periyotta hem önceki periyotta en az birkaç gün snapshot gerekiyor (mevcut: {benchmark.current.days_with_data} / önceki: {benchmark.previous.days_with_data} gün).
            </p>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {BENCHMARK_METRIC_LABELS.map(({ key, label, suffix }) => {
              const value = benchmark.current[key];
              return (
                <div key={key}>
                  <div className="text-xs text-gray-400 dark:text-slate-500">{label}</div>
                  <div className="font-semibold text-gray-900 dark:text-slate-100">
                    {value === null ? '—' : `${value}${suffix ?? ''}`}
                  </div>
                  <PctBadge value={benchmark.pct_change[key]} />
                </div>
              );
            })}
          </div>

          <div>
            <div className="text-xs text-gray-400 dark:text-slate-500 mb-2">Günlük Aktiflik Isı Haritası (aktif kullanıcı sayısına göre)</div>
            <CalendarHeatmap days={days} snapshots={snapshots} />
          </div>
        </div>
      ) : null}
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
      <SnapshotsPanel />
      <SegmentsPanel />
      <TrendPanel />
    </div>
  );
}
