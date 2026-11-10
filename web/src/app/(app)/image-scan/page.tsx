'use client';

// app/(app)/image-scan/page.tsx — "Görsel Tara" (10 Kasım 2026 kullanıcı
// isteği, Behçet): "Lexis de görüntü işleme yapacaz, bir resim çektiğimizde
// içindeki metni çözecek, hem metnin çevirisini yapacak, hem de metindeki
// kelimeleri liste halinde yazacak." PREMIUM özellik — profiles.is_premium
// ile korunuyor (bkz. useAuth, backend get_current_premium_user).
//
// study-notes/page.tsx ile AYNI görsel dil (düz Türkçe metin, kart stilleri,
// getErrorMessage ile hata gösterimi) — bu sayfada ek olarak merkezi
// i18n sözlüğüne dokunulmadı, Lexis'te bu tarz "yeni özellik" sayfalarının
// çoğu (study-notes, exam-prep vb.) zaten sadece Türkçe.
//
// Taranan kelimeler ayrı bir tabloya YAZILMIYOR — "Kelimelerime Ekle"
// butonu, mevcut wordsApi.create() (POST /words) çağrısını doğrudan
// kullanıyor, böylece Kelimelerim sayfasındaki akışla (tekrar, XP,
// streak vb.) otomatik olarak bütünleşiyor.
import { useRef, useState } from 'react';
import Link from 'next/link';
import { ScanText, Upload, Loader2, Crown, Check, Plus, Languages } from 'lucide-react';
import { imageScanApi, wordsApi } from '@/lib/api';
import { useAuth } from '@/store/auth';
import { getErrorMessage } from '@/lib/errors';
import type { ImageScanResult, ScannedWord } from '@/types';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // backend/app/services/image_scan_service.py ile AYNI sınır

