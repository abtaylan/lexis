/**
 * scheduleTemplates.ts
 *
 * Madde 4 — Çalışma programı şablonları (diğer diller) kapsamında hazırlandı.
 * (19 Ağustos 2026)
 *
 * Bu dosya, `web/src/app/(app)/schedule/page.tsx` içindeki mevcut EN şablonlarıyla
 * AYNI haftalık yapıyı (Yoğun / Dengeli / Hafif), her dil için gerçek ve
 * öğrenci-dostu (learner-friendly) kaynaklarla eşleştirir.
 *
 * BİLİNÇLİ TASARIM KARARI: page.tsx henüz düzenlenmedi. Uygulamada şu an
 * sadece EN→TR çifti aktif (bkz. supabase/seeds/001_languages.sql) ve
 * kullanıcı bazlı "hedef dil" seçimi backend'de henüz yok. Bu dosya, o
 * altyapı kurulduğunda (kullanıcı bir öğrenme dili seçtiğinde) page.tsx'in
 * `TEMPLATES` / `TASK_LINKS` sabitlerinin yerine `resolveTemplate(...)` ile
 * kolayca bağlanabilmesi için "hazır" içerik olarak tutuluyor — mevcut,
 * test edilmiş sayfayı riske atmamak adına page.tsx şimdilik değiştirilmedi.
 *
 * NOT: Linkler Ağustos 2026'da web araması ile spot-check edildi. Canlıya
 * almadan / kullanıcıya göstermeden önce tek tek tıklanıp doğrulanması,
 * özellikle DE/FR podcast linkleri ve JA haber linki için önerilir.
 */

export type LangCode = 'en' | 'de' | 'fr' | 'es' | 'it' | 'ar' | 'ru' | 'ja';

export const SUPPORTED_TEMPLATE_LANGS: LangCode[] = [
  'en', 'de', 'fr', 'es', 'it', 'ar', 'ru', 'ja',
];

// Sağdan sola (RTL) render gerektiren diller — UI entegrasyonunda hatırlatma amaçlı.
export const RTL_LANGS: LangCode[] = ['ar'];

export interface ScheduleTemplateItem {
  day_of_week: number; // 0=Pazar, 1=Pazartesi, ..., 6=Cumartesi
  time_slot: string;
  activity: string;
  duration_min: number;
}

export interface ResolvedScheduleTemplateItem extends ScheduleTemplateItem {
  link_url: string;
  activity_key?: string;
}

export interface ScheduleTemplateDef {
  id: 'yogun' | 'orta' | 'hafif';
  name: string;
  desc: string;
  icon: 'flame' | 'zap' | 'coffee';
  accent: string;
  items: ScheduleTemplateItem[];
}

