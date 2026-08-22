'use client';

import { useEffect, useState } from 'react';
import { BookOpen, Loader2, Plus, Trash2, X, Eye, AlertTriangle } from 'lucide-react';
import { adminApi } from '@/lib/api';
import type { WordPoolEntry, WordPoolCreate } from '@/types';
import { useAuth } from '@/store/auth';

// general_word_pool içeriği — genel oyun havuzunda kullanılan kelimeler.
// Şu an sadece backend/seed_general_word_pool.py ile toplu doldurulabiliyor;
// bu sayfa tekil ekleme/düzenleme/pasif etme için admin panel arayüzü sağlar.

function AddWordModal({ onSave, onClose }: { onSave: (data: WordPoolCreate) => Promise<void>; onClose: () => void }) {
  const [form, setForm] = useState({ source_lang: 'en', target_lang: 'tr', word: '', meaning: '', example: '', difficulty_level: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (f: string, v: string) => setForm((p) => ({ ...p, [f]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.word || !form.meaning) { setError('Kelime ve anlam zorunlu.'); return; }
    setSaving(true);
    try { await onSave(form); onClose(); }
    catch { setError('Kelime eklenemedi.'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100 dark:border-slate-800">
          <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">Havuza Kelime Ekle</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 dark:text-slate-500 hover:bg-gray-100 hover:dark:bg-slate-800"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Kaynak dil</label>
              <input value={form.source_lang} onChange={(e) => set('source_lang', e.target.value)} placeholder="en"
                className="w-full border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Hedef dil</label>
              <input value={form.target_lang} onChange={(e) => set('target_lang', e.target.value)} placeholder="tr"
                className="w-full border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Kelime</label>
            <input value={form.word} onChange={(e) => set('word', e.target.value)}
              className="w-full border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Anlam</label>
            <input value={form.meaning} onChange={(e) => set('meaning', e.target.value)}
              className="w-full border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Örnek cümle (opsiyonel)</label>
            <input value={form.example} onChange={(e) => set('example', e.target.value)}
              className="w-full border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Zorluk (opsiyonel)</label>
            <input value={form.difficulty_level} onChange={(e) => set('difficulty_level', e.target.value)} placeholder="a1 / b2 / vb."
              className="w-full border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm" />
          </div>
          {error && <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 rounded-xl px-3 py-2">{error}</p>}
        </form>
        <div className="flex gap-3 px-6 pb-6">
          <button onClick={onClose} className="flex-1 border border-gray-200 dark:border-slate-700 rounded-xl py-2.5 text-sm font-medium text-gray-600 dark:text-slate-400">Vazgeç</button>
          <button onClick={handleSubmit as never} disabled={saving} className="flex-1 bg-[#534AB7] hover:bg-[#473fa0] disabled:opacity-50 text-white rounded-xl py-2.5 text-sm font-medium">
            {saving ? 'Kaydediliyor…' : 'Ekle'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function WordPoolContentPage() {
  const { user } = useAuth();
  const isReadonly = user?.role === 'admin_readonly';

  const [items, setItems] = useState<WordPoolEntry[]>([]);
  const [coverage, setCoverage] = useState<Record<string, number>>({});
  const [total, setTotal] = useState(0);
  const [sourceLang, setSourceLang] = useState('en');
  const [targetLang, setTargetLang] = useState('tr');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  const load = () => {
    setLoading(true);
    adminApi.getWordPool({ source_lang: sourceLang || undefined, target_lang: targetLang || undefined, search: search || undefined, page_size: 100 })
      .then((res) => { setItems(res.items); setTotal(res.total); setCoverage(res.coverage); })
      .finally(() => setLoading(false));
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps -- mount/parametre değişiminde veri çekme (fetch-on-effect) deseni, senkron setState kasıtlı; 'search' de kasıtlı dışarıda çünkü arama sadece "Filtrele" gönderiminde (handleSearch) tetiklenmeli, her tuş vuruşunda değil
  useEffect(load, [sourceLang, targetLang]);

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); load(); };

  const handleAdd = async (data: WordPoolCreate) => { await adminApi.createWordPoolEntry(data); load(); };

  const handleDeactivate = async (id: string) => {
    if (!confirm('Bu kelime pasif edilsin mi? (oyun havuzundan kaldırılır, geçmiş kayıtlar korunur)')) return;
    await adminApi.deleteWordPoolEntry(id);
    load();
  };

  const missingCoverage = ['de', 'fr', 'es', 'it', 'ar', 'ru', 'ja'].filter((lang) => !coverage[`en->${lang}`] && !coverage[`${lang}->tr`]);

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Kelime Havuzu</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">Genel oyun havuzundaki kelimeleri yönet (general_word_pool)</p>
        </div>
        {!isReadonly && (
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 bg-[#534AB7] hover:bg-[#473fa0] text-white rounded-xl px-4 py-2.5 text-sm font-medium shadow-sm">
            <Plus className="w-4 h-4" />Kelime Ekle
          </button>
        )}
      </div>

      {isReadonly && (
        <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 rounded-2xl px-4 py-3 text-sm">
          <Eye className="w-4 h-4 shrink-0" />Salt görüntüleme modundasınız — ekleme/pasif etme işlemleri kapalı.
        </div>
      )}

      {missingCoverage.length > 0 && (
        <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 rounded-2xl px-4 py-3 text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Bazı diller için genel havuz boş olabilir: {missingCoverage.join(', ')}</p>
            <p className="text-xs mt-0.5 opacity-80">Toplu doldurma için <code className="font-mono">backend/seed_general_word_pool.py</code> script&apos;i o diller için de çalıştırılmalı.</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSearch} className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Kaynak dil</label>
          <input value={sourceLang} onChange={(e) => setSourceLang(e.target.value)} className="border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm w-24" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Hedef dil</label>
          <input value={targetLang} onChange={(e) => setTargetLang(e.target.value)} className="border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm w-24" />
        </div>
        <div className="flex-1 min-w-[160px]">
          <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Kelime ara</label>
          <input value={search} onChange={(e) => setSearch(e.target.value)} className="border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm w-full" />
        </div>
        <button type="submit" className="bg-gray-900 text-white rounded-xl px-4 py-2 text-sm font-medium">Filtrele</button>
      </form>

      {loading ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-12 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-gray-400 dark:text-slate-500" /></div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-slate-300 flex items-center gap-2"><BookOpen className="w-4 h-4" />{sourceLang} → {targetLang}</h2>
            <span className="text-xs font-medium bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400 px-2 py-0.5 rounded-full">{total} kayıt</span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-slate-800">
                {['Kelime', 'Anlam', 'Örnek', 'Zorluk', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-gray-400 dark:text-slate-500">Bu dil çifti için havuzda kelime yok.</td></tr>
              ) : items.map((it) => (
                <tr key={it.id} className="border-b border-gray-50 dark:border-slate-800 last:border-0 hover:bg-slate-50 hover:dark:bg-slate-800 group">
                  <td className="px-4 py-3 font-semibold text-gray-900 dark:text-slate-100">{it.word}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-slate-400 text-xs">{it.meaning}</td>
                  <td className="px-4 py-3 text-gray-400 dark:text-slate-500 text-xs truncate max-w-[220px]">{it.example || '—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 dark:text-slate-400">{it.difficulty_level || '—'}</td>
                  <td className="px-4 py-3 text-right">
                    {!isReadonly && (
                      <button onClick={() => handleDeactivate(it.id)} className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 dark:text-slate-500 hover:text-red-500 hover:dark:text-red-400 hover:bg-red-50 hover:dark:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-colors" title="Pasif et">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && <AddWordModal onSave={handleAdd} onClose={() => setShowAdd(false)} />}
    </div>
  );
}
