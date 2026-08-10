'use client';

import { useEffect, useState } from 'react';
import {
  Plus, Trash2, X, Clock, CalendarDays, ExternalLink, Loader2,
  Sparkles, Flame, Zap, Coffee, Check, Headphones, BookOpen,
  GraduationCap, Save, Star, User as UserIcon,
} from 'lucide-react';
import { scheduleApi } from '@/lib/api';
import type { ScheduleItem, ScheduleCreate, ScheduleTemplate, ScheduleTemplateItem } from '@/types';

const DAYS = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

const DAY_COLORS = [
  { bg: 'bg-[#FAEEDA]', text: 'text-[#854F0B]', dot: 'bg-[#854F0B]' },
  { bg: 'bg-[#E6F1FB]', text: 'text-[#185FA5]', dot: 'bg-[#185FA5]' },
  { bg: 'bg-[#EAF3DE]', text: 'text-[#3B6D11]', dot: 'bg-[#3B6D11]' },
  { bg: 'bg-[#EEEDFE]', text: 'text-[#534AB7]', dot: 'bg-[#534AB7]' },
  { bg: 'bg-[#E1F5EE]', text: 'text-[#0F6E56]', dot: 'bg-[#0F6E56]' },
  { bg: 'bg-[#E6F1FB]', text: 'text-[#185FA5]', dot: 'bg-[#185FA5]' },
  { bg: 'bg-[#FAEEDA]', text: 'text-[#854F0B]', dot: 'bg-[#854F0B]' },
];

const TASK_LINKS: Record<string, string> = {
  'Teknik Makale': 'https://medium.com/tag/english-learning',
  'Haber Okuma': 'https://www.bbc.co.uk/learningenglish',
  'LingoClip': 'https://lingoclip.com/',
  'Video Analizi': 'https://www.youtube.com/@TEDEd',
  'Genel Tekrar': 'https://quizlet.com/',
  'Kelime Tekrarı': '',
  'Dizi/Film': 'https://www.netflix.com/',
  'Podcast': 'https://www.bbc.co.uk/learningenglish/english/features/6-minute-english',
  // Aşama 4: yeni kaynak-bazlı etkinlikler
  'WordBox English': '',
  'News in Levels': 'https://www.newsinlevels.com/',
  'More to Read': '',
  'Max and Mia Podcast': 'https://learnenglish.britishcouncil.org/general-english/audio-series/max-and-mia',
  'YÖKDİL Sözlük Kitabı': '',
  'Voice of America': 'https://learningenglish.voanews.com/',
  "Luke's English Podcast": 'https://teacherluke.co.uk/',
};

// ── Hazır program şablonları ──────────────────────────────────
interface Template {
  id: string;
  name: string;
  desc: string;
  icon: React.ReactNode;
  accent: string;
  items: ScheduleCreate[];
}

const link = (a: string) => TASK_LINKS[a] ?? '';

