'use client';

// app/(app)/rewards/page.tsx — "Rozetler ve Ödüller" tam katalog sayfası
// (V2 öncelik #2, hiç başlanmamıştı). Kazanılan + kazanılmayan TÜM
// rozet/ödülleri gösterir (backend: GET /stats/badges/catalog, bkz.
// badge_service.py::get_badges_catalog + migration
// 063_badges_catalog_taxonomy.sql). Profildeki BadgeShowcase (sadece
// kazanılanlar, kompakt ızgara) değişmeden kalıyor — buradan "Tümünü Gör"
// ile bu sayfaya geliniyor.
//
// Rozet ≠ Ödül taksonomisi: "achievement" (rozet, mevcut 32 satırın hepsi)
// ve "title" (ödül/unvan — şimdilik hiç yok). İki ayrı sekme var; Ödüller
// sekmesi boşsa "yakında" mesajı gösteriyor — kullanıcının notu ("rozetler
// sayfası bitince yeni rozetleri buraya zaten yerleştirirsin") gereği yeni
// bir rozet/ödül eklendiğinde koddan hiçbir şey değişmeden doğru sekme/
// bölümde belirir (kind + category alanlarına göre).
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Award, Lock, Sparkles } from 'lucide-react';
import { clsx } from 'clsx';
import { statsApi, type BadgeCatalogItem } from '@/lib/api';
import { useLocale } from '@/lib/i18n';
import { CATEGORY_ORDER, CATEGORY_SECTION, REWARDS_L } from '@/lib/rewardsLocale';
import { PageHeader } from '@/components/layout/PageHeader';

type Tab = 'achievement' | 'title';

function BadgeCard({ item, locale }: { item: BadgeCatalogItem; locale: string }) {
  const nameKey = `name_${locale}` as keyof BadgeCatalogItem;
  const descKey = `description_${locale}` as keyof BadgeCatalogItem;
  const name = (item[nameKey] as string) || item.name_en || item.code;
  const desc = (item[descKey] as string) || item.description_en || '';
  const requirement = locale === 'tr' ? item.requirement_tr : item.requirement_en || item.requirement_tr;

  return (
    <div
      title={item.earned ? desc : requirement || undefined}
      className={clsx(
        'flex flex-col items-center gap-1.5 rounded-xl border p-4 text-center transition-colors',
        item.earned
          ? 'border-amber-100 bg-amber-50 dark:border-amber-500/20 dark:bg-amber-500/10'
          : 'border-gray-100 bg-gray-50 dark:border-slate-800 dark:bg-slate-900/60'
      )}
    >
      <span className={clsx('text-3xl leading-none', !item.earned && 'grayscale opacity-40')}>
        {item.icon_emoji}
      </span>
      <span
        className={clsx(
          'text-xs font-semibold leading-tight line-clamp-2',
          item.earned ? 'text-gray-800 dark:text-slate-100' : 'text-gray-400 dark:text-slate-500'
        )}
      >
        {name}
      </span>
      {item.earned ? (
        <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
          {item.period_key ?? (item.earned_at ? new Date(item.earned_at).toLocaleDateString(locale) : '')}
        </span>
      ) : (
        <span className="flex items-center gap-1 text-[10px] text-gray-400 dark:text-slate-500">
          <Lock className="w-3 h-3" />
          {requirement}
        </span>
      )}
    </div>
  );
}

export default function RewardsPage() {
  const { locale } = useLocale();
  const t = REWARDS_L[locale] ?? REWARDS_L.en;
  const [items, setItems] = useState<BadgeCatalogItem[] | null>(null);
  const [error, setError] = useState(false);
  const [tab, setTab] = useState<Tab>('achievement');

  const fetchCatalog = () => {
    statsApi
      .getBadgesCatalog()
      .then(setItems)
      .catch(() => setError(true));
  };

  useEffect(() => {
    let cancelled = false;
    statsApi
      .getBadgesCatalog()
      .then((res) => {
        if (!cancelled) setItems(res);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const retry = () => {
    setError(false);
    setItems(null);
    fetchCatalog();
  };

  const sections = useMemo(() => {
    if (!items) return [];
    const filtered = items.filter((i) => i.kind === tab);
    const grouped = new Map<string, BadgeCatalogItem[]>();
    for (const item of filtered) {
      const key = CATEGORY_SECTION[item.category] ?? item.category;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(item);
    }
    return CATEGORY_ORDER.filter((key) => grouped.has(key)).map((key) => ({
      key,
      label: t[`section_${key}`] ?? key,
      items: grouped.get(key)!,
    }));
  }, [items, tab, t]);

  const earnedCount = items?.filter((i) => i.kind === 'achievement' && i.earned).length ?? 0;
  const totalCount = items?.filter((i) => i.kind === 'achievement').length ?? 0;

  return (
    <div className="max-w-4xl">
      <PageHeader
        title={t.title}
        subtitle={t.subtitle}
        action={
          <Link
            href="/profile"
            className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-800 dark:text-slate-400 dark:hover:text-slate-100"
          >
            <ArrowLeft className="w-4 h-4" />
            {t.backToProfile}
          </Link>
        }
      />

      <div className="flex items-center gap-2 mb-5">
        <button
          type="button"
          onClick={() => setTab('achievement')}
          className={clsx(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
            tab === 'achievement'
              ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400'
              : 'text-gray-500 hover:bg-gray-50 dark:text-slate-400 dark:hover:bg-slate-800'
          )}
        >
          <Award className="w-4 h-4" />
          {t.achievementsTab}
          {totalCount > 0 && (
            <span className="text-xs text-gray-400 dark:text-slate-500">
              {t.earnedCountTpl.replace('{earned}', String(earnedCount)).replace('{total}', String(totalCount))}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setTab('title')}
          className={clsx(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
            tab === 'title'
              ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400'
              : 'text-gray-500 hover:bg-gray-50 dark:text-slate-400 dark:hover:bg-slate-800'
          )}
        >
          <Sparkles className="w-4 h-4" />
          {t.titlesTab}
        </button>
      </div>

      {error ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-8 text-center">
          <p className="text-sm text-gray-500 dark:text-slate-400 mb-3">{t.error}</p>
          <button
            type="button"
            onClick={retry}
            className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
          >
            {t.retryBtn}
          </button>
        </div>
      ) : items === null ? (
        <p className="text-sm text-gray-400 dark:text-slate-500">{t.loading}</p>
      ) : sections.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-8 text-center">
          <p className="text-sm text-gray-400 dark:text-slate-500">{t.titlesEmpty}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {sections.map((section) => (
            <div
              key={section.key}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-6"
            >
              <h2 className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-4">
                {section.label}
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {section.items.map((item) => (
                  <BadgeCard key={item.code} item={item} locale={locale} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