// ── Dilden bağımsız haftalık yapı ──────────────────────────────
// page.tsx'teki TEMPLATES ile birebir aynı gün/saat/süre yapısı; sadece
// link_url burada yok, resolveTemplate() ile dile göre çözülüyor.
export const TEMPLATE_DEFS: ScheduleTemplateDef[] = [
  {
    id: 'yogun',
    name: 'Yoğun',
    desc: 'Her gün, sabah + akşam · ~hızlı ilerleme',
    icon: 'flame',
    accent: '#854F0B',
    items: [
      { day_of_week: 1, time_slot: '08:00', activity: 'Teknik Makale', duration_min: 30 },
      { day_of_week: 1, time_slot: '20:00', activity: 'LingoClip', duration_min: 20 },
      { day_of_week: 2, time_slot: '08:00', activity: 'Haber Okuma', duration_min: 30 },
      { day_of_week: 2, time_slot: '20:00', activity: 'Video Analizi', duration_min: 25 },
      { day_of_week: 3, time_slot: '08:00', activity: 'Teknik Makale', duration_min: 30 },
      { day_of_week: 3, time_slot: '20:00', activity: 'Podcast', duration_min: 20 },
      { day_of_week: 4, time_slot: '08:00', activity: 'Haber Okuma', duration_min: 30 },
      { day_of_week: 4, time_slot: '20:00', activity: 'Video Analizi', duration_min: 25 },
      { day_of_week: 5, time_slot: '08:00', activity: 'Teknik Makale', duration_min: 30 },
      { day_of_week: 5, time_slot: '20:00', activity: 'LingoClip', duration_min: 20 },
      { day_of_week: 6, time_slot: '10:00', activity: 'Dizi/Film', duration_min: 45 },
      { day_of_week: 0, time_slot: '10:00', activity: 'Genel Tekrar', duration_min: 45 },
    ],
  },
  {
    id: 'orta',
    name: 'Dengeli',
    desc: 'Hafta içi günde 1 oturum · sürdürülebilir',
    icon: 'zap',
    accent: '#185FA5',
    items: [
      { day_of_week: 1, time_slot: '19:00', activity: 'Teknik Makale', duration_min: 30 },
      { day_of_week: 2, time_slot: '19:00', activity: 'Haber Okuma', duration_min: 30 },
      { day_of_week: 3, time_slot: '19:00', activity: 'Video Analizi', duration_min: 25 },
      { day_of_week: 4, time_slot: '19:00', activity: 'LingoClip', duration_min: 20 },
      { day_of_week: 5, time_slot: '19:00', activity: 'Genel Tekrar', duration_min: 30 },
    ],
  },
  {
    id: 'hafif',
    name: 'Hafif',
    desc: 'Haftada 3 gün · yoğun programa alternatif',
    icon: 'coffee',
    accent: '#3B6D11',
    items: [
      { day_of_week: 1, time_slot: '20:00', activity: 'Kelime Tekrarı', duration_min: 20 },
      { day_of_week: 3, time_slot: '20:00', activity: 'Video Analizi', duration_min: 25 },
      { day_of_week: 6, time_slot: '11:00', activity: 'Genel Tekrar', duration_min: 40 },
    ],
  },
];

// ── Dil bazlı kaynak linkleri ───────────────────────────────────
// LingoClip, Genel Tekrar, Dizi/Film, Kelime Tekrarı: uygulama-genel /
// dilden bağımsız araçlar, tüm dillerde aynı. Diğerleri dile özgü,
// öğrenci-dostu (learner-friendly) kaynaklar.
export const TASK_LINKS_BY_LANG: Record<LangCode, Record<string, string>> = {
  en: {
    'Teknik Makale': 'https://medium.com/tag/english-learning',
    'Haber Okuma': 'https://www.bbc.co.uk/learningenglish',
    'LingoClip': 'https://lingoclip.com/',
    'Video Analizi': 'https://www.youtube.com/@TEDEd',
    'Genel Tekrar': 'https://quizlet.com/',
    'Kelime Tekrarı': '',
    'Dizi/Film': 'https://www.netflix.com/',
    'Podcast': 'https://www.bbc.co.uk/learningenglish/english/features/6-minute-english',
  },
  de: {
    'Teknik Makale': 'https://www.dw.com/de/deutsch-lernen/s-2469',
    'Haber Okuma': 'https://www.nachrichtenleicht.de/',
    'LingoClip': 'https://lingoclip.com/',
    'Video Analizi': 'https://www.youtube.com/c/EasyGerman/videos',
    'Genel Tekrar': 'https://quizlet.com/',
    'Kelime Tekrarı': '',
    'Dizi/Film': 'https://www.netflix.com/',
    'Podcast': 'https://podcasts.apple.com/de/podcast/langsam-gesprochene-nachrichten-audios-dw-deutsch-lernen/id282930329',
  },
  fr: {
    'Teknik Makale': 'https://savoirs.rfi.fr/fr/apprendre-enseigner',
    'Haber Okuma': 'https://www.lemonde.fr/',
    'LingoClip': 'https://lingoclip.com/',
    'Video Analizi': 'https://www.youtube.com/@EasyFrench',
    'Genel Tekrar': 'https://quizlet.com/',
    'Kelime Tekrarı': '',
    'Dizi/Film': 'https://www.netflix.com/',
    'Podcast': 'https://www.rfi.fr/fr/podcasts/',
  },
  es: {
    'Teknik Makale': 'https://www.newsinslowspanish.com/',
    'Haber Okuma': 'https://www.bbc.com/mundo',
    'LingoClip': 'https://lingoclip.com/',
    'Video Analizi': 'https://www.youtube.com/@EasySpanish',
    'Genel Tekrar': 'https://quizlet.com/',
    'Kelime Tekrarı': '',
    'Dizi/Film': 'https://www.netflix.com/',
    'Podcast': 'https://www.newsinslowspanish.com/home/news/beginner',
  },
  it: {
    'Teknik Makale': 'https://www.newsinslowitalian.com/',
    'Haber Okuma': 'https://www.ansa.it/',
    'LingoClip': 'https://lingoclip.com/',
    'Video Analizi': 'https://www.youtube.com/@EasyItalian',
    'Genel Tekrar': 'https://quizlet.com/',
    'Kelime Tekrarı': '',
    'Dizi/Film': 'https://www.netflix.com/',
    'Podcast': 'https://www.newsinslowitalian.com/home/news/beginner',
  },
  ar: {
    'Teknik Makale': 'https://www.aljazeera.net/',
    'Haber Okuma': 'https://www.bbc.com/arabic',
    'LingoClip': 'https://lingoclip.com/',
    'Video Analizi': 'https://www.youtube.com/@LearnArabicwithMaha',
    'Genel Tekrar': 'https://quizlet.com/',
    'Kelime Tekrarı': '',
    'Dizi/Film': 'https://www.netflix.com/',
    'Podcast': 'https://www.arabicpod101.com/',
  },
  ru: {
    'Teknik Makale': 'https://www.russianwithmax.com/',
    'Haber Okuma': 'https://www.bbc.com/russian',
    'LingoClip': 'https://lingoclip.com/',
    'Video Analizi': 'https://www.youtube.com/@EasyRussianVideos',
    'Genel Tekrar': 'https://quizlet.com/',
    'Kelime Tekrarı': '',
    'Dizi/Film': 'https://www.netflix.com/',
    'Podcast': 'https://textsinslowrussian.com/',
  },
  ja: {
    'Teknik Makale': 'https://nhkeasier.com/',
    'Haber Okuma': 'https://www3.nhk.or.jp/news/easy/',
    'LingoClip': 'https://lingoclip.com/',
    'Video Analizi': 'https://www.youtube.com/@JapanesePod101',
    'Genel Tekrar': 'https://quizlet.com/',
    'Kelime Tekrarı': '',
    'Dizi/Film': 'https://www.netflix.com/',
    'Podcast': 'https://www.japanesepod101.com/',
  },
};

