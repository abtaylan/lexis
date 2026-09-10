'use client';

// src/components/league/LeagueTable.tsx — Lig grubu sıralama tablosu.
// Faz 3f (10 Eylül 2026 kullanıcı isteği — "Lig tablosu daha güzel
// efektif gözükmeli, çok basit sade olmuş" + Trendyol Süper Lig
// ekran görüntüleri referans verildi): gerçek bir spor ligi tablosu
// gibi — başlık satırı, terfi/düşme bölgeleri sol kenarda renkli bir
// şeritle, zebra çizgili satırlar. app/(app)/league/page.tsx (kendi
// ligin) VE app/(app)/league/[id]/page.tsx (herhangi bir lig grubunun
// detayı) tarafından ORTAK kullanılıyor.

import { User as UserIcon } from 'lucide-react';
import type { LeagueMemberItem } from '@/types';

interface Props {
  members: LeagueMemberItem[];
  rankLabel: string;
  userLabel: string;
  xpLabel: string;
  youLabel: string;
}

export function LeagueTable({ members, rankLabel, userLabel, xpLabel, youLabel }: Props) {
  const memberCount = members.length;
  // Web'deki eski sayfada da aynı orantı kullanılıyordu (grup büyüklüğü
  // 30'dan 15'e indi ama oran aynı kaldı, bkz. migration 051) — üstteki
  // ~1/3 terfi, alttaki ~1/3 düşme bölgesi. Gerçek terfi/düşme mantığı
  // (haftalık kapanış) henüz backend'de YOK (bkz. leagues.py modül
  // yorumu) — bu sadece gelecekteki mekaniğin görsel ön izlemesi.
  const zoneSize = memberCount > 6 ? Math.max(1, Math.round(memberCount / 3)) : 0;

  return (
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
                <td className="py-2.5 pl-3 pr-1 font-bold text-gray-500 dark:text-slate-400 tabular-nums">{rank}</td>
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
                <td className="py-2.5 pl-2 pr-3 text-right font-semibold text-gray-700 dark:text-slate-300 tabular-nums">
                  {m.xp}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
