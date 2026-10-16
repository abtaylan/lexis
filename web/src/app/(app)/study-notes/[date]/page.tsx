'use client';

// app/(app)/study-notes/[date]/page.tsx — "Çalışma Notlarım" gün detayı
// (15 Ekim 2026 kullanıcı isteği). Gemini/NotebookLM için o günün konusuna
// göre hazırlanmış talimat metinlerini gösterir ("...'yi Aç" butonu yeni
// sekmede ilgili siteyi açar + metni ortaya çıkarır), kullanıcı o metni
// kopyalayıp ilgili sitede yapıştırır, oradan aldığı özeti de buraya geri
// yapıştırıp kaydeder. Ayrıca Gemini/NotebookLM kullanmadan serbest not
// yazmak isteyenler için bir "Kendi Notların" kutusu var.
//
// 16 Ekim 2026 kullanıcı isteği: metin özetinin yanında görsel de
// yüklenebilsin ("buralara metin dışında ek olarak resimler yükleyeceğiz")
// — ör. Gemini'nin ürettiği infografik görseli, NotebookLM zihin
// haritasının ekran görüntüsü. Her panelde (Gemini/NotebookLM/Kendi
// Notların) ayrı bir "Görsel Ekle" alanı var; görseller seçilince hemen
// yüklenir (bkz. ImagesField), metinden bağımsız olarak da kaydedilebilir.
//
// 16 Ekim 2026, İKİNCİ kullanıcı isteği (aynı gün): "bugün 5 ders
// çalışılması gerektiği için [tek bir birleşik satır] yazmamalı, ayrı ayrı
// her biri için link olmalı, bu kutu içinde 1-2-3-4-5 şeklinde her birinin
// ayrı başlığı olmalı, tıklayınca her biri için Gemini/NotebookLM özet
// ekleme ekranı çıkacak." — sayfa artık o günün TEK bir ana konusunu değil,
// TÜM konularını (ana + haftaya bağlı ilgili konular) numaralı, tıklanabilir
// bir "konu seçici" olarak gösteriyor; seçilen konu değişince altındaki
// Gemini/NotebookLM/Kendi Notların panelleri o konuya özel promptu ve o
// konuya kayıtlı notları gösterecek şekilde yeniden kuruluyor (key=slug).
import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Check,
  Copy,
  ExternalLink,
  ImagePlus,
  Loader2,
  PenLine,
  Save,
  Trash2,
  X,
} from 'lucide-react';
import { studyNotesApi } from '@/lib/api';
import type { StudyDayDetail, StudyDayTopic, StudyNote, StudyNoteSource } from '@/types';
import { getErrorMessage } from '@/lib/errors';
import { buildGeminiPrompt, buildNotebookLMPrompt } from '@/lib/studyNotesPrompts';

function formatDateTr(dateIso: string): string {
  const [y, m, d] = dateIso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' });
}

const EXTERNAL_SOURCES: {
  key: 'gemini' | 'notebooklm';
  label: string;
  url: string;
  accent: string;
  accentSoft: string;
}[] = [
  { key: 'gemini', label: 'Gemini', url: 'https://gemini.google.com/app', accent: '#1A73E8', accentSoft: '#E8F0FE' },
  { key: 'notebooklm', label: 'NotebookLM', url: 'https://notebooklm.google.com/', accent: '#8E24AA', accentSoft: '#F3E5F7' },
];

