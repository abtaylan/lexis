'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Plus, Trash2, X, Clock, CalendarDays, ExternalLink, Loader2,
  Sparkles, Flame, Zap, Coffee, Check,
} from 'lucide-react';
import { scheduleApi } from '@/lib/api';
import { useAuth } from '@/store/auth';
import { useT } from '@/lib/i18n';
import { TEMPLATE_DEFS, resolveTemplate, SUPPORTED_TEMPLATE_LANGS, type LangCode } from '@/lib/scheduleTemplates';
import type { ScheduleItem, ScheduleCreate } from '@/types';

// Gün adları artık useT() ile çözülüyor; sıra (0=Pazar…6=Cumartesi) TEMPLATE_DEFS'teki
// day_of_week ile birebir eşleşecek şekilde korunuyor.
const DAY_KEYS = [
  'schedule.days.sun', 'schedule.days.mon', 'schedule.days.tue', 'schedule.days.wed',
  'schedule.days.thu', 'schedule.days.fri', 'schedule.days.sat',
];

const DAY_COLORS = [
  { bg: 'bg-[#FAEEDA]', text: 'text-[#854F0B]', dot: 'bg-[#854F0B]' },
  { bg: 'bg-[#E6F1FB]', text: 'text-[#185FA5]', dot: 'bg-[#185FA5]' },
  { bg: 'bg-[#EAF3DE]', text: 'text-[#3B6D11]', dot: 'bg-[#3B6D11]' },
  { bg: 'bg-[#EEEDFE]', text: 'text-[#534AB7]', dot: 'bg-[#534AB7]' },
  { bg: 'bg-[#E1F5EE]', text: 'text-[#0F6E56]', dot: 'bg-[#0F6E56]' },
  { bg: 'bg-[#E6F1FB]', text: 'text-[#185FA5]', dot: 'bg-[#185FA5]' },
  { bg: 'bg-[#FAEEDA]', text: 'text-[#854F0B]', dot: 'bg-[#854F0B]' },
];

// ── Hazır program şablonları ──────────────────────────────────
// Gün/saat/süre yapısı ve dile göre kaynak linkleri artık lib/scheduleTemplates.ts'ten
// (Madde 4 — çok dilli program şablonları) geliyor; kullanıcının aktif öğrenme diline
// göre resolveTemplate() ile çözülüyor. Bkz. buildTemplates() aşağıda.
interface Template {
  id: string;
  name: string;
  desc: string;
  icon: React.ReactNode;
  accent: string;
  items: ScheduleCreate[];
}

const TEMPLATE_ICONS: Record<'flame' | 'zap' | 'coffee', React.ReactNode> = {
  flame: <Flame className="w-5 h-5" />,
  zap: <Zap className="w-5 h-5" />,
  coffee: <Coffee className="w-5 h-5" />,
};

function buildTemplates(
  learningLang: string | undefined,
  t: (key: string, vars?: Record<string, string | number>) => string
): Template[] {
  const lang: LangCode = SUPPORTED_TEMPLATE_LANGS.includes(learningLang as LangCode)
    ? (learningLang as LangCode)
    : 'en';
  return TEMPLATE_DEFS.map((def) => ({
    id: def.id,
    // Şablon adı/açıklaması kullanıcının arayüz diline göre çevrilir (def.id
    // her zaman yogun/orta/hafif olduğundan i18n.ts'teki template.* anahtarlarıyla eşleşir).
    name: t(`template.${def.id}.name`),
    desc: t(`template.${def.id}.desc`),
    icon: TEMPLATE_ICONS[def.icon],
    accent: def.accent,
    items: resolveTemplate(def, lang),
  }));
}

const EMPTY_FORM: ScheduleCreate = { day_of_week: 1, time_slot: '09:00', activity: '', duration_min: 30, link_url: '' };

