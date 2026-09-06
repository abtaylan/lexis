'use client';

import { Smartphone, Apple, Bell as BellIcon, Bug, GitBranch, CheckCircle2, Clock } from 'lucide-react';

// Mobil uygulama (React Native / Expo) — durum güncellendi (6 Eylül 2026,
// kullanıcı isteği): iOS App Store'da yayında/aktif, Android Play
// Console'da kapalı test + inceleme/prod-erişim sürecinde. Bu sayfa henüz
// canlı store API verisi çekmiyor (App Store Connect / Play Console API
// entegrasyonu ayrı bir iş) — durum metni elle güncellenen bir özet.
export default function MobileAppPage() {
  const storeStatus = [
    {
      icon: Apple,
      platform: 'iOS',
      badge: 'Aktif',
      badgeClass: 'bg-[#EAF3DE] text-[#3B6D11]',
      desc: 'App Store’da yayında ve indirilebilir durumda.',
    },
    {
      icon: Smartphone,
      platform: 'Android',
      badge: 'İnceleme sürecinde',
      badgeClass: 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400',
      desc: 'Play Console’da kapalı test aşamasında — prod erişimi için gereken minimum test kullanıcısı/süre şartları tamamlanıyor.',
    },
  ];

  const plannedSections = [
    { icon: GitBranch, title: 'Sürüm takibi', desc: 'iOS/Android üzerinde yayındaki sürümler, güncelleme oranı (Expo EAS build kanalları).' },
    { icon: Bug, title: 'Crash raporlama', desc: 'Uygulama çökme/hata raporları — bir crash reporting SDK entegre edildiğinde burada listelenecek.' },
    { icon: BellIcon, title: 'Push bildirim yönetimi', desc: 'Push token kayıtları, günün kelimesi ve sabah/akşam hatırlatma kampanyalarının teslim oranları.' },
  ];

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Mobil Uygulama</h1>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">React Native (Expo) uygulaması — iOS ve Android</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {storeStatus.map(({ icon: Icon, platform, badge, badgeClass, desc }) => (
          <div key={platform} className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400 flex items-center justify-center"><Icon className="w-4 h-4" /></div>
                <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">{platform}</p>
              </div>
              <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${badgeClass}`}>
                {badge === 'Aktif' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}{badge}
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-slate-400">{desc}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plannedSections.map(({ icon: Icon, title, desc }) => (
          <div key={title} className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-5 opacity-60">
            <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-slate-500 flex items-center justify-center mb-3">
              <Icon className="w-5 h-5" />
            </div>
            <p className="text-sm font-semibold text-gray-700 dark:text-slate-300">{title}</p>
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">{desc}</p>
            <span className="inline-block mt-3 text-[10px] font-medium uppercase tracking-wide text-gray-400 dark:text-slate-500 bg-gray-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">Yakında</span>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-slate-500">
        <Smartphone className="w-3.5 h-3.5" />Bu sayfa henüz App Store Connect / Play Console API&apos;lerinden canlı veri çekmiyor — yukarıdaki durum elle güncellenen bir özet.
      </div>
    </div>
  );
}