// Gemini/NotebookLM/manuel notların hepsinde kullanılan ortak görsel
// yükleme + küçük resim galerisi alanı. Seçilen dosyalar hemen yüklenir
// (ayrı bir "Kaydet" gerekmez), her görselin üzerine gelince çıkan çarpı
// ile tek tek silinebilir.
function ImagesField({
  images,
  onUpload,
  onDelete,
  uploading,
}: {
  images: string[];
  onUpload: (files: FileList) => void;
  onDelete: (url: string) => void;
  uploading: boolean;
}) {
  return (
    <div className="mt-3">
      <div className="flex items-center justify-between mb-1.5 gap-2 flex-wrap">
        <p className="text-xs font-semibold text-gray-500 dark:text-slate-400">
          Görseller (infografik, zihin haritası, ekran görüntüsü vb.):
        </p>
        <label className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg border border-dashed border-gray-300 dark:border-slate-600 cursor-pointer text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-100 hover:border-gray-400 dark:hover:border-slate-500">
          {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImagePlus className="w-3.5 h-3.5" />}
          {uploading ? 'Yükleniyor...' : 'Görsel Ekle'}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            multiple
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) onUpload(e.target.files);
              e.target.value = '';
            }}
          />
        </label>
      </div>
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {images.map((url) => (
            <div key={url} className="relative group">
              <a href={url} target="_blank" rel="noopener noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element -- kullanıcının yüklediği dış görsel (Supabase Storage URL'i), diğer sayfalarda da aynı desen kullanılıyor */}
                <img
                  src={url}
                  alt="Çalışma notu görseli"
                  className="w-20 h-20 object-cover rounded-lg border border-gray-200 dark:border-slate-700"
                />
              </a>
              <button
                onClick={() => onDelete(url)}
                disabled={uploading}
                title="Görseli sil"
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SourcePanel({
  label,
  url,
  accent,
  accentSoft,
  promptText,
  existingNote,
  onSave,
  onDelete,
  saving,
  onUploadImages,
  onDeleteImage,
  uploadingImages,
}: {
  label: string;
  url: string;
  accent: string;
  accentSoft: string;
  promptText: string;
  existingNote?: StudyNote;
  onSave: (content: string) => void;
  onDelete: () => void;
  saving: boolean;
  onUploadImages: (files: FileList) => void;
  onDeleteImage: (url: string) => void;
  uploadingImages: boolean;
}) {
  const [showPrompt, setShowPrompt] = useState(false);
  const [copied, setCopied] = useState(false);
  const [content, setContent] = useState(existingNote?.content || '');

  function openAndReveal() {
    window.open(url, '_blank', 'noopener,noreferrer');
    setShowPrompt(true);
  }

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(promptText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API kullanılamıyorsa sessizce geç — kullanıcı metni elle seçip kopyalayabilir.
    }
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-5">
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: accent }} />
          <h3 className="text-sm font-bold text-gray-900 dark:text-slate-100">{label}</h3>
          {existingNote && (
            <span
              className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
              style={{ backgroundColor: accentSoft, color: accent }}
            >
              Kaydedildi
            </span>
          )}
        </div>
        <button
          onClick={openAndReveal}
          className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: accent }}
        >
          {label}&apos;yi Aç <ExternalLink className="w-3.5 h-3.5" />
        </button>
      </div>

      {showPrompt && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-xs font-semibold text-gray-500 dark:text-slate-400">
              Bu metni kopyalayıp {label}&apos;de yapıştır:
            </p>
            <button
              onClick={copyPrompt}
              className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-100"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-[#0F6E56]" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Kopyalandı' : 'Kopyala'}
            </button>
          </div>
          <textarea
            readOnly
            value={promptText}
            rows={6}
            onFocus={(e) => e.currentTarget.select()}
            className="w-full text-xs font-mono p-3 rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-slate-300 resize-none"
          />
        </div>
      )}

      <div>
        <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1.5">
          {label}&apos;den aldığın özeti buraya yapıştır:
        </p>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={5}
          placeholder={`${label}'den kopyaladığın özeti buraya yapıştır...`}
          className="w-full text-sm p-3 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-800 dark:text-slate-200"
        />
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <button
            onClick={() => onSave(content)}
            disabled={saving || !content.trim()}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg text-white disabled:opacity-50"
            style={{ backgroundColor: accent }}
          >
            <Save className="w-3.5 h-3.5" /> Kaydet
          </button>
          {existingNote && (
            <button
              onClick={onDelete}
              disabled={saving}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" /> Sil
            </button>
          )}
          {existingNote && (
            <span className="text-[11px] text-gray-400 dark:text-slate-500">
              Son güncelleme: {new Date(existingNote.updated_at).toLocaleString('tr-TR')}
            </span>
          )}
        </div>

        <ImagesField
          images={existingNote?.image_urls || []}
          onUpload={onUploadImages}
          onDelete={onDeleteImage}
          uploading={uploadingImages}
        />
      </div>
    </div>
  );
}