// ── Şablon seçici modal ───────────────────────────────────────
function TemplateModal({ templates, hasExisting, onApply, onClose }: {
  templates: Template[];
  hasExisting: boolean;
  onApply: (t: Template, replace: boolean) => Promise<void>;
  onClose: () => void;
}) {
  const { t } = useT();
  const [applying, setApplying] = useState<string | null>(null);
  const [replace, setReplace]   = useState(true);

  const apply = async (tpl: Template) => {
    setApplying(tpl.id);
    try { await onApply(tpl, replace); onClose(); }
    finally { setApplying(null); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100 sticky top-0 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#EEEDFE] flex items-center justify-center"><Sparkles className="w-4 h-4 text-[#534AB7]" /></div>
            <h2 className="text-base font-semibold text-gray-900">{t('templateModal.title')}</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors"><X className="w-4 h-4" /></button>
        </div>

        <div className="px-6 py-4 space-y-3">
          <p className="text-sm text-gray-500">{t('templateModal.desc')}</p>

          {hasExisting && (
            <label className="flex items-center gap-2 text-sm text-gray-600 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 cursor-pointer">
              <input type="checkbox" checked={replace} onChange={(e) => setReplace(e.target.checked)} className="accent-[#534AB7]" />
              {t('templateModal.replaceExisting')}
            </label>
          )}

          {templates.map((tpl) => (
            <div key={tpl.id} className="border border-gray-100 rounded-2xl p-4 hover:border-gray-200 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${tpl.accent}1a`, color: tpl.accent }}>{tpl.icon}</div>
                  <div>
                    <p className="font-semibold text-gray-900">{tpl.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{tpl.desc}</p>
                    <p className="text-xs text-gray-400 mt-1">{tpl.items.length} {t('templateModal.itemsPerWeek')}</p>
                  </div>
                </div>
                <button
                  onClick={() => apply(tpl)}
                  disabled={applying !== null}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-white shrink-0 transition-colors disabled:opacity-50"
                  style={{ backgroundColor: tpl.accent }}
                >
                  {applying === tpl.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  {t('templateModal.apply')}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Etkinlik ekleme modalı ────────────────────────────────────
function ScheduleModal({ onSave, onClose }: { onSave: (data: ScheduleCreate) => Promise<void>; onClose: () => void }) {
  const { t } = useT();
  const [form, setForm] = useState<ScheduleCreate>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (f: keyof ScheduleCreate, v: string | number) => setForm((p) => ({ ...p, [f]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.activity.trim()) { setError(t('activityModal.required')); return; }
    setSaving(true);
    try { await onSave(form); onClose(); }
    catch (err: any) { setError(err?.response?.data?.detail || t('activityModal.saveError')); }
    finally { setSaving(false); }
  };

  const inputCls = "w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#378ADD] focus:border-transparent transition";

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#E1F5EE] flex items-center justify-center"><CalendarDays className="w-4 h-4 text-[#0F6E56]" /></div>
            <h2 className="text-base font-semibold text-gray-900">{t('activityModal.title')}</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">{t('activityModal.day')}</label>
            <select value={form.day_of_week} onChange={(e) => set('day_of_week', Number(e.target.value))} className={inputCls}>
              {DAY_KEYS.map((key, i) => <option key={i} value={i}>{t(key)}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-medium text-gray-600 mb-1">{t('activityModal.time')}</label><input type="time" value={form.time_slot} onChange={(e) => set('time_slot', e.target.value)} className={inputCls} /></div>
            <div><label className="block text-xs font-medium text-gray-600 mb-1">{t('activityModal.duration')}</label><input type="number" min={5} step={5} value={form.duration_min} onChange={(e) => set('duration_min', Number(e.target.value))} className={inputCls} /></div>
          </div>
          <div><label className="block text-xs font-medium text-gray-600 mb-1">{t('activityModal.activity')}</label><input type="text" value={form.activity} onChange={(e) => set('activity', e.target.value)} placeholder={t('activityModal.activityPlaceholder')} className={inputCls} /></div>
          <div><label className="block text-xs font-medium text-gray-600 mb-1">{t('activityModal.link')}</label><input type="url" value={form.link_url ?? ''} onChange={(e) => set('link_url', e.target.value)} placeholder="https://…" className={inputCls} /></div>
          {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>}
        </form>
        <div className="flex gap-3 px-6 pb-6">
          <button onClick={onClose} className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">{t('activityModal.cancel')}</button>
          <button onClick={handleSubmit as never} disabled={saving} className="flex-1 bg-[#378ADD] hover:bg-[#2d73c4] disabled:opacity-50 text-white rounded-xl py-2.5 text-sm font-medium transition-colors">{saving ? t('activityModal.saving') : t('activityModal.save')}</button>
        </div>
      </div>
    </div>
  );
}

// ── Ana sayfa ─────────────────────────────────────────────────
export default function SchedulePage() {
  const { user } = useAuth();
  const { t } = useT();
  const [items, setItems]     = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal]       = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);

  // Kullanıcının aktif öğrenme diline göre şablon kaynak linkleri (Madde 4);
  // şablon adı/açıklaması ise arayüz diline (native_lang) göre çevrilir.
  const templates = useMemo(() => buildTemplates(user?.learning_lang, t), [user?.learning_lang, t]);

  const load = async () => {
    setLoading(true);
    try { setItems(await scheduleApi.getAll()); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const handleCreate = async (data: ScheduleCreate) => { await scheduleApi.create(data); load(); };
  const handleDelete = async (id: string) => {
    if (!confirm(t('schedule.deleteConfirm'))) return;
    await scheduleApi.delete(id); load();
  };
  const handleToggle = async (item: ScheduleItem) => {
    try { await scheduleApi.update(item.id, { is_active: !item.is_active }); load(); } catch { /* sessiz */ }
  };

  const applyTemplate = async (tpl: Template, replace: boolean) => {
    if (replace) {
      await Promise.all(items.map((it) => scheduleApi.delete(it.id).catch(() => {})));
    }
    // Sıralı ekle (rate-limit'e takılmamak için)
    for (const it of tpl.items) {
      await scheduleApi.create(it).catch(() => {});
    }
    await load();
  };

  const grouped = DAY_KEYS.map((key, i) => ({
    day: t(key), dayIndex: i, color: DAY_COLORS[i],
    items: items.filter((it) => it.day_of_week === i).sort((a, b) => a.time_slot.localeCompare(b.time_slot)),
  }));

  const totalItems = items.filter((it) => it.is_active !== false).length;
  const activeDays = grouped.filter((g) => g.items.length > 0).length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('schedule.title')}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{t('schedule.summary', { days: activeDays, items: totalItems })}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowTemplates(true)} className="flex items-center gap-2 bg-[#EEEDFE] hover:bg-[#e0ddfc] text-[#534AB7] rounded-xl px-4 py-2.5 text-sm font-medium transition-colors">
            <Sparkles className="w-4 h-4" />{t('schedule.templatesBtn')}
          </button>
          <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-[#378ADD] hover:bg-[#2d73c4] text-white rounded-xl px-4 py-2.5 text-sm font-medium shadow-sm transition-colors">
            <Plus className="w-4 h-4" />{t('schedule.addActivityBtn')}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-gray-400"><Loader2 className="w-6 h-6 animate-spin" /><span className="text-sm">{t('app.loading')}</span></div>
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 flex flex-col items-center justify-center gap-3 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#EEEDFE] flex items-center justify-center"><Sparkles className="w-7 h-7 text-[#534AB7]" /></div>
          <p className="text-sm font-medium text-gray-700">{t('schedule.empty.title')}</p>
          <p className="text-xs text-gray-400 max-w-xs">{t('schedule.empty.desc')}</p>
          <div className="flex gap-2 mt-2">
            <button onClick={() => setShowTemplates(true)} className="flex items-center gap-2 bg-[#534AB7] hover:bg-[#473fa0] text-white rounded-xl px-4 py-2 text-sm font-medium transition-colors">
              <Sparkles className="w-4 h-4" />{t('schedule.chooseTemplateBtn')}
            </button>
            <button onClick={() => setShowModal(true)} className="flex items-center gap-2 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl px-4 py-2 text-sm font-medium transition-colors">
              <Plus className="w-4 h-4" />{t('schedule.manualAddBtn')}
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
                  {isEmpty ? <p className="text-xs text-gray-400 text-center py-2">{t('schedule.noActivity')}</p> : dayItems.map((item) => (
                    <div key={item.id} className={`rounded-xl p-3 transition-colors group ${item.is_active === false ? 'bg-gray-50 opacity-50' : 'bg-slate-50 hover:bg-slate-100'}`}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1 text-xs font-semibold text-[#185FA5]"><Clock className="w-3 h-3" />{item.time_slot}<span className="font-normal text-gray-400 ml-0.5">· {item.duration_min}{t('schedule.minutesShort')}</span></div>
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
      {showTemplates && (
        <TemplateModal
          templates={templates}
          hasExisting={items.length > 0}
          onApply={applyTemplate}
          onClose={() => setShowTemplates(false)}
        />
      )}
    </div>
  );
}
