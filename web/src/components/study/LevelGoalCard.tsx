'use client';

// web/src/components/study/LevelGoalCard.tsx
//
// Kullanıcı isteği (3 Kasım 2026): Ana sayfada "ana seviye durumumuz ->
// ulaşmak istediğimiz seviye" arasında yüzdesel bir ilerleme göstergesi.
// Veri: GET/PATCH /me/level-goal (bkz. backend/app/services/
// level_goal_service.py). Yüzde; haftalık seviye sınavı doğruluğu + oyun
// XP'si + bu haftanın çalışma programı tamamlama oranının ağırlıklı
// ortalamasından geliyor (ağırlıklar backend'de, bkz. o dosyanın başlık
// yorumu). StudyProgramCard ile AYNI görsel dil (kart/renk/Bar deseni).

import { useState } from 'react';
import type { Locale } from '@/lib/i18n';
import type { LevelGoal } from '@/lib/api';

const CEFR_ORDER = ['a1', 'a2', 'b1', 'b2', 'c1', 'c2'];

type Strings = {
  title: string;
  subtitle: string;
  percentSuffix: string;
  stepsTpl: string;
  examLabel: string;
  gameLabel: string;
  programLabel: string;
  changeTarget: string;
  needsTargetTitle: string;
  needsTargetDesc: string;
  pickLabel: string;
  setCta: string;
  saving: string;
  reachedTpl: string;
};

const STRINGS: Partial<Record<Locale, Strings>> = {
  tr: {
    title: 'Hedefine Giden Yol',
    subtitle: 'Haftalık sınavlar, oyun puanları ve çalışma programına göre',
    percentSuffix: 'tamamlandı',
    stepsTpl: '{done}/{total} kademe geçildi',
    examLabel: 'Seviye sınavı',
    gameLabel: 'Oyun puanları',
    programLabel: 'Çalışma programı',
    changeTarget: 'Hedefi değiştir',
    needsTargetTitle: 'Bir hedef seviye belirle',
    needsTargetDesc: 'Şu anki seviyenden ulaşmak istediğin seviyeyi seç, ilerlemeni yüzdesel olarak takip edelim.',
    pickLabel: 'Hedef seviye',
    setCta: 'Hedefi Belirle',
    saving: 'Kaydediliyor…',
    reachedTpl: 'Hedefine ulaştın! 🎉',
  },
  en: {
    title: 'Road to Your Goal',
    subtitle: 'Based on weekly exams, game scores and your study program',
    percentSuffix: 'complete',
    stepsTpl: '{done}/{total} levels climbed',
    examLabel: 'Level exam',
    gameLabel: 'Game scores',
    programLabel: 'Study program',
    changeTarget: 'Change goal',
    needsTargetTitle: 'Set a goal level',
    needsTargetDesc: 'Pick the level you want to reach and we’ll track your progress as a percentage.',
    pickLabel: 'Goal level',
    setCta: 'Set Goal',
    saving: 'Saving…',
    reachedTpl: 'You reached your goal! 🎉',
  },
};

const CEFR_NAMES: Partial<Record<Locale, Record<string, string>>> = {
  tr: { a1: 'Başlangıç', a2: 'Temel', b1: 'Orta', b2: 'Orta-Üstü', c1: 'İleri', c2: 'Uzman' },
  en: { a1: 'Beginner', a2: 'Elementary', b1: 'Intermediate', b2: 'Upper-Int.', c1: 'Advanced', c2: 'Proficient' },
};

function fill(tpl: string, vars: Record<string, string | number>): string {
  return Object.entries(vars).reduce((acc, [k, v]) => acc.replace(`{${k}}`, String(v)), tpl);
}

function MiniBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="h-1.5 w-full rounded-full bg-gray-100 dark:bg-slate-800 overflow-hidden">
      <div className="h-full rounded-full transition-all" style={{ width: `${Math.max(0, Math.min(100, pct))}%`, backgroundColor: color }} />
    </div>
  );
}

