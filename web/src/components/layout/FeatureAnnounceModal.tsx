'use client';

// FeatureAnnounceModal.tsx — uygulama-içi "3 Yeni Özellik" poster alert'i
// (27 Kasım 2026 kullanıcı talebi: Görsel Tara / Çengel Bulmaca / Lingo
// duyurusu, sosyal medya posterinin web/mobil karşılığı). Kullanıcının
// ANA DİLİNDE (useLocale() → locale, profiles.native_lang'den gelir,
// bkz. lib/i18n.tsx) gösterilir — "ana dili TR olmayanlar için hangi ana
// dilde user varsa onun dilinde paylaşılmalı" talebi gereği 10 dilin
// tamamı desteklenir (bkz. lib/featureAnnounceStrings.ts). Sosyal medya
// paylaşımı AYRI ve sadece TR statik posterle yapılır, bu bileşenle ilgisi
// yoktur.
//
// Gösterim kuralı: OnboardingTour.tsx ile AYNI localStorage "görüldü"
// deseni (bkz. SEEN_KEY), versiyonlu anahtar (…_v1) ileride yeni bir
// duyuru için anahtarı bir üst versiyona çıkarıp bileşeni yeniden
// kullanabilmek içindir. Henüz onboarding turunu görmemiş YENİ kullanıcılara
// bu kartı ÜST ÜSTE göstermemek için onboarding'in "görüldü" bayrağı da
// kontrol edilir — onboarding bitmeden bu kart hiç açılmaz, bir sonraki
// girişte (onboarding görüldükten sonra) normal şekilde açılır.
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, Grid3x3, ScanText } from 'lucide-react';
import { useLocale } from '@/lib/i18n';
import { FEATURE_ANNOUNCE_STRINGS } from '@/lib/featureAnnounceStrings';

const SEEN_KEY = 'lexis_feature_announce_lingo_update_v1_seen';
const ONBOARDING_SEEN_KEY = 'lexis_onboarding_tour_seen';

const NAVY_DARK = '#081A3D';
const NAVY = '#0B1E46';
const PRIMARY = '#378ADD';
const ACCENT = '#534AB7';
const LINGO_BG = 'rgba(253,234,240,0.12)';
const LINGO_FG = '#FF6FA5';

function LingoTilesIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="1.5" y="9" width="4.5" height="6" rx="1.2" fill="currentColor" stroke="none" />
      <rect x="7" y="9" width="4.5" height="6" rx="1.2" />
      <rect x="12.5" y="9" width="4.5" height="6" rx="1.2" fill="currentColor" stroke="none" />
      <rect x="18" y="9" width="4.5" height="6" rx="1.2" />
    </svg>
  );
}

export function FeatureAnnounceModal() {
  const { locale } = useLocale();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const s = FEATURE_ANNOUNCE_STRINGS[locale] ?? FEATURE_ANNOUNCE_STRINGS.tr;

  useEffect(() => {
    try {
      if (!localStorage.getItem(ONBOARDING_SEEN_KEY)) return; // onboarding turu bitmeden gösterme
      if (!localStorage.getItem(SEEN_KEY)) setOpen(true);
    } catch {
      /* localStorage kapalı olabilir — kritik değil, sessizce atla */
    }
  }, []);

  const dismiss = () => {
    setOpen(false);
    try {
      localStorage.setItem(SEEN_KEY, '1');
    } catch {
      /* yut */
    }
  };

  if (!open) return null;

  const rows = [
    { icon: <ScanText size={22} />, bg: `${PRIMARY}26`, fg: PRIMARY, title: s.scanTitle, desc: s.scanDesc },
    { icon: <LingoTilesIcon />, bg: LINGO_BG, fg: LINGO_FG, title: s.lingoTitle, desc: s.lingoDesc },
    { icon: <Grid3x3 size={22} />, bg: `${ACCENT}26`, fg: ACCENT, title: s.crosswordTitle, desc: s.crosswordDesc },
  ];

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={dismiss}
    >
      <div
        className="relative w-full max-w-md rounded-3xl overflow-hidden text-white shadow-2xl"
        style={{ background: `linear-gradient(160deg, ${NAVY} 0%, ${NAVY_DARK} 100%)`, border: '1px solid rgba(255,255,255,0.1)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={dismiss}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition"
          aria-label="close"
        >
          <X size={16} />
        </button>

        <div className="px-7 pt-8 pb-7">
          <span
            className="inline-block text-[11px] font-bold tracking-wider rounded-full px-3 py-1 mb-4"
            style={{ color: PRIMARY, background: `${PRIMARY}1f`, border: `1px solid ${PRIMARY}59` }}
          >
            {s.kicker}
          </span>
          <h2 className="text-2xl font-extrabold leading-snug mb-2">{s.headline}</h2>
          <p className="text-sm text-slate-300 mb-6">{s.subtitle}</p>

          <div className="flex flex-col gap-3 mb-7">
            {rows.map((r) => (
              <div key={r.title} className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
                <div className="flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: r.bg, color: r.fg }}>
                  {r.icon}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold">{r.title}</p>
                  <p className="text-xs text-slate-400 mt-0.5 leading-snug">{r.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => {
              dismiss();
              router.push('/game');
            }}
            className="w-full rounded-full font-bold text-[15px] py-3.5 text-white transition hover:brightness-110"
            style={{ background: `linear-gradient(120deg, ${PRIMARY}, ${ACCENT})` }}
          >
            {s.cta}
          </button>
          <button onClick={dismiss} className="w-full text-center text-xs text-slate-400 mt-3 hover:text-slate-200 transition">
            {s.dismiss}
          </button>
        </div>
      </div>
    </div>
  );
}