// activity (görünen ad) -> learning_resources.category / activity_key eşlemesi.
// backend/schedule_templates.py'deki ACTIVITY_KEY_MAP ile birebir aynı tutulmalı
// (bkz. app/api/routes/schedule.py ACTIVITY_CATEGORIES). Bu olmadan backend
// _resolve_resource() hiç çalışmıyor ve öğe, oluşturulduğu andaki dile sabit
// link_url'de kalıp kullanıcı sonradan öğrenilen dilini değiştirse bile
// güncellenmiyordu — teknik borç maddesiydi, burada çözüldü.
//
// LingoClip ve Dizi/Film BİLİNÇLİ olarak eşleme DIŞINDA bırakıldı:
// TASK_LINKS_BY_LANG'da her dilde birebir aynı (dilden bağımsız) sabit URL
// kullanıyorlar, dinamik çöz(ül)meye ihtiyaçları yok. Kelime Tekrarı için de
// karşılık gelen bir learning_resources kategorisi yok.
const ACTIVITY_KEY_MAP: Record<string, string> = {
  'Teknik Makale': 'technical_article',
  'Haber Okuma': 'news_reading',
  'Video Analizi': 'video_analysis',
  'Podcast': 'audio_practice',
  'Genel Tekrar': 'general_review',
};

/** Bir şablon tanımını, verilen dilin linkleriyle birleştirip API'ye gönderilebilir hale getirir. */
export function resolveTemplate(def: ScheduleTemplateDef, lang: LangCode): ResolvedScheduleTemplateItem[] {
  const links = TASK_LINKS_BY_LANG[lang] ?? TASK_LINKS_BY_LANG.en;
  return def.items.map((it) => ({
    ...it,
    link_url: links[it.activity] ?? '',
    activity_key: ACTIVITY_KEY_MAP[it.activity],
  }));
}
