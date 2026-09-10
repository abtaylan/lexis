'use client';

// src/components/league/LeagueGroupStrip.tsx — Faz 3 devamı (10 Eylül
// 2026 kullanıcı geri bildirimi: "Ligin üst kısmında tüm ligler yan yana
// olsun, yan yana hepsi gözükmeyecek, ok tuşu ile ilerleyerek diğer lig
// isimlerini göreyim"): eskiden dikey, tek sütun "Tüm Ligler" listesinin
// yerine — yatay kaydırılabilir, sol/sağ ok butonlu bir şerit. Her chip
// kademe adı + grup takma adını (bkz. backend _group_nickname) gösterir.
// league/page.tsx (benim ligim) VE league/[id]/page.tsx (herhangi bir
// grup) tarafından ORTAK kullanılıyor.

import { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { LeagueOverviewGroup } from '@/types';

export function LeagueGroupStrip({
  groups,
  tierNames,
  currentLeagueId,
  youLabel,
  onSelect,
}: {
  groups: LeagueOverviewGroup[];
  tierNames: Record<string, string>;
  currentLeagueId?: string;
  youLabel: string;
  onSelect: (leagueId: string) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollBy = (dx: number) => scrollRef.current?.scrollBy({ left: dx, behavior: 'smooth' });

  if (groups.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => scrollBy(-240)}
        className="shrink-0 p-1.5 rounded-full border border-gray-100 dark:border-slate-800 text-gray-400 hover:bg-gray-50 hover:text-gray-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
        aria-label="Geri"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <div
        ref={scrollRef}
        className="flex-1 flex gap-2 overflow-x-auto scroll-smooth py-1"
        style={{ scrollbarWidth: 'none' }}
      >
        {groups.map((g) => {
          const active = g.league_id === currentLeagueId;
          return (
            <button
              key={g.league_id}
              type="button"
              onClick={() => onSelect(g.league_id)}
              className={`shrink-0 flex flex-col items-start gap-0.5 px-3 py-2 rounded-xl border text-left transition-colors whitespace-nowrap ${
                active
                  ? 'bg-amber-50 border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/30'
                  : 'bg-white border-gray-100 hover:bg-gray-50 dark:bg-slate-900 dark:border-slate-800 dark:hover:bg-slate-800'
              }`}
            >
              <span className={`text-xs font-bold ${active ? 'text-amber-700 dark:text-amber-400' : 'text-gray-900 dark:text-slate-100'}`}>
                {tierNames[g.tier_slug] ?? g.tier_slug}
              </span>
              <span className="text-[10px] text-gray-400 dark:text-slate-500">
                {g.group_name}
                {g.is_mine ? ` · ${youLabel}` : ''}
              </span>
            </button>
          );
        })}
      </div>
      <button
        type="button"
        onClick={() => scrollBy(240)}
        className="shrink-0 p-1.5 rounded-full border border-gray-100 dark:border-slate-800 text-gray-400 hover:bg-gray-50 hover:text-gray-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
        aria-label="İleri"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