const TEMPLATES: Template[] = [
  {
    id: 'yogun',
    name: 'Yoğun',
    desc: 'Her gün, sabah + akşam · ~hızlı ilerleme',
    icon: <Flame className="w-5 h-5" />,
    accent: '#854F0B',
    items: [
      { day_of_week: 1, time_slot: '08:00', activity: 'Teknik Makale', duration_min: 30, link_url: link('Teknik Makale') },
      { day_of_week: 1, time_slot: '20:00', activity: 'LingoClip', duration_min: 20, link_url: link('LingoClip') },
      { day_of_week: 2, time_slot: '08:00', activity: 'Haber Okuma', duration_min: 30, link_url: link('Haber Okuma') },
      { day_of_week: 2, time_slot: '20:00', activity: 'Video Analizi', duration_min: 25, link_url: link('Video Analizi') },
      { day_of_week: 3, time_slot: '08:00', activity: 'Teknik Makale', duration_min: 30, link_url: link('Teknik Makale') },
      { day_of_week: 3, time_slot: '20:00', activity: 'Podcast', duration_min: 20, link_url: link('Podcast') },
      { day_of_week: 4, time_slot: '08:00', activity: 'Haber Okuma', duration_min: 30, link_url: link('Haber Okuma') },
      { day_of_week: 4, time_slot: '20:00', activity: 'Video Analizi', duration_min: 25, link_url: link('Video Analizi') },
      { day_of_week: 5, time_slot: '08:00', activity: 'Teknik Makale', duration_min: 30, link_url: link('Teknik Makale') },
      { day_of_week: 5, time_slot: '20:00', activity: 'LingoClip', duration_min: 20, link_url: link('LingoClip') },
      { day_of_week: 6, time_slot: '10:00', activity: 'Dizi/Film', duration_min: 45, link_url: link('Dizi/Film') },
      { day_of_week: 0, time_slot: '10:00', activity: 'Genel Tekrar', duration_min: 45, link_url: link('Genel Tekrar') },
    ],
  },
  {
    id: 'orta',
    name: 'Dengeli',
    desc: 'Hafta içi günde 1 oturum · sürdürülebilir',
    icon: <Zap className="w-5 h-5" />,
    accent: '#185FA5',
    items: [
      { day_of_week: 1, time_slot: '19:00', activity: 'Teknik Makale', duration_min: 30, link_url: link('Teknik Makale') },
      { day_of_week: 2, time_slot: '19:00', activity: 'Haber Okuma', duration_min: 30, link_url: link('Haber Okuma') },
      { day_of_week: 3, time_slot: '19:00', activity: 'Video Analizi', duration_min: 25, link_url: link('Video Analizi') },
      { day_of_week: 4, time_slot: '19:00', activity: 'LingoClip', duration_min: 20, link_url: link('LingoClip') },
      { day_of_week: 5, time_slot: '19:00', activity: 'Genel Tekrar', duration_min: 30, link_url: link('Genel Tekrar') },
    ],
  },
  {
    id: 'hafif',
    name: 'Hafif',
    desc: 'Haftada 3 gün · yoğun programa alternatif',
    icon: <Coffee className="w-5 h-5" />,
    accent: '#3B6D11',
    items: [
      { day_of_week: 1, time_slot: '20:00', activity: 'Kelime Tekrarı', duration_min: 20, link_url: '' },
      { day_of_week: 3, time_slot: '20:00', activity: 'Video Analizi', duration_min: 25, link_url: link('Video Analizi') },
      { day_of_week: 6, time_slot: '11:00', activity: 'Genel Tekrar', duration_min: 40, link_url: link('Genel Tekrar') },
    ],
  },
  // ── Aşama 4: kaynak-bazlı yeni alternatifler ──────────────
  {
    id: 'podcast',
    name: 'Podcast Ağırlıklı',
    desc: 'Dinleme becerisine odaklı · haftada 4 oturum',
    icon: <Headphones className="w-5 h-5" />,
    accent: '#B7451B',
    items: [
      { day_of_week: 1, time_slot: '20:00', activity: 'Voice of America', duration_min: 20, link_url: link('Voice of America') },
      { day_of_week: 2, time_slot: '20:00', activity: "Luke's English Podcast", duration_min: 30, link_url: link("Luke's English Podcast") },
      { day_of_week: 4, time_slot: '20:00', activity: 'Max and Mia Podcast', duration_min: 15, link_url: link('Max and Mia Podcast') },
      { day_of_week: 6, time_slot: '11:00', activity: 'LingoClip', duration_min: 20, link_url: link('LingoClip') },
    ],
  },
  {
    id: 'okuma',
    name: 'Okuma Ağırlıklı',
    desc: 'Okuma-kelime dağarcığı odaklı · haftada 4 oturum',
    icon: <BookOpen className="w-5 h-5" />,
    accent: '#0F6E56',
    items: [
      { day_of_week: 1, time_slot: '19:30', activity: 'News in Levels', duration_min: 20, link_url: link('News in Levels') },
      { day_of_week: 3, time_slot: '19:30', activity: 'More to Read', duration_min: 25, link_url: link('More to Read') },
      { day_of_week: 5, time_slot: '19:30', activity: 'Teknik Makale', duration_min: 25, link_url: link('Teknik Makale') },
      { day_of_week: 0, time_slot: '11:00', activity: 'WordBox English', duration_min: 20, link_url: link('WordBox English') },
    ],
  },
  {
    id: 'yokdil',
    name: 'YÖKDİL Hazırlık',
    desc: 'Sınav odaklı · yoğun kelime + okuma',
    icon: <GraduationCap className="w-5 h-5" />,
    accent: '#6D1B7B',
    items: [
      { day_of_week: 1, time_slot: '08:00', activity: 'YÖKDİL Sözlük Kitabı', duration_min: 30, link_url: link('YÖKDİL Sözlük Kitabı') },
      { day_of_week: 2, time_slot: '08:00', activity: 'Teknik Makale', duration_min: 25, link_url: link('Teknik Makale') },
      { day_of_week: 3, time_slot: '08:00', activity: 'YÖKDİL Sözlük Kitabı', duration_min: 30, link_url: link('YÖKDİL Sözlük Kitabı') },
      { day_of_week: 4, time_slot: '08:00', activity: 'News in Levels', duration_min: 20, link_url: link('News in Levels') },
      { day_of_week: 5, time_slot: '08:00', activity: 'YÖKDİL Sözlük Kitabı', duration_min: 30, link_url: link('YÖKDİL Sözlük Kitabı') },
      { day_of_week: 6, time_slot: '10:00', activity: 'Genel Tekrar', duration_min: 45, link_url: link('Genel Tekrar') },
    ],
  },
];

