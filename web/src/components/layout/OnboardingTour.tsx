// components/layout/OnboardingTour.tsx — Madde 3 (Görsel/GUI), "onboarding
// turu" (24 Eylül 2026), Madde 3'ün son alt kalemi. Backend'de veya
// `profiles` tablosunda onboarding ile ilgili hiçbir alan/flag olmadığı
// doğrulandı (grep taraması) — bu yüzden tamamen istemci taraflı, tek
// seferlik bir tur: dashboard'daki `showPlacementAlert` modalıyla AYNI
// görsel dil (fixed inset-0 backdrop-blur ortalanmış kart) ve
// `lexis_recheck_dismissed_at` ile AYNI localStorage "görüldü" deseni
// kullanılıyor — backend değişikliği gerekmedi.
//
// İlk ziyarette otomatik açılır (localStorage bayrağı yoksa), 5 adımlık
// bir tanıtım gösterir (Maddeler 2 ve 3'te tamamlanan tüm özellikleri
// özetler: kelime ekleme, oyunlar, flashcards, ilerleme takibi), ve
// "?" yardım butonuyla istenildiği zaman tekrar açılabilir.
'use client';

import { useEffect, useState } from 'react';
import { X, BookOpen, Gamepad2, Layers, TrendingUp, HelpCircle } from 'lucide-react';
import { Mascot } from './Mascot';
import { useLocale, type Locale } from '@/lib/i18n';

const SEEN_KEY = 'lexis_onboarding_tour_seen';

interface Step {
  icon: 'mascot' | typeof BookOpen;
  title: Partial<Record<Locale, string>>;
  desc: Partial<Record<Locale, string>>;
}

const STEPS: Step[] = [
  {
    icon: 'mascot',
    title: { tr: "Lexis'e Hoş Geldin!", en: 'Welcome to Lexis!' },
    desc: {
      tr: 'Kişisel dil öğrenme yolculuğun burada başlıyor. Sana uygulamayı hızlıca tanıtalım.',
      en: 'Your personal language-learning journey starts here. Let us give you a quick tour.',
    },
  },
  {
    icon: BookOpen,
    title: { tr: 'Kelime Listeni Oluştur', en: 'Build Your Word List' },
    desc: {
      tr: 'Öğrenmek istediğin kelimeleri ekle — Lexis onları CEFR seviyene göre organize etsin.',
      en: 'Add the words you want to learn — Lexis organizes them by your CEFR level.',
    },
  },
  {
    icon: Gamepad2,
    title: { tr: 'Oyunlarla Pratik Yap', en: 'Practice with Games' },
    desc: {
      tr: 'Wordle, rol yapma diyalogları, cümle kurma ve günlük Kelime Avı ile eğlenerek öğren.',
      en: 'Learn while having fun with Wordle, roleplay dialogues, sentence building, and daily Word Hunt.',
    },
  },
  {
    icon: Layers,
    title: { tr: "Flashcard'larla Tekrar Et", en: 'Review with Flashcards' },
    desc: {
      tr: 'Kartları çevir, telaffuzu dinle — akıllı tekrar algoritması seni doğru zamanda hatırlatır.',
      en: 'Flip the cards, listen to pronunciation — smart spaced repetition reminds you at the right time.',
    },
  },
  {
    icon: TrendingUp,
    title: { tr: 'İlerlemeni Takip Et', en: 'Track Your Progress' },
    desc: {
      tr: 'Seviye rozetin, XP’in ve çalışma takvimin ile gelişimini her an görebilirsin.',
      en: 'See your level badge, XP, and activity calendar to watch yourself improve.',
    },
  },
];

const UI: Partial<Record<Locale, { next: string; back: string; skip: string; start: string; help: string }>> = {
  tr: { next: 'İleri', back: 'Geri', skip: 'Geç', start: 'Başlayalım!', help: 'Tanıtım turu' },
  en: { next: 'Next', back: 'Back', skip: 'Skip', start: "Let's start!", help: 'Guided tour' },
};

function markSeen() {
  try {
    localStorage.setItem(SEEN_KEY, '1');
  } catch {
    /* localStorage kapalı olabilir (gizli sekme vb.) — sessizce yut */
  }
}

export function OnboardingTour() {
  const { locale } = useLocale();
  const ui = UI[locale] ?? UI.tr!;
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    try {
      if (!localStorage.getItem(SEEN_KEY)) setOpen(true);
    } catch {
      /* localStorage okunamıyorsa turu hiç gösterme — kritik değil */
    }
  }, []);

  function close() {
    markSeen();
    setOpen(false);
    setStep(0);
  }

  return (
    <>
      {/* Turu istendiğinde tekrar açan yardım butonu — diğer üst-bar
          ikonlarıyla (bildirim, mesaj, tema) aynı stil. */}
      <button
        type="button"
        onClick={() => {
          setStep(0);
          setOpen(true);
        }}
        aria-label={ui.help}
        title={ui.help}
        className="w-9 h-9 rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 flex items-center justify-center text-gray-500 dark:text-slate-400 hover:text-blue-600 hover:dark:text-blue-400 hover:border-blue-200 transition-colors shrink-0"
      >
        <HelpCircle className="w-4 h-4" />
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm p-6 relative">
            <button
              type="button"
              onClick={close}
              aria-label={ui.skip}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex flex-col items-center text-center gap-4 mt-2">
              {STEPS[step].icon === 'mascot' ? (
                <Mascot mood="celebrate" size={72} />
              ) : (
                <div className="w-14 h-14 rounded-2xl bg-[#EAF4FD] dark:bg-blue-500/10 flex items-center justify-center">
                  {(() => {
                    const Icon = STEPS[step].icon as typeof BookOpen;
                    return <Icon className="w-7 h-7 text-[#378ADD]" />;
                  })()}
                </div>
              )}

              <div>
                <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100 mb-2">
                  {STEPS[step].title[locale] ?? STEPS[step].title.tr}
                </h2>
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  {STEPS[step].desc[locale] ?? STEPS[step].desc.tr}
                </p>
              </div>

              {/* Adım noktaları */}
              <div className="flex items-center gap-1.5">
                {STEPS.map((_, i) => (
                  <span
                    key={i}
                    className="rounded-full transition-all"
                    style={{
                      width: i === step ? 18 : 6,
                      height: 6,
                      backgroundColor: i === step ? '#378ADD' : '#D8E7F7',
                    }}
                  />
                ))}
              </div>

              <div className="w-full flex items-center gap-2 mt-1">
                {step > 0 && (
                  <button
                    type="button"
                    onClick={() => setStep((s) => s - 1)}
                    className="flex-1 text-sm font-medium px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-50 hover:dark:bg-slate-800 transition-colors"
                  >
                    {ui.back}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => (step === STEPS.length - 1 ? close() : setStep((s) => s + 1))}
                  className="flex-1 text-sm font-medium px-4 py-2.5 rounded-xl text-white transition-colors"
                  style={{ background: '#378ADD' }}
                >
                  {step === STEPS.length - 1 ? ui.start : ui.next}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