function ManualNoteBox({
  existingNote,
  onSave,
  onDelete,
  saving,
  onUploadImages,
  onDeleteImage,
  uploadingImages,
}: {
  existingNote?: StudyNote;
  onSave: (content: string) => void;
  onDelete: () => void;
  saving: boolean;
  onUploadImages: (files: FileList) => void;
  onDeleteImage: (url: string) => void;
  uploadingImages: boolean;
}) {
  const [content, setContent] = useState(existingNote?.content || '');

  return (
    <div>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={5}
        placeholder="Bugün çalıştığın konuyla ilgili kendi notlarını yaz..."
        className="w-full text-sm p-3 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-800 dark:text-slate-200"
      />
      <div className="flex items-center gap-2 mt-2 flex-wrap">
        <button
          onClick={() => onSave(content)}
          disabled={saving || !content.trim()}
          className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-gray-800 dark:bg-slate-700 text-white disabled:opacity-50"
        >
          <Save className="w-3.5 h-3.5" /> Kaydet
        </button>
        {existingNote && (
          <button
            onClick={onDelete}
            disabled={saving}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" /> Sil
          </button>
        )}
        {existingNote && (
          <span className="text-[11px] text-gray-400 dark:text-slate-500">
            Son güncelleme: {new Date(existingNote.updated_at).toLocaleString('tr-TR')}
          </span>
        )}
      </div>

      <ImagesField
        images={existingNote?.image_urls || []}
        onUpload={onUploadImages}
        onDelete={onDeleteImage}
        uploading={uploadingImages}
      />
    </div>
  );
}

