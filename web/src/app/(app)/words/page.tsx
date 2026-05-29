'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Plus, Search, Pencil, Trash2, X, BookOpen, CheckCircle2,
  Archive, RefreshCw, Sparkles, Loader2,
} from 'lucide-react';
import { wordsApi, dictionaryApi } from '@/lib/api';
import type { Word, WordCreate, WordUpdate, DictionaryMeaning } from '@/types';

const EMPTY_FORM: WordCreate = {
  word: '', meaning: '', meaning_tr: '', meaning_en: '',
  example: '', word_type: '', list_type: 'active',
};

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; text: string; label: string; icon: React.ReactNode }> = {
    learned:  { bg: 'bg-[#EAF3DE]', text: 'text-[#3B6D11]', label: 'Öğrenildi',   icon: <CheckCircle2 className="w-3 h-3" /> },
    learning: { bg: 'bg-[#FAEEDA]', text: 'text-[#854F0B]', label: 'Öğreniliyor', icon: <RefreshCw className="w-3 h-3" /> },
    archived: { bg: 'bg-gray-100',  text: 'text-gray-500',  label: 'Arşiv',        icon: <Archive className="w-3 h-3" /> },
  };
  const s = map[status] ?? map['archived'];
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${s.bg} ${s.text}`}>
      {s.icon}{s.label}
    </span>
  );
}

// ── WordFormModal — Cambridge entegrasyonlu ───────────────────
function WordFormModal({ initial, onSave, onClose, title, allowLookup }: {
  initial?: WordCreate;
  onSave: (data: WordCreate) => Promise<void>;
  onClose: () => void;
  title: string;
  allowLookup: boolean;
}) {
  const [form, setForm]   = useState<WordCreate>(initial ?? EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Dictionary state
  const [looking, setLooking]     = useState(false);
  const [meanings, setMeanings]   = useState<DictionaryMeaning[]>([]);
  const [lookupMsg, setLookupMsg] = useState('');
  const [searched, setSearched]   = useState('');

  const set = (field: keyof WordCreate, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleLookup = async () => {
    const w = form.word.trim();
    if (!w || looking) return;
    setLooking(true);
    setLookupMsg('');
    setMeanings([]);
    try {
      const res = await dictionaryApi.lookup(w);
      setSearched(w);
      if (res.meanings && res.meanings.length > 0) {
        setMeanings(res.meanings);
      } else {
        setLookupMsg(res.error || 'Anlam bulunamadı. Elle girebilirsin.');
      }
    } catch {
      setLookupMsg('Sözlükte bulunamadı. Elle girebilirsin.');
    } finally {
      setLooking(false);
    }
  };

  const applyMeaning = (m: DictionaryMeaning) => {
    setForm((prev) => ({
      ...prev,
      meaning:    m.meaning_tr || m.meaning_en || prev.meaning,
      meaning_tr: m.meaning_tr || prev.meaning_tr,
      meaning_en: m.meaning_en || prev.meaning_en,
      example:    m.examples?.[0] || prev.example,
      word_type:  m.word_type || prev.word_type,
    }));
    setMeanings([]);
    setLookupMsg('✓ Anlam forma eklendi, düzenleyebilirsin.');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.word.trim() || !form.meaning.trim()) {
      setError('Kelime ve anlam zorunludur.');
      return;
    }
    setSaving(true);
    try {
      await onSave(form);
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Kaydedilemedi, tekrar deneyin.');
    } finally {
      setSaving(false);
    }
  };

  const textFields: { field: keyof WordCreate; label: string; ph: string }[] = [
    { field: 'meaning',    label: 'Anlam *',            ph: 'örn. azim, sebat' },
    { field: 'meaning_tr', label: 'Türkçe anlam',       ph: 'örn. azim' },
    { field: 'meaning_en', label: 'İngilizce açıklama',  ph: 'continued effort despite difficulty' },
    { field: 'example',    label: 'Örnek cümle',        ph: 'örn. Her perseverance paid off.' },
    { field: 'word_type',  label: 'Kelime türü',        ph: 'noun / verb / adjective…' },
  ];

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#E6F1FB] flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-[#185FA5]" />
            </div>
            <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-3">
          {/* Kelime + sözlük ara */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Kelime *</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={form.word}
                onChange={(e) => set('word', e.target.value)}
                onKeyDown={(e) => { if (allowLookup && e.key === 'Enter') { e.preventDefault(); handleLookup(); } }}
                placeholder="örn. perseverance"
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#378ADD] focus:border-transparent transition"
              />
              {allowLookup && (
                <button
                  type="button"
                  onClick={handleLookup}
                  disabled={looking || !form.word.trim()}
                  className="flex items-center gap-1.5 px-3 py-2 bg-[#EEEDFE] hover:bg-[#e0ddfc] disabled:opacity-50 text-[#534AB7] rounded-xl text-sm font-medium transition-colors shrink-0"
                  title="Cambridge sözlükte ara"
                >
                  {looking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  Ara
                </button>
              )}
            </div>
            {allowLookup && (
              <p className="text-xs text-gray-400 mt-1">Kelimeyi yazıp Enter'a bas veya Ara'ya tıkla — anlamı otomatik gelir.</p>
            )}
          </div>

          {/* Sözlük sonuçları */}
          {lookupMsg && (
            <p className={`text-xs rounded-lg px-3 py-2 ${lookupMsg.startsWith('✓') ? 'bg-[#EAF3DE] text-[#3B6D11]' : 'bg-[#FAEEDA] text-[#854F0B]'}`}>
              {lookupMsg}
            </p>
          )}
          {meanings.length > 0 && (
            <div className="space-y-2 max-h-52 overflow-y-auto border border-gray-100 rounded-xl p-2 bg-slate-50">
              <p className="text-xs font-semibold text-gray-500 px-1">"{searched}" için {meanings.length} anlam — birini seç:</p>
              {meanings.map((m, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => applyMeaning(m)}
                  className="w-full text-left bg-white border border-gray-100 hover:border-[#534AB7] rounded-xl p-3 transition-colors"
                >
                  {m.word_type && (
                    <span className="text-xs font-medium bg-[#EEEDFE] text-[#534AB7] px-2 py-0.5 rounded-full">
                      {m.word_type} · {m.word_type_tr}
                    </span>
                  )}
                  {m.meaning_tr && <p className="text-sm font-medium text-[#185FA5] mt-1.5">{m.meaning_tr}</p>}
                  {m.meaning_en && <p className="text-xs text-gray-600 mt-0.5">{m.meaning_en}</p>}
                  {m.examples?.[0] && <p className="text-xs text-gray-400 italic mt-1">{m.examples[0]}</p>}
                </button>
              ))}
            </div>
          )}

          {/* Diğer alanlar */}
          {textFields.map(({ field, label, ph }) => (
            <div key={field}>
              <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
              <input
                type="text"
                value={(form as Record<string, string>)[field] ?? ''}
                onChange={(e) => set(field, e.target.value)}
                placeholder={ph}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#378ADD] focus:border-transparent transition"
              />
            </div>
          ))}

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Liste</label>
            <select
              value={form.list_type}
              onChange={(e) => set('list_type', e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#378ADD] focus:border-transparent transition"
            >
              <option value="active">Aktif</option>
              <option value="passive">Pasif</option>
            </select>
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>}
        </form>

        <div className="flex gap-3 px-6 pb-6">
          <button type="button" onClick={onClose} className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">İptal</button>
          <button onClick={handleSubmit as never} disabled={saving} className="flex-1 bg-[#378ADD] hover:bg-[#2d73c4] disabled:opacity-50 text-white rounded-xl py-2.5 text-sm font-medium transition-colors">
            {saving ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Ana Sayfa ─────────────────────────────────────────────────
export default function WordsPage() {
  const [words, setWords]         = useState<Word[]>([]);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [search, setSearch]       = useState('');
  const [statusFilter, setStatus] = useState('');
  const [listFilter, setList]     = useState('');
  const [loading, setLoading]     = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editWord, setEditWord]     = useState<Word | null>(null);

  const PER_PAGE = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await wordsApi.getAll({
        page, per_page: PER_PAGE,
        search: search || undefined,
        status: statusFilter || undefined,
        list_type: listFilter || undefined,
      });
      setWords(res.items);
      setTotal(res.total);
    } finally { setLoading(false); }
  }, [page, search, statusFilter, listFilter]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (data: WordCreate) => { await wordsApi.create(data); setPage(1); load(); };
  const handleUpdate = async (data: WordCreate) => { if (!editWord) return; await wordsApi.update(editWord.id, data as WordUpdate); load(); };
  const handleDelete = async (id: string) => {
    if (!confirm('Bu kelimeyi silmek istediğine emin misin?')) return;
    await wordsApi.delete(id); load();
  };

  const pages = Math.ceil(total / PER_PAGE);
  const learned  = words.filter((w) => w.status === 'learned').length;
  const learning = words.filter((w) => w.status === 'learning').length;
  const archived = words.filter((w) => w.status === 'archived').length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kelimeler</h1>
          <p className="text-sm text-gray-500 mt-0.5">Toplam {total} kelime</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 bg-[#378ADD] hover:bg-[#2d73c4] text-white rounded-xl px-4 py-2.5 text-sm font-medium shadow-sm transition-colors">
          <Plus className="w-4 h-4" />Kelime Ekle
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Öğrenilenler',  value: learned,  bg: 'bg-[#EAF3DE]', text: 'text-[#3B6D11]', icon: <CheckCircle2 className="w-5 h-5" /> },
          { label: 'Öğreniliyor',   value: learning, bg: 'bg-[#FAEEDA]', text: 'text-[#854F0B]', icon: <RefreshCw className="w-5 h-5" /> },
          { label: 'Arşivlenenler', value: archived, bg: 'bg-gray-100',  text: 'text-gray-500',  icon: <Archive className="w-5 h-5" /> },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl ${s.bg} ${s.text} flex items-center justify-center`}>{s.icon}</div>
            <div><p className="text-xl font-bold text-gray-900">{s.value}</p><p className="text-xs text-gray-500">{s.label}</p></div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Kelime ara…" value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#378ADD] focus:border-transparent w-56 transition" />
        </div>
        <select value={statusFilter} onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#378ADD] focus:border-transparent transition">
          <option value="">Tüm durumlar</option>
          <option value="learning">Öğreniliyor</option>
          <option value="learned">Öğrenildi</option>
          <option value="archived">Arşivlendi</option>
        </select>
        <select value={listFilter} onChange={(e) => { setList(e.target.value); setPage(1); }}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#378ADD] focus:border-transparent transition">
          <option value="">Tüm listeler</option>
          <option value="active">Aktif</option>
          <option value="passive">Pasif</option>
        </select>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-gray-400"><RefreshCw className="w-6 h-6 animate-spin" /><span className="text-sm">Yükleniyor…</span></div>
        </div>
      ) : words.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 flex flex-col items-center justify-center gap-3 text-gray-400">
          <BookOpen className="w-10 h-10 text-gray-200" />
          <p className="text-sm font-medium">Kelime bulunamadı</p>
          <p className="text-xs text-gray-400">Filtreleri değiştir veya yeni kelime ekle.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {['Kelime','Anlam','Türkçe','Tür','Durum','Tekrar','Sonraki',''].map((h, i) => (
                  <th key={i} className={`px-4 py-3 ${h==='Tekrar'?'text-center':'text-left'} text-xs font-semibold text-gray-400 uppercase tracking-wide`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {words.map((w) => (
                <tr key={w.id} className="border-b border-gray-50 last:border-0 hover:bg-slate-50 transition-colors group">
                  <td className="px-4 py-3"><span className="font-semibold text-gray-900">{w.word}</span></td>
                  <td className="px-4 py-3 text-gray-600 max-w-[200px] truncate">{w.meaning}</td>
                  <td className="px-4 py-3 text-gray-500">{w.meaning_tr ?? '—'}</td>
                  <td className="px-4 py-3">
                    {w.word_type ? <span className="text-xs font-medium bg-[#EEEDFE] text-[#534AB7] px-2 py-0.5 rounded-full">{w.word_type}</span> : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={w.status} /></td>
                  <td className="px-4 py-3 text-center"><span className="text-xs font-semibold text-gray-700 bg-gray-100 rounded-full px-2 py-0.5">{w.repetition_count}</span></td>
                  <td className="px-4 py-3 text-xs text-gray-400">{w.next_review_at ? new Date(w.next_review_at).toLocaleDateString('tr-TR', { day:'numeric', month:'short' }) : '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setEditWord(w)} className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-[#185FA5] hover:bg-[#E6F1FB] transition-colors" title="Düzenle"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleDelete(w.id)} className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors" title="Sil"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">{total} kelime · Sayfa {page} / {pages}</span>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors">← Önceki</button>
            <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages} className="px-3 py-1.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors">Sonraki →</button>
          </div>
        </div>
      )}

      {showCreate && (
        <WordFormModal title="Yeni Kelime Ekle" allowLookup onSave={handleCreate} onClose={() => setShowCreate(false)} />
      )}
      {editWord && (
        <WordFormModal
          title="Kelimeyi Düzenle"
          allowLookup
          initial={{
            word: editWord.word, meaning: editWord.meaning,
            meaning_tr: editWord.meaning_tr ?? '', meaning_en: editWord.meaning_en ?? '',
            example: editWord.example ?? '', word_type: editWord.word_type ?? '',
            list_type: editWord.list_type,
          }}
          onSave={handleUpdate}
          onClose={() => setEditWord(null)}
        />
      )}
    </div>
  );
}