export default function ImageScanPage() {
  const { user, isLoading: authLoading } = useAuth();
  const isPremium = !!user?.is_premium;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<ImageScanResult | null>(null);
  // Kelime bazında "ekle" durumu — eklenen/eklenemeyen kelimeyi ayrı ayrı
  // takip ediyoruz (word metnini anahtar olarak kullanıyoruz, bu ekranda
  // tekrar yok çünkü backend zaten tekrarsızlaştırıyor, bkz. image_scan_service.py).
  const [addState, setAddState] = useState<Record<string, 'idle' | 'adding' | 'added' | 'error'>>({});

  function handlePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setResult(null);
    setAddState({});
    if (file.size > MAX_IMAGE_BYTES) {
      setError(`Görsel ${Math.round(MAX_IMAGE_BYTES / (1024 * 1024))}MB sınırını aşıyor.`);
      return;
    }
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  async function handleScan() {
    if (!selectedFile) return;
    setScanning(true);
    setError('');
    setResult(null);
    setAddState({});
    try {
      const res = await imageScanApi.scan(selectedFile);
      setResult(res);
    } catch (e) {
      setError(getErrorMessage(e, 'Görsel taranamadı. Lütfen tekrar dene.'));
    } finally {
      setScanning(false);
    }
  }

  async function handleAddWord(w: ScannedWord) {
    setAddState((prev) => ({ ...prev, [w.word]: 'adding' }));
    try {
      await wordsApi.create({
        word: w.word,
        meaning: w.meaning,
        word_type: w.word_type || undefined,
        example: w.example || undefined,
        list_type: 'active',
      });
      setAddState((prev) => ({ ...prev, [w.word]: 'added' }));
    } catch (e) {
      // 409 = "bu kelime zaten ekli" -- kullanıcı için bu da aslında bir
      // başarı durumu (kelime zaten listesinde), hata olarak gösterme.
      const status = (e as { response?: { status?: number } })?.response?.status;
      if (status === 409) {
        setAddState((prev) => ({ ...prev, [w.word]: 'added' }));
      } else {
        setAddState((prev) => ({ ...prev, [w.word]: 'error' }));
      }
    }
  }

  if (!authLoading && !isPremium) {
    return (
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
            <ScanText className="w-6 h-6 text-[#378ADD]" /> Görsel Tara
          </h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5 max-w-2xl">
            Bir görseldeki (fotoğraf, ekran görüntüsü) metni oku, çevirisini çıkar ve metindeki kelimeleri tek
            tıkla kelime listene ekle.
          </p>
        </div>
        <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-2xl p-8 text-center">
          <Crown className="w-8 h-8 text-amber-500 mx-auto mb-3" />
          <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">Bu özellik premium üyelere özel</p>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            Görsel tarama, çeviri ve otomatik kelime çıkarımı için Premium&apos;a geçmen gerekiyor.
          </p>
          <Link
            href="/premium"
            className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 rounded-lg bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 transition-colors"
          >
            <Crown className="w-4 h-4" /> Premium&apos;a Geç
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
          <ScanText className="w-6 h-6 text-[#378ADD]" /> Görsel Tara
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">
            PREMIUM
          </span>
        </h1>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5 max-w-2xl">
          Bir görsel yükle — içindeki metni okuyup çevirisini çıkaralım, metindeki kelimeleri de tek tıkla kelime
          listene ekleyebilesin diye listeleyelim.
        </p>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-6">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/webp"
          capture="environment"
          className="hidden"
          onChange={handlePick}
        />

        {!previewUrl && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-xl py-12 flex flex-col items-center gap-2 text-gray-400 dark:text-slate-500 hover:border-[#378ADD]/50 hover:text-[#378ADD] transition-colors"
          >
            <Upload className="w-8 h-8" />
            <span className="text-sm font-semibold">Görsel seç veya fotoğraf çek</span>
            <span className="text-xs">PNG, JPEG ya da WEBP — en fazla 5MB</span>
          </button>
        )}

        {previewUrl && (
          <div className="space-y-4">
            {/* eslint-disable-next-line @next/next/no-img-element -- geçici önizleme, URL.createObjectURL ile üretiliyor */}
            <img
              src={previewUrl}
              alt="Seçilen görsel önizlemesi"
              className="max-h-80 w-auto mx-auto rounded-lg border border-gray-100 dark:border-slate-800"
            />
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={scanning}
                className="px-4 py-2 rounded-lg border border-gray-200 dark:border-slate-700 text-sm font-semibold text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                Başka görsel seç
              </button>
              <button
                type="button"
                onClick={handleScan}
                disabled={scanning}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#378ADD] text-white text-sm font-semibold hover:bg-[#2f78c0] transition-colors disabled:opacity-50"
              >
                {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <ScanText className="w-4 h-4" />}
                {scanning ? 'Taranıyor...' : 'Tara'}
              </button>
            </div>
          </div>
        )}

        {error && <p className="text-sm text-red-600 dark:text-red-400 mt-4 text-center">{error}</p>}
      </div>

      {result && (
        <div className="space-y-4">
          {!result.detected_text && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-6 text-center">
              <p className="text-sm text-gray-500 dark:text-slate-400">
                Bu görselde okunabilir bir metin bulamadım — daha net bir fotoğrafla tekrar dener misin?
              </p>
            </div>
          )}

          {result.detected_text && (
            <>
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-5">
                <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-2">
                  Algılanan Metin{result.detected_lang ? ` (${result.detected_lang.toUpperCase()})` : ''}
                </p>
                <p className="text-sm text-gray-800 dark:text-slate-200 whitespace-pre-wrap">{result.detected_text}</p>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-5">
                <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <Languages className="w-3.5 h-3.5" /> Çeviri
                </p>
                <p className="text-sm text-gray-800 dark:text-slate-200 whitespace-pre-wrap">{result.translation}</p>
              </div>

              {result.words.length > 0 && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-5">
                  <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-3">
                    Metindeki Kelimeler ({result.words.length})
                  </p>
                  <div className="flex flex-col gap-2">
                    {result.words.map((w) => {
                      const state = addState[w.word] ?? 'idle';
                      return (
                        <div
                          key={w.word}
                          className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-gray-50 dark:bg-slate-800/50"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                              {w.word}
                              {w.word_type && (
                                <span className="ml-1.5 text-[10px] font-normal text-gray-400 dark:text-slate-500">
                                  {w.word_type}
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-slate-400 truncate">{w.meaning}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleAddWord(w)}
                            disabled={state === 'adding' || state === 'added'}
                            className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                              state === 'added'
                                ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
                                : state === 'error'
                                ? 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400'
                                : 'bg-[#378ADD]/10 text-[#378ADD] hover:bg-[#378ADD]/20'
                            }`}
                          >
                            {state === 'adding' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                            {state === 'added' && <Check className="w-3.5 h-3.5" />}
                            {state === 'idle' && <Plus className="w-3.5 h-3.5" />}
                            {state === 'added' ? 'Eklendi' : state === 'error' ? 'Tekrar dene' : 'Ekle'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