export function LevelGoalCard({
  goal,
  locale,
  onSetTarget,
  settingTarget,
  forceShowPicker,
  onRequestChangeTarget,
}: {
  goal: LevelGoal;
  locale: Locale;
  onSetTarget: (targetLevel: string) => void;
  settingTarget?: boolean;
  // "Hedefi değiştir" linkine basılınca dashboard bunu true yapıp seçim
  // kutusunu (needs_target ile AYNI UI) tekrar gösterir -- backend'e
  // ayrı bir "hedefi temizle" isteği atmadan, sadece client-side.
  forceShowPicker?: boolean;
  onRequestChangeTarget?: () => void;
}) {
  const s = (STRINGS[locale] ?? STRINGS.tr)!;
  const names = CEFR_NAMES[locale] ?? CEFR_NAMES.tr!;
  const currentIdx = goal.current_level ? CEFR_ORDER.indexOf(goal.current_level) : -1;
  const [picked, setPicked] = useState(goal.target_level ?? goal.suggested_target_level ?? '');

  // Hiç seviye tespit sınavı yapılmamışsa bu widget hiç gösterilmez --
  // dashboard'daki mevcut PLACEMENT_ALERT banner'ı zaten aynı çağrıyı
  // yapıyor, ikisini aynı anda göstermek tekrar olurdu.
  if (!goal.available) return null;

  if (goal.needs_target || forceShowPicker) {
    const options = CEFR_ORDER.filter((_, i) => i > currentIdx);
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-4">
        <p className="text-sm font-bold text-gray-900 dark:text-slate-100">{s.needsTargetTitle}</p>
        <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{s.needsTargetDesc}</p>
        <div className="flex items-center gap-2 mt-3">
          <select
            value={picked}
            onChange={(e) => setPicked(e.target.value)}
            className="flex-1 text-sm rounded-xl border border-gray-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 px-3 py-2"
          >
            {options.map((lvl) => (
              <option key={lvl} value={lvl}>
                {lvl.toUpperCase()} · {names[lvl]}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={!picked || settingTarget}
            onClick={() => picked && onSetTarget(picked)}
            className="text-xs font-bold rounded-xl px-3 py-2 text-white shrink-0 disabled:opacity-50"
            style={{ backgroundColor: '#378ADD' }}
          >
            {settingTarget ? s.saving : s.setCta}
          </button>
        </div>
      </div>
    );
  }

  const percent = goal.percent ?? 0;
  const reached = percent >= 100;
  const b = goal.breakdown;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-bold text-gray-900 dark:text-slate-100">{s.title}</p>
          <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{s.subtitle}</p>
        </div>
        <span className="text-xl font-extrabold shrink-0" style={{ color: reached ? '#3B6D11' : '#378ADD' }}>
          %{percent}
        </span>
      </div>

      <div className="flex items-center gap-3 mt-3">
        <span className="text-[11px] font-bold rounded-full px-2 py-0.5 shrink-0" style={{ backgroundColor: '#E6F1FB', color: '#185FA5' }}>
          {goal.current_level?.toUpperCase()}
        </span>
        <div className="flex-1">
          <MiniBar pct={percent} color={reached ? '#3B6D11' : '#378ADD'} />
        </div>
        <span className="text-[11px] font-bold rounded-full px-2 py-0.5 shrink-0" style={{ backgroundColor: '#FDF2E9', color: '#854F0B' }}>
          {goal.target_level?.toUpperCase()}
        </span>
      </div>
      <p className="text-xs text-gray-400 dark:text-slate-500 mt-1.5">
        {reached ? s.reachedTpl : fill(s.stepsTpl, { done: goal.completed_steps ?? 0, total: goal.total_steps ?? 1 })}
      </p>

      {b && !reached && (
        <div className="flex flex-col gap-2 mt-3">
          <div>
            <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-slate-400 mb-1">
              <span>{s.examLabel}</span>
              <span>%{b.exam_accuracy_pct}</span>
            </div>
            <MiniBar pct={b.exam_accuracy_pct} color="#378ADD" />
          </div>
          <div>
            <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-slate-400 mb-1">
              <span>{s.gameLabel}</span>
              <span>%{b.game_score_pct}</span>
            </div>
            <MiniBar pct={b.game_score_pct} color="#854F0B" />
          </div>
          <div>
            <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-slate-400 mb-1">
              <span>{s.programLabel}</span>
              <span>%{b.study_program_pct}</span>
            </div>
            <MiniBar pct={b.study_program_pct} color="#3B6D11" />
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => onRequestChangeTarget?.()}
        className="text-[11px] font-semibold text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 mt-3"
      >
        {s.changeTarget}
      </button>
    </div>
  );
}
