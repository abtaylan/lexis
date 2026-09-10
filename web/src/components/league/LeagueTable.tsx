'use client';

// src/components/league/LeagueTable.tsx — Lig grubu sıralama tablosu.
// Faz 3f (10 Eylül 2026 kullanıcı isteği — "Lig tablosu daha güzel
// efektif gözükmeli, çok basit sade olmuş" + Trendyol Süper Lig
// ekran görüntüleri referans verildi): gerçek bir spor ligi tablosu
// gibi — başlık satırı, terfi/düşme bölgeleri sol kenarda renkli bir
// şeritle, zebra çizgili satırlar. app/(app)/league/page.tsx (kendi
// ligin) VE app/(app)/league/[id]/page.tsx (herhangi bir lig grubunun
// detayı) tarafından ORTAK kullanılıyor.
//
// Faz 3 devamı (10 Eylül 2026 — "sıralama tablosunu biraz daha
// ayrıntılandır, yeni özellikler ekle"): ilk 3 sıraya madalya
// (🥇🥈🥉), her satıra bir üstündeki kullanıcıya XP farkı (liderde
// ise 2.'ye olan farkı), terfi/düşme bölgelerinde satır başında küçük
// bir ok rozeti, ve (weekEndIso verilirse) tablonun üstünde haftanın
// ne zaman biteceğini gösteren bir sayaç eklendi.

import type { ReactNode } from 'react';
import { User as UserIcon, ChevronUp, ChevronDown, Clock } from 'lucide-react';
import type { LeagueMemberItem } from '@/types';
import type { Locale } from '@/lib/i18n';
import { formatTimeRemaining } from '@/lib/leagueLocale';

interface Props {
  members: LeagueMemberItem[];
  rankLabel: string;
  userLabel: string;
  xpLabel: string;
  youLabel: string;
  // Opsiyonel: verilirse tablonun üstünde "hafta X gün sonra bitiyor"
  // gibi lokalize bir sayaç gösterilir (bkz. formatTimeRemaining).
  weekEndIso?: string;
  locale?: Locale;
}

const MEDALS = ['🥇', '🥈', '🥉'];

export function LeagueTable({ members, rankLabel, userLabel, xpLabel, youLabel, weekEndIso, locale }: Props) {
  const memberCount = members.length;
  // Web'deki eski sayfada da aynı orantı kullanılıyordu (grup büyüklüğü
  // 30'dan 15'e indi ama oran aynı kaldı, bkz. migration 051) — üstteki
  // ~1/3 terfi, alttaki ~1/3 düşme bölgesi. Gerçek terfi/düşme mantığı
  // (haftalık kapanış) bkz. backend/league_weekly_rollover.py.
  const zoneSize = memberCount > 6 ? Math.max(1, Math.round(memberCount / 3)) : 0;

  const timeRemaining = weekEndIso && locale ? formatTimeRemaining(weekEndIso, locale) : '';

  return (
    <div className="space-y-2">
      {timeRemaining && (
        <div className="flex items-center gap-1.5 px-1 text-xs text-gray-400 dark:text-slate-500">
          <Clock className="w-3.5 h-3.5" />
          <span>{timeRemaining}</span>
        </div>
      )}
      <div className="overflow-hidden rounded-xl border border-gray-100 dark:border-slate-800">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-50 dark:bg-slate-800/60 text-[11px] uppercase tracking-wide text-gray-400 dark:text-slate-500">
              <th className="text-left font-semibold py-2 pl-3 pr-1 w-10">{rankLabel}</th>
              <th className="text-left font-semibold py-2 px-2">{userLabel}</th>
              <th className="text-right font-semibold py-2 pl-2 pr-3">{xpLabel}</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m, idx) => {
              const rank = idx + 1;
              const isPromoteZone = zoneSize > 0 && rank <= zoneSize;
              const isDemoteZone = zoneSize > 0 && rank > memberCount - zoneSize;
              const zoneBorder = isPromoteZone
                ? 'border-l-4 border-l-green-500'
                : isDemoteZone
                  ? 'border-l-4 border-l-red-500'
                  : 'border-l-4 border-l-transparent';
              const medal = MEDALS[idx];

              // Bir üstteki sıraya XP farkı (lider için 2.'ye olan
              // farkı/liderlik marjını gösterir) — tablonun "ayrıntı"
              // istenen kısmı, ekstra backend verisi gerektirmez.
              let gapNode: ReactNode = null;
              if (memberCount > 1) {
                if (idx === 0) {
                  const lead = m.xp - members[1].xp;
                  if (lead > 0) {
                    gapNode = <span className="text-[10px] font-semibold text-green-600 dark:text-green-400 tabular-nums">+{lead}</span>;
                  }
                } else {
                  const gap = members[idx - 1].xp - m.xp;
                  if (gap > 0) {
                    gapNode = <span className="text-[10px] font-medium text-gray-400 dark:text-slate-500 tabular-nums">-{gap}</span>;
                  }
                }
              }

              return (
                <tr
                  key={m.user_id}
                  className={`${zoneBorder} ${
                    m.is_me
                      ? 'bg-blue-50 dark:bg-blue-500/10'
                      : idx % 2 === 1
                        ? 'bg-gray-50/70 dark:bg-slate-800/30'
                        : 'bg-white dark:bg-slate-900'
                  }`}
                >
                  <td className="py-2.5 pl-3 pr-1 font-bold text-gray-500 dark:text-slate-400 tabular-nums">
                    <span className="inline-flex items-center gap-1">
                      {medal ? <span className="text-sm leading-none">{medal}</span> : rank}
                      {isPromoteZone && <ChevronUp className="w-3 h-3 text-green-500" />}
                      {isDemoteZone && <ChevronDown className="w-3 h-3 text-red-500" />}
                    </span>
                  </td>
                  <td className="py-2.5 px-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center shrink-0 overflow-hidden">
                        {m.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element -- dış kaynaklı avatar URL'i (kullanıcı yükledi), next/image domain whitelist gerektirir; diğer sayfalarda da aynı desen kullanılıyor
                          <img src={m.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <UserIcon className="w-3.5 h-3.5 text-gray-400 dark:text-slate-500" />
                        )}
                      </div>
                      <span className="text-sm font-medium text-gray-900 dark:text-slate-100 truncate">
                        {m.username || '—'}
                        {m.is_me && <span className="ml-1.5 text-xs font-normal text-blue-600 dark:text-blue-400">({youLabel})</span>}
                      </span>
                    </div>
                  </td>
                  <td className="py-2.5 pl-2 pr-3 text-right">
                    <div className="flex flex-col items-end">
                      <span className="font-semibold text-gray-700 dark:text-slate-300 tabular-nums">{m.xp}</span>
                      {gapNode}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