// 16 Ekim 2026, İKİNCİ kullanıcı isteği: o günün konuları arasında geçiş
// yapmak için numaralı, tıklanabilir bir "konu seçici" kutusu. Her satır
// kendi numarasını + başlığını gösterir; o konu için en az bir not
// kaydedilmişse küçük bir "✓" rozeti de görünür. Aktif konu vurgulanır.
function TopicSwitcher({
  topics,
  activeSlug,
  onSelect,
  weekTopicCount,
}: {
  topics: StudyDayTopic[];
  activeSlug: string;
  onSelect: (slug: string) => void;
  weekTopicCount?: number;
}) {
  if (topics.length === 0) return null;

  return (
    <div className="bg-[#FFF8E6] dark:bg-amber-900/20 rounded-2xl border border-[#F3D98B] dark:border-amber-800/40 p-4">
      <h2 className="text-sm font-bold text-gray-900 dark:text-slate-100">
        Bugünün Konuları {weekTopicCount && weekTopicCount > 1 ? `(${topics.length}/${weekTopicCount})` : ''}
      </h2>
      <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 mb-2.5">
        {topics.length > 1
          ? 'Bu hafta çalışman gereken tüm konular aşağıda — her biri gerçek müfredatın parçası. Birine tıklayınca onun için hazırlanmış Gemini/NotebookLM ekranı açılır.'
          : 'Bugünün konusu için Gemini/NotebookLM ekranı aşağıda.'}
      </p>
      <div className="flex flex-col gap-1.5">
        {topics.map((t) => {
          const isActive = t.slug === activeSlug;
          const savedCount = t.notes.length;
          return (
            <button
              key={t.slug}
              onClick={() => onSelect(t.slug)}
              className={`text-left flex items-center justify-between gap-2 px-3 py-2 rounded-xl border transition-colors ${
                isActive
                  ? 'bg-[#378ADD] border-[#378ADD] text-white'
                  : 'bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700 text-gray-800 dark:text-slate-200 hover:border-[#378ADD]/50'
              }`}
            >
              <span className="text-sm font-semibold truncate">
                {t.topic_number ? `${t.topic_number}. ` : ''}
                {t.title || 'Genel Çalışma Programı'}
              </span>
              {savedCount > 0 && (
                <span
                  className={`shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                    isActive ? 'bg-white/20 text-white' : 'bg-[#E1F5EE] text-[#0F6E56]'
                  }`}
                >
                  ✓ {savedCount}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function StudyNoteDetailPage() {
  const params = useParams<{ date: string }>();
  const date = typeof params?.date === 'string' ? params.date : '';
  const router = useRouter();
  const searchParams = useSearchParams();

  const [detail, setDetail] = useState<StudyDayDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeSlug, setActiveSlug] = useState<string>('');
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);

  useEffect(() => {
    if (!date) return;
    studyNotesApi
      .getDay(date)
      .then((d) => {
        setDetail(d);
        const fromQuery = searchParams.get('topic');
        const initial = (fromQuery && d.topics.some((t) => t.slug === fromQuery) ? fromQuery : d.topics[0]?.slug) || '';
        setActiveSlug(initial);
      })
      .catch((e) => setError(getErrorMessage(e, 'Gün bilgisi yüklenemedi.')))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- yalnızca tarih değişince yeniden yüklenmeli
  }, [date]);

  function selectTopic(slug: string) {
    setActiveSlug(slug);
    const qs = new URLSearchParams(Array.from(searchParams.entries()));
    qs.set('topic', slug);
    router.replace(`/study-notes/${date}?${qs.toString()}`, { scroll: false });
  }

  function updateTopicNotes(topicSlug: string, updater: (notes: StudyNote[]) => StudyNote[]) {
    setDetail((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        topics: prev.topics.map((t) => (t.slug === topicSlug ? { ...t, notes: updater(t.notes) } : t)),
      };
    });
  }

  async function handleSave(topic: StudyDayTopic, source: StudyNoteSource, content: string) {
    if (!content.trim()) return;
    const key = `${topic.slug}:${source}`;
    setSavingKey(key);
    setError('');
    try {
      const saved = await studyNotesApi.saveNote(date, source, topic.slug, content, topic.title ?? undefined);
      updateTopicNotes(topic.slug, (notes) => [...notes.filter((n) => n.source !== source), saved]);
    } catch (e) {
      setError(getErrorMessage(e, 'Not kaydedilemedi.'));
    } finally {
      setSavingKey(null);
    }
  }

  async function handleDelete(topic: StudyDayTopic, source: StudyNoteSource) {
    const key = `${topic.slug}:${source}`;
    setSavingKey(key);
    setError('');
    try {
      await studyNotesApi.deleteNote(date, source, topic.slug);
      updateTopicNotes(topic.slug, (notes) => notes.filter((n) => n.source !== source));
    } catch (e) {
      setError(getErrorMessage(e, 'Not silinemedi.'));
    } finally {
      setSavingKey(null);
    }
  }

  async function handleUploadImages(topic: StudyDayTopic, source: StudyNoteSource, files: FileList) {
    if (!files || files.length === 0) return;
    const key = `${topic.slug}:${source}`;
    setUploadingKey(key);
    setError('');
    try {
      const saved = await studyNotesApi.uploadImages(date, source, topic.slug, Array.from(files));
      updateTopicNotes(topic.slug, (notes) => [...notes.filter((n) => n.source !== source), saved]);
    } catch (e) {
      setError(getErrorMessage(e, 'Görsel yüklenemedi.'));
    } finally {
      setUploadingKey(null);
    }
  }

  async function handleDeleteImage(topic: StudyDayTopic, source: StudyNoteSource, imageUrl: string) {
    const key = `${topic.slug}:${source}`;
    setUploadingKey(key);
    setError('');
    try {
      await studyNotesApi.deleteImage(date, source, topic.slug, imageUrl);
      updateTopicNotes(topic.slug, (notes) =>
        notes.map((n) => (n.source === source ? { ...n, image_urls: n.image_urls.filter((u) => u !== imageUrl) } : n))
      );
    } catch (e) {
      setError(getErrorMessage(e, 'Görsel silinemedi.'));
    } finally {
      setUploadingKey(null);
    }
  }

  const activeTopic = useMemo(
    () => detail?.topics.find((t) => t.slug === activeSlug) || null,
    [detail, activeSlug]
  );

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-2 text-sm text-gray-400 dark:text-slate-500">
          <Loader2 className="w-4 h-4 animate-spin" /> Yükleniyor...
        </div>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="p-6">
        <p className="text-sm text-red-600 dark:text-red-400">{error || 'Gün bulunamadı.'}</p>
      </div>
    );
  }

  const { activities, week_topic_count: weekTopicCount, topics } = detail;
  const noteBySource = (topic: StudyDayTopic) =>
    Object.fromEntries(topic.notes.map((n) => [n.source, n])) as Partial<Record<StudyNoteSource, StudyNote>>;

  return (
    <div className="p-6 space-y-5 max-w-3xl">
      <div>
        <button
          onClick={() => router.push('/study-notes')}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-100 mb-3"
        >
          <ArrowLeft className="w-4 h-4" /> Çalışma Notlarım
        </button>
        <h1 className="text-xl font-bold text-gray-900 dark:text-slate-100">{formatDateTr(date)}</h1>
        {activities.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {activities.map((a) => (
              <span
                key={a}
                className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400"
              >
                {a}
              </span>
            ))}
          </div>
        )}
      </div>

      <TopicSwitcher topics={topics} activeSlug={activeSlug} onSelect={selectTopic} weekTopicCount={weekTopicCount} />

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {activeTopic && (
        <div key={activeTopic.slug} className="space-y-5">
          {activeTopic.link_url && (
            <a
              href={activeTopic.link_url}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#378ADD] hover:underline"
            >
              Gramer Rehberi&apos;nde bu konuyu aç <ExternalLink className="w-3 h-3" />
            </a>
          )}

          {EXTERNAL_SOURCES.map((s) => {
            const notesBySource = noteBySource(activeTopic);
            const key = `${activeTopic.slug}:${s.key}`;
            return (
              <SourcePanel
                key={s.key}
                label={s.label}
                url={s.url}
                accent={s.accent}
                accentSoft={s.accentSoft}
                promptText={
                  s.key === 'gemini'
                    ? buildGeminiPrompt(date, activeTopic.title, activities, activeTopic.is_main)
                    : buildNotebookLMPrompt(date, activeTopic.title, activities, activeTopic.is_main)
                }
                existingNote={notesBySource[s.key]}
                onSave={(content) => handleSave(activeTopic, s.key, content)}
                onDelete={() => handleDelete(activeTopic, s.key)}
                saving={savingKey === key}
                onUploadImages={(files) => handleUploadImages(activeTopic, s.key, files)}
                onDeleteImage={(url) => handleDeleteImage(activeTopic, s.key, url)}
                uploadingImages={uploadingKey === key}
              />
            );
          })}

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-3">
              <PenLine className="w-4 h-4 text-gray-400 dark:text-slate-500" />
              <h3 className="text-sm font-bold text-gray-900 dark:text-slate-100">Kendi Notların</h3>
            </div>
            <ManualNoteBox
              existingNote={noteBySource(activeTopic).manual}
              onSave={(content) => handleSave(activeTopic, 'manual', content)}
              onDelete={() => handleDelete(activeTopic, 'manual')}
              saving={savingKey === `${activeTopic.slug}:manual`}
              onUploadImages={(files) => handleUploadImages(activeTopic, 'manual', files)}
              onDeleteImage={(url) => handleDeleteImage(activeTopic, 'manual', url)}
              uploadingImages={uploadingKey === `${activeTopic.slug}:manual`}
            />
          </div>
        </div>
      )}
    </div>
  );
}
