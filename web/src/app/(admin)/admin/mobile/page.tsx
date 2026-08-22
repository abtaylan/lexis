'use client';

import { Smartphone, Construction, Bell as BellIcon, Bug, GitBranch } from 'lucide-react';

// Mobil uygulama (React Native / Expo — bkz. Bölüm 5) henüz geliştirilmedi.
// Bu sayfa, uygulama gelip backend'e analitik/crash/push verisi göndermeye
// başladığında doldurulacak alanlar için bir iskelet — böylece admin panel
// navigasyonu ve backend "mobile_app" sistem sağlığı alanı şimdiden yerinde.
export default function MobileAppPage() {
  const plannedSections = [
    { icon: GitBranch, title: 'Sürüm takibi', desc: 'iOS/Android üzerinde yayındaki sürümler, güncelleme oranı (Expo EAS build kanalları).' },
    { icon: Bug, title: 'Crash raporlama', desc: 'Uygulama çökme/hata raporları — bir crash reporting SDK entegre edildiğinde burada listelenecek.' },
    { icon: BellIcon, title: 'Push bildirim yönetimi', desc: 'Push token kayıtları, gönderilen kampanyalar ve teslim oranları.' },
  ];

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Mobil Uygulama</h1>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">React Native (Expo) uygulaması — iOS ve Android</p>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-8 flex flex-col items-center text-center gap-3">
        <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-slate-500 flex items-center justify-center">
          <Construction className="w-7 h-7" />
        </div>
        <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">Henüz geliştirme aşamasında</h2>
        <p className="text-sm text-gray-500 dark:text-slate-400 max-w-md">
          Mobil uygulama, Büyük İşler listesindeki (Bölüm 5) henüz başlanmamış maddelerden biri.
          Kod tabanında <code className="font-mono text-xs bg-gray-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">mobile/</code>
          klasörü altında Expo iskeleti mevcut ancak backend&apos;e canlı analitik/crash/push verisi göndermiyor.
          Bu sayfa, uygulama üretime geçtiğinde doldurulacak alanların yer tutucusu.
        </p>
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
        <Smartphone className="w-3.5 h-3.5" />Genel sistem sağlığı özetinde de &quot;mobile_app: in_development&quot; olarak işaretli (bkz. Sistem Sağlığı sayfası).
      </div>
    </div>
  );
}
