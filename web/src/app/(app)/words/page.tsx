'use client';

import { useState, useCallback } from 'react';
import {
  Search, Plus, Star, Trash2, Pencil, BookOpen,
  Volume2, ChevronLeft, ChevronRight, X
} from 'lucide-react';
import { useWords, useDeleteWord, useToggleFavorite, useCreateWord, useLookupWord } from '@/hooks/useWords';
import {
  Button, Input, Card, Badge, Spinner,
  EmptyState, Select, Textarea
} from '@/components/ui';
import { PageHeader } from '@/components/layout/PageHeader';
import type { Word, WordCreate } from '@/types';
import { clsx } from 'clsx';

// ─── Add Word Modal ───────────────────────────────────────────────────────────
function AddWordModal({ onClose }: { onClose: () => void }) {
  const [wordInput, setWordInput] = useState('');
  const [form, setForm] = useState<WordCreate>({
    word: '', definition: '', translation: '', example_sentence: '',
    part_of_speech: '', difficulty_level: 3, tags: [],
  });
  const [tagInput, setTagInput] = useState('');
  const [lookupWord, setLookupWord] = useState('');

  const { data: dictEntry, isLoading: dictLoading } = useLookupWord(lookupWord);
  const createWord = useCreateWord();

  const handleLookup = () => {
    if (wordInput.trim()) {
      setLookupWord(wordInput.trim());
      setForm((p) => ({ ...p, word: wordInput.trim() }));
    }
  };

  // Auto-fill from dictionary
  const applyDict = () => {
    if (dictEntry) {
      setForm((p) => ({
        ...p,
        word: dictEntry.word || p.word,
        definition: dictEntry.definition || p.definition,
        pronunciation: dictEntry.pronunciation,
        part_of_speech: dictEntry.part_of_speech || p.part_of_speech,
        example_sentence: dictEntry.example_sentence || p.example_sentence,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createWord.mutateAsync(form);
      onClose();
    } catch {/* handled by mutation */}
  };

  const diffLabels = ['', 'Çok Kolay', 'Kolay', 'Orta', 'Zor', 'Çok Zor'];

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card padding="lg" className="w-full max-w-lg shadow-2xl animate-scale-in max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-slate-800">Yeni Kelime Ekle</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
            <X size={18} />
          </button>
        </div>

        {/* Dictionary lookup */}
        <div className="flex gap-2 mb-5 p-4 bg-slate-50 rounded-xl">
          <Input
            placeholder="Cambridge'de ara…"
            value={wordInput}
            onChange={(e) => setWordInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleLookup())}
            className="flex-1"
            wrapperClassName="flex-1"
          />
          <Button onClick={handleLookup} variant="secondary" loading={dictLoading} size="md">
            Ara
          </Button>
        </div>

        {dictEntry && (
          <div className="mb-5 p-4 border border-sky-100 bg-sky-50 rounded-xl text-sm space-y-1.5">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-slate-700">{dictEntry.word}
                {dictEntry.pronunciation && (
                  <span className="ml-2 text-slate-400 font-normal font-mono text-xs">/{dictEntry.pronunciation}/</span>
                )}
              </p>
              {dictEntry.part_of_speech && (
                <Badge variant="primary" size="sm">{dictEntry.part_of_speech}</Badge>
              )}
            </div>
            <p className="text-slate-600">{dictEntry.definition}</p>
            {dictEntry.example_sentence && (
              <p className="text-slate-400 italic">"{dictEntry.example_sentence}"</p>
            )}
            <Button size="sm" variant="secondary" onClick={applyDict}>
              Formu Doldur
            </Button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Kelime"
            placeholder="e.g. ephemeral"
            value={form.word}
            onChange={(e) => setForm((p) => ({ ...p, word: e.target.value }))}
            required
          />
          <Textarea
            label="Tanım (İngilizce)"
            placeholder="lasting for a very short time"
            value={form.definition}
            onChange={(e) => setForm((p) => ({ ...p, definition: e.target.value }))}
            rows={2}
          />
          <Input
            label="Türkçe Karşılık"
            placeholder="geçici, kısa ömürlü"
            value={form.translation}
            onChange={(e) => setForm((p) => ({ ...p, translation: e.target.value }))}
          />
          <Textarea
            label="Örnek Cümle"
            placeholder="Fame in social media can be ephemeral."
            value={form.example_sentence}
            onChange={(e) => setForm((p) => ({ ...p, example_sentence: e.target.value }))}
            rows={2}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Telaffuz"
              placeholder="/ɪˈfem.ər.əl/"
              value={form.pronunciation ?? ''}
              onChange={(e) => setForm((p) => ({ ...p, pronunciation: e.target.value }))}
            />
            <Select
              label="Zorluk"
              value={form.difficulty_level}
              onChange={(e) => setForm((p) => ({ ...p, difficulty_level: Number(e.target.value) as 1|2|3|4|5 }))}
              options={[1,2,3,4,5].map((v) => ({ value: v, label: diffLabels[v] }))}
            />
          </div>

          {/* Tags */}
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1.5">Etiketler</label>
            <div className="flex gap-2">
              <Input
                placeholder="Etiket ekle…"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault();
                    const t = tagInput.trim();
                    if (t && !(form.tags ?? []).includes(t)) {
                      setForm((p) => ({ ...p, tags: [...(p.tags ?? []), t] }));
                    }
                    setTagInput('');
                  }
                }}
                wrapperClassName="flex-1"
              />
            </div>
            {(form.tags ?? []).length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {(form.tags ?? []).map((t) => (
                  <span key={t} className="inline-flex items-center gap-1 bg-sky-100 text-sky-700 text-xs rounded-full px-2.5 py-1">
                    {t}
                    <button type="button" onClick={() => setForm((p) => ({ ...p, tags: p.tags!.filter((x) => x !== t) }))}>
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">İptal</Button>
            <Button type="submit" className="flex-1" loading={createWord.isPending}>Kaydet</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

// ─── Word Row ─────────────────────────────────────────────────────────────────
function WordRow({ word, onDelete }: { word: Word; onDelete: (id: string) => void }) {
  const toggleFav = useToggleFavorite();
  const [expanded, setExpanded] = useState(false);

  const diffColors: Record<number, 'success' | 'primary' | 'warning' | 'danger' | 'default'> = {
    1: 'success', 2: 'success', 3: 'primary', 4: 'warning', 5: 'danger',
  };

  return (
    <div className="border-b border-slate-50 last:border-0">
      <div
        className="flex items-center gap-3 py-3.5 cursor-pointer hover:bg-slate-50/70 rounded-xl px-2 -mx-2 transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="font-semibold text-slate-800">{word.word}</span>
            {word.pronunciation && (
              <span className="text-xs text-slate-400 font-mono">/{word.pronunciation}/</span>
            )}
            {word.part_of_speech && (
              <Badge variant="outline" size="sm">{word.part_of_speech}</Badge>
            )}
          </div>
          {word.translation && (
            <p className="text-sm text-slate-500 truncate">{word.translation}</p>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {word.next_review && new Date(word.next_review) <= new Date() && (
            <Badge variant="warning" size="sm">Tekrar zamanı</Badge>
          )}
          <Badge variant={diffColors[word.difficulty_level]} size="sm">
            {'★'.repeat(word.difficulty_level)}
          </Badge>
          <button
            onClick={(e) => { e.stopPropagation(); toggleFav.mutate(word.id); }}
            className={clsx(
              'p-1.5 rounded-lg transition-colors',
              word.is_favorite ? 'text-amber-400 hover:text-amber-500' : 'text-slate-300 hover:text-amber-300'
            )}
          >
            <Star size={15} fill={word.is_favorite ? 'currentColor' : 'none'} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(word.id); }}
            className="p-1.5 rounded-lg text-slate-300 hover:text-red-400 hover:bg-red-50 transition-colors"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="pb-3 px-2 space-y-2 animate-fade-in">
          {word.definition && (
            <p className="text-sm text-slate-600 bg-slate-50 rounded-lg px-3 py-2">{word.definition}</p>
          )}
          {word.example_sentence && (
            <p className="text-sm text-slate-400 italic px-3">"{word.example_sentence}"</p>
          )}
          {(word.tags ?? []).length > 0 && (
            <div className="flex flex-wrap gap-1 px-3">
              {word.tags.map((t) => (
                <Badge key={t} variant="default" size="sm">{t}</Badge>
              ))}
            </div>
          )}
          <div className="flex gap-3 px-3 text-xs text-slate-400">
            <span>Tekrar: {word.repetitions}×</span>
            <span>Aralık: {word.interval} gün</span>
            <span>Kolaylık: {word.ease_factor.toFixed(1)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function WordsPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showAdd, setShowAdd] = useState(false);
  const [sort, setSort] = useState('created_at');

  const { data, isLoading } = useWords({ page, per_page: 20, search, sort });
  const deleteWord = useDeleteWord();

  const handleDelete = useCallback((id: string) => {
    if (confirm('Bu kelimeyi silmek istiyor musun?')) {
      deleteWord.mutate(id);
    }
  }, [deleteWord]);

  return (
    <div>
      <PageHeader
        title="Kelime Listem"
        subtitle={data ? `${data.total} kelime` : ''}
        action={
          <Button onClick={() => setShowAdd(true)} icon={<Plus size={16} />}>
            Kelime Ekle
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <Input
          placeholder="Kelime ara…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          leftIcon={<Search size={16} />}
          wrapperClassName="flex-1"
        />
        <Select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          options={[
            { value: 'created_at', label: 'En Yeni' },
            { value: 'word', label: 'A-Z' },
            { value: 'next_review', label: 'Tekrar Tarihi' },
            { value: 'difficulty_level', label: 'Zorluk' },
          ]}
          wrapperClassName="w-40"
        />
      </div>

      {/* Word list */}
      <Card padding="md">
        {isLoading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : !data?.items.length ? (
          <EmptyState
            icon={<BookOpen size={28} />}
            title="Henüz kelime yok"
            description="İlk kelimeni ekleyerek öğrenmeye başla."
            action={<Button onClick={() => setShowAdd(true)} icon={<Plus size={16} />} size="sm">Kelime Ekle</Button>}
          />
        ) : (
          <div>
            {data.items.map((w) => (
              <WordRow key={w.id} word={w} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </Card>

      {/* Pagination */}
      {data && data.pages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-4">
          <Button
            variant="ghost" size="sm"
            onClick={() => setPage((p) => p - 1)}
            disabled={page === 1}
            icon={<ChevronLeft size={16} />}
          >Önceki</Button>
          <span className="text-sm text-slate-400">{page} / {data.pages}</span>
          <Button
            variant="ghost" size="sm"
            onClick={() => setPage((p) => p + 1)}
            disabled={page === data.pages}
            icon={<ChevronRight size={16} />}
            iconPosition="right"
          >Sonraki</Button>
        </div>
      )}

      {showAdd && <AddWordModal onClose={() => setShowAdd(false)} />}
    </div>
  );
}