const EMPTY_FORM: ScheduleCreate = { day_of_week: 1, time_slot: '09:00', activity: '', duration_min: 30, link_url: '' };

// ── Şablon seçici modal ───────────────────────────────────────
function TemplateModal({ hasExisting, onApply, onClose }: {
  hasExisting: boolean;
  onApply: (items: ScheduleCreate[], replace: boolean) => Promise<void>;
  onClose: () => void;
}) {
  const [applying, setApplying] = useState<string | null>(null);
  const [replace, setReplace] = useState(true);
  const [customTemplates, setCustomTemplates] = useState<ScheduleTemplate[]>([]);
  const [loadingCustom, setLoadingCustom] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    scheduleApi.getTemplates()
      .then(setCustomTemplates)
      .catch(() => setCustomTemplates([]))
      .finally(() => setLoadingCustom(false));
  }, []);

  const apply = async (id: string, items: ScheduleCreate[]) => {
    setApplying(id);
    try { await onApply(items, replace); onClose(); }
    finally { setApplying(null); }
  };

  const removeCustom = async (id: string) => {
    if (!confirm('Bu özel şablonu silmek istediğine emin misin?')) return;
    setDeletingId(id);
    try {
      await scheduleApi.deleteTemplate(id);
      setCustomTemplates((prev) => prev.filter((t) => t.id !== id));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100 sticky top-0 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#EEEDFE] flex items-center justify-center"><Sparkles className="w-4 h-4 text-[#534AB7]" /></div>
            <h2 className="text-base font-semibold text-gray-900">Hazır Program Şablonları</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors"><X className="w-4 h-4" /></button>
        </div>

        <div className="px-6 py-4 space-y-3">
          <p className="text-sm text-gray-500">Çalışma sıklığına veya odak alanına göre bir şablon seç — program otomatik oluşturulur, sonra dilediğin gibi düzenleyebilirsin.</p>

          {hasExisting && (
            <label className="flex items-center gap-2 text-sm text-gray-600 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 cursor-pointer">
              <input type="checkbox" checked={replace} onChange={(e) => setReplace(e.target.checked)} className="accent-[#534AB7]" />
              Mevcut programı sil, şablonla değiştir
            </label>
          )}

          {TEMPLATES.map((t) => (
            <div key={t.id} className="border border-gray-100 rounded-2xl p-4 hover:border-gray-200 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${t.accent}1a`, color: t.accent }}>{t.icon}</div>
                  <div>
                    <p className="font-semibold text-gray-900">{t.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{t.desc}</p>
                    <p className="text-xs text-gray-400 mt-1">{t.items.length} etkinlik / hafta</p>
                  </div>
                </div>
                <button
                  onClick={() => apply(t.id, t.items)}
                  disabled={applying !== null}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-white shrink-0 transition-colors disabled:opacity-50"
                  style={{ backgroundColor: t.accent }}
                >
                  {applying === t.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Uygula
                </button>
              </div>
            </div>
          ))}

          {/* ── Kişiye özel şablonlar ── */}
          <div className="pt-2">
            <div className="flex items-center gap-2 mb-2">
              <UserIcon className="w-4 h-4 text-gray-400" />
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Şablonlarım</p>
            </div>

            {loadingCustom ? (
              <div className="flex items-center gap-2 text-sm text-gray-400 px-1 py-2">
                <Loader2 className="w-4 h-4 animate-spin" />Yükleniyor…
              </div>
            ) : customTemplates.length === 0 ? (
              <p className="text-xs text-gray-400 px-1 py-2">
                Henüz kendi şablonun yok. Bir program oluşturup "Şablon Olarak Kaydet" ile burada saklayabilirsin.
              </p>
            ) : (
              <div className="space-y-3">
                {customTemplates.map((t) => (
                  <div key={t.id} className="border border-gray-100 rounded-2xl p-4 hover:border-gray-200 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-[#FEF3E7] text-[#B7791F]"><Star className="w-5 h-5" /></div>
                        <div>
                          <p className="font-semibold text-gray-900">{t.name}</p>
                          <p className="text-xs text-gray-400 mt-1">{t.items.length} etkinlik / hafta</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => removeCustom(t.id)}
                          disabled={deletingId === t.id}
                          className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                          title="Şablonu sil"
                        >
                          {deletingId === t.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => apply(t.id, t.items)}
                          disabled={applying !== null}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-white bg-[#B7791F] hover:bg-[#9c6519] transition-colors disabled:opacity-50"
                        >
                          {applying === t.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                          Uygula
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Etkinlik ekleme modalı ────────────────────────────────────
function ScheduleModal({ onSave, onClose }: { onSave: (data: ScheduleCreate) => Promise<void>; onClose: () => void }) {
  const [form, setForm] = useState<ScheduleCreate>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (f: keyof ScheduleCreate, v: string | number) => setForm((p) => ({ ...p, [f]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.activity.trim()) { setError('Aktivite zorunludur.'); return; }
    setSaving(true);
    try { await onSave(form); onClose(); }
    catch (err: any) { setError(err?.response?.data?.detail || 'Kaydedilemedi.'); }
    finally { setSaving(false); }
  };

  const inputCls = "w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#378ADD] focus:border-transparent transition";

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#E1F5EE] flex items-center justify-center"><CalendarDays className="w-4 h-4 text-[#0F6E56]" /></div>
            <h2 className="text-base font-semibold text-gray-900">Etkinlik Ekle</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Gün</label>
            <select value={form.day_of_week} onChange={(e) => set('day_of_week', Number(e.target.value))} className={inputCls}>
              {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-medium text-gray-600 mb-1">Saat</label><input type="time" value={form.time_slot} onChange={(e) => set('time_slot', e.target.value)} className={inputCls} /></div>
            <div><label className="block text-xs font-medium text-gray-600 mb-1">Süre (dk)</label><input type="number" min={5} step={5} value={form.duration_min} onChange={(e) => set('duration_min', Number(e.target.value))} className={inputCls} /></div>
          </div>
          <div><label className="block text-xs font-medium text-gray-600 mb-1">Aktivite *</label><input type="text" value={form.activity} onChange={(e) => set('activity', e.target.value)} placeholder="örn. Flashcard çalışması" className={inputCls} /></div>
          <div><label className="block text-xs font-medium text-gray-600 mb-1">Link (opsiyonel)</label><input type="url" value={form.link_url ?? ''} onChange={(e) => set('link_url', e.target.value)} placeholder="https://…" className={inputCls} /></div>
          {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>}
        </form>
        <div className="flex gap-3 px-6 pb-6">
          <button onClick={onClose} className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">İptal</button>
          <button onClick={handleSubmit as never} disabled={saving} className="flex-1 bg-[#378ADD] hover:bg-[#2d73c4] disabled:opacity-50 text-white rounded-xl py-2.5 text-sm font-medium transition-colors">{saving ? 'Kaydediliyor…' : 'Kaydet'}</button>
        </div>
      </div>
    </div>
  );
}

// ── Şablon olarak kaydet modalı ───────────────────────────────
function SaveTemplateModal({ items, onSaved, onClose }: {
  items: ScheduleItem[];
  onSaved: () => void;
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!name.trim()) { setError('Şablon adı zorunludur.'); return; }
    setSaving(true);
    setError('');
    try {
      const templateItems: ScheduleTemplateItem[] = items
        .filter((it) => it.is_active !== false)
        .map((it) => ({
          day_of_week: it.day_of_week,
          time_slot: it.time_slot,
          activity: it.activity,
          duration_min: it.duration_min,
          link_url: it.link_url,
        }));
      await scheduleApi.createTemplate({ name: name.trim(), items: templateItems });
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Şablon kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#FEF3E7] flex items-center justify-center"><Star className="w-4 h-4 text-[#B7791F]" /></div>
            <h2 className="text-base font-semibold text-gray-900">Şablon Olarak Kaydet</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-6 py-4 space-y-3">
          <p className="text-xs text-gray-500">Şu anki programını, dilediğin zaman tekrar uygulayabileceğin isimli bir şablon olarak kaydeder.</p>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Şablon adı *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="örn. Benim Sınav Programım"
              autoFocus
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#378ADD] focus:border-transparent transition"
            />
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>}
        </div>
        <div className="flex gap-3 px-6 pb-6">
          <button onClick={onClose} className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">İptal</button>
          <button onClick={handleSave} disabled={saving} className="flex-1 bg-[#B7791F] hover:bg-[#9c6519] disabled:opacity-50 text-white rounded-xl py-2.5 text-sm font-medium transition-colors">
            {saving ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Ana sayfa ─────────────────────────────────────────────────
export default function SchedulePage() {
  const [items, setItems] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);

  const load = async () => {
    setLoading(true);
    try { setItems(await scheduleApi.getAll()); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const handleCreate = async (data: ScheduleCreate) => { await scheduleApi.create(data); load(); };
  const handleDelete = async (id: string) => {
    if (!confirm('Bu programı silmek istediğine emin misin?')) return;
    await scheduleApi.delete(id); load();
  };
  const handleToggle = async (item: ScheduleItem) => {
    try { await scheduleApi.update(item.id, { is_active: !item.is_active }); load(); } catch { /* sessiz */ }
  };

  const applyTemplate = async (templateItems: ScheduleCreate[], replace: boolean) => {
    if (replace) {
      await Promise.all(items.map((it) => scheduleApi.delete(it.id).catch(() => {})));
    }
    // Sıralı ekle (rate-limit'e takılmamak için)
    for (const it of templateItems) {
      await scheduleApi.create(it).catch(() => {});
    }
    await load();
  };

  const grouped = DAYS.map((day, i) => ({
    day, dayIndex: i, color: DAY_COLORS[i],
    items: items.filter((it) => it.day_of_week === i).sort((a, b) => a.time_slot.localeCompare(b.time_slot)),
  }));

  const totalItems = items.filter((it) => it.is_active !== false).length;
  const activeDays = grouped.filter((g) => g.items.length > 0).length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Çalışma Programı</h1>
          <p className="text-sm text-gray-500 mt-0.5">{activeDays} aktif gün · {totalItems} etkinlik</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {items.length > 0 && (
            <button onClick={() => setShowSaveTemplate(true)} className="flex items-center gap-2 bg-[#FEF3E7] hover:bg-[#fbe8cf] text-[#B7791F] rounded-xl px-4 py-2.5 text-sm font-medium transition-colors">
              <Save className="w-4 h-4" />Şablon Olarak Kaydet
            </button>
          )}
          <button onClick={() => setShowTemplates(true)} className="flex items-center gap-2 bg-[#EEEDFE] hover:bg-[#e0ddfc] text-[#534AB7] rounded-xl px-4 py-2.5 text-sm font-medium transition-colors">
            <Sparkles className="w-4 h-4" />Şablonlar
          </button>
          <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-[#378ADD] hover:bg-[#2d73c4] text-white rounded-xl px-4 py-2.5 text-sm font-medium shadow-sm transition-colors">
            <Plus className="w-4 h-4" />Etkinlik Ekle
          </button>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-gray-400"><Loader2 className="w-6 h-6 animate-spin" /><span className="text-sm">Yükleniyor…</span></div>
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 flex flex-col items-center justify-center gap-3 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#EEEDFE] flex items-center justify-center"><Sparkles className="w-7 h-7 text-[#534AB7]" /></div>
          <p className="text-sm font-medium text-gray-700">Henüz program yok</p>
          <p className="text-xs text-gray-400 max-w-xs">Hazır bir şablonla hızlıca başla ya da kendi etkinliklerini ekle.</p>
          <div className="flex gap-2 mt-2">
            <button onClick={() => setShowTemplates(true)} className="flex items-center gap-2 bg-[#534AB7] hover:bg-[#473fa0] text-white rounded-xl px-4 py-2 text-sm font-medium transition-colors">
              <Sparkles className="w-4 h-4" />Şablon Seç
            </button>
            <button onClick={() => setShowModal(true)} className="flex items-center gap-2 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl px-4 py-2 text-sm font-medium transition-colors">
              <Plus className="w-4 h-4" />Elle Ekle
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {grouped.map(({ day, color, items: dayItems }) => {
            const isEmpty = dayItems.length === 0;
            return (
              <div key={day} className={`bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden ${isEmpty ? 'opacity-50' : ''}`}>
                <div className={`px-4 py-3 flex items-center justify-between ${color.bg}`}>
                  <div className="flex items-center gap-2"><span className={`w-2 h-2 rounded-full ${color.dot}`} /><span className={`text-xs font-semibold ${color.text}`}>{day}</span></div>
                  {dayItems.length > 0 && <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full bg-white/60 ${color.text}`}>{dayItems.length}</span>}
                </div>
                <div className="p-3 space-y-2">
                  {isEmpty ? <p className="text-xs text-gray-400 text-center py-2">Etkinlik yok</p> : dayItems.map((item) => (
                    <div key={item.id} className={`rounded-xl p-3 transition-colors group ${item.is_active === false ? 'bg-gray-50 opacity-50' : 'bg-slate-50 hover:bg-slate-100'}`}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1 text-xs font-semibold text-[#185FA5]"><Clock className="w-3 h-3" />{item.time_slot}<span className="font-normal text-gray-400 ml-0.5">· {item.duration_min}dk</span></div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleToggle(item)} className={`w-7 h-4 rounded-full transition-colors shrink-0 ${item.is_active !== false ? 'bg-[#378ADD]' : 'bg-gray-300'}`} title="Aç/Kapat" />
                          <button onClick={() => handleDelete(item.id)} className="w-6 h-6 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 className="w-3 h-3" /></button>
                        </div>
                      </div>
                      <p className="text-sm font-medium text-gray-800 truncate">{item.activity}</p>
                      {item.link_url && (
                        <a href={item.link_url} target="_blank" rel="noopener noreferrer" className="mt-1 flex items-center gap-1 text-xs text-gray-400 hover:text-[#185FA5] transition-colors truncate">
                          <ExternalLink className="w-3 h-3 shrink-0" /><span className="truncate">{item.link_url.replace(/^https?:\/\//, '')}</span>
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && <ScheduleModal onSave={handleCreate} onClose={() => setShowModal(false)} />}
      {showTemplates && <TemplateModal hasExisting={items.length > 0} onApply={applyTemplate} onClose={() => setShowTemplates(false)} />}
      {showSaveTemplate && <SaveTemplateModal items={items} onSaved={() => {}} onClose={() => setShowSaveTemplate(false)} />}
    </div>
  );
}
