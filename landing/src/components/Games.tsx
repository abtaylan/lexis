'use client';

import {
  ListChecks,
  Keyboard,
  Type,
  Ear,
  Zap,
  Shuffle,
  Rows3,
  PencilLine,
  Scale,
  Link2,
  type LucideIcon,
} from 'lucide-react';
import { useLocale, type TranslationKey } from '@/lib/i18n';
import { Reveal } from './Reveal';

/**
 * Oyunlar bölümü — "02 Oyunla pekiştir" teaser'ının hemen altına, Features'ın
 * ardından geliyor (bkz. page.tsx): tek satırlık genel geçer tanıtımın
 * ("6 oyun modu" şeklindeki eski kopya) somut, taranabilir bir karşılığı.
 * 10 oyun modu, web uygulamasındaki mod seçim ekranıyla (web/game/page.tsx)
 * aynı ikon + renk eşlemesini kullanıyor — iki sayfa arasında görsel
 * tutarlılık için. MoreFeatures'ın "kartsız ızgara + Reveal" dilini takip
 * eder, ama her oyunun kendi rengi olduğundan tekdüzen marka rengi yerine
 * ikon kutusu başına ayrı bg/metin rengi (inline style) kullanılıyor.
 */
const GAMES: { icon: LucideIcon; bg: string; fg: string; nameKey: TranslationKey; descKey: TranslationKey }[] = [
  { icon: ListChecks, bg: '#E6F1FB', fg: '#378ADD', nameKey: 'game1Name', descKey: 'game1Desc' },
  { icon: Keyboard, bg: '#FAEEDA', fg: '#854F0B', nameKey: 'game2Name', descKey: 'game2Desc' },
  { icon: Type, bg: '#FDEAF0', fg: '#9F1D53', nameKey: 'game3Name', descKey: 'game3Desc' },
  { icon: Ear, bg: '#E6F1FB', fg: '#378ADD', nameKey: 'game4Name', descKey: 'game4Desc' },
  { icon: Zap, bg: '#FFF1D6', fg: '#9A6400', nameKey: 'game5Name', descKey: 'game5Desc' },
  { icon: Shuffle, bg: '#E4F5EA', fg: '#1D7A46', nameKey: 'game6Name', descKey: 'game6Desc' },
  { icon: Rows3, bg: '#FDEAF0', fg: '#9F1D53', nameKey: 'game7Name', descKey: 'game7Desc' },
  { icon: PencilLine, bg: '#E4F5EA', fg: '#1D7A46', nameKey: 'game8Name', descKey: 'game8Desc' },
  { icon: Scale, bg: '#FEE2E2', fg: '#DC2626', nameKey: 'game9Name', descKey: 'game9Desc' },
  { icon: Link2, bg: '#EEEDFE', fg: '#534AB7', nameKey: 'game10Name', descKey: 'game10Desc' },
] as const;

export function Games() {
  const { t } = useLocale();

  return (
    <section id="games" className="mx-auto max-w-6xl px-5 py-20">
      <Reveal className="max-w-2xl mb-12">
        <h2 className="display text-3xl sm:text-4xl font-bold tracking-tight text-gray-900">{t('gamesTitle')}</h2>
        <p className="mt-3 text-lg text-gray-500">{t('gamesSubtitle')}</p>
      </Reveal>

      <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-5 lg:gap-8">
        {GAMES.map((game, i) => (
          <Reveal key={game.nameKey} delay={i * 60} variant={i % 2 === 0 ? 'left' : 'right'}>
            <div className="flex flex-col gap-3">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: game.bg, color: game.fg }}
              >
                <game.icon className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-gray-900">{t(game.nameKey)}</h3>
              <p className="text-xs text-gray-500 leading-relaxed">{t(game.descKey)}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
