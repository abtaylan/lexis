'use client';

import { useEffect, useState } from 'react';
import { Smartphone, Apple, Bell as BellIcon, Bug, GitBranch, CheckCircle2, AlertTriangle, Loader2, Star, MessageSquare } from 'lucide-react';
import { adminApi } from '@/lib/api';
import type {
  MobileReleasePlatformStatus,
  MobilePushStatus,
  MobileCrashReportsResponse,
  MobileReviewsResponse,
} from '@/types';

// Mobil uygulama (React Native / Expo) — durum güncellendi (13 Ekim 2026,
// App Store Connect + Play Console'dan canlı kontrol edilerek): iOS 1.0.3
// "Ready for Distribution" ile App Store'da yayında/aktif. Android da
// artık "Üretim" durumunda yayında/aktif (25 Eylül'de üretime başvuru
// onaylanmıştı — bu sayfadaki "kapalı test" metni o zamandan beri
// güncellenmemişti). Bu kısım henüz canlı store API verisi çekmiyor
// (App Store Connect / Play Console API entegrasyonu ayrı bir iş) —
// durum metni elle güncellenen bir özet, bu yüzden ileride tekrar
// eskiyebilir.
//
// "Sürüm takibi" kartı ise (aynı gün) "yakında" placeholder'ından canlı
// veriye çevrildi: backend GET /admin/mobile/release-status,
// public.mobile_release_status tablosunu okuyor; o tablo her gün bir
// Claude scheduled task tarafından mcp__Expo__build_list (EAS) ile
// güncelleniyor — bkz. backend/app/api/routes/admin_platform.py.
//
// "Crash raporlama" + "Mağaza değerlendirmeleri" kartları da (13 Ekim 2026,
// kullanıcı isteği: "Crash raporlama bölümü hala Yakında diyor, bunu da
// canlıya al ... buraya mobil için başka özellikler de ekle") aynı günlük
// scheduled task tarafından TestFlight/Play Console'un KENDİ crash + review
// API'lerinden dolduruluyor — mobil uygulamaya yeni bir SDK (ör. Sentry)
// entegre etmeye GEREK KALMADI. Android crash verisi istisna: Google Play
// Developer Reporting API kullanıcının Google Cloud projesinde henüz
// etkin değil (403 SERVICE_DISABLED) — bu alan etkinleştirilene kadar
// mobile_feed_fetch_status üzerinden açıkça "veri yok, şu linkten
// etkinleştir" diye işaretli kalır, asla 0/boş gibi yanıltıcı gösterilmez.
function formatDate(iso?: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const PUSH_CATEGORY_LABELS: Record<string, string> = {
  daily_reminder_morning: 'Sabah hatırlatma',
  daily_reminder_evening: 'Akşam hatırlatma',
  friend_request: 'Arkadaşlık isteği',
  new_message: 'Yeni mesaj',
  reward: 'Ödül bildirimi',
  ios_reinstall_fix_1_0_1_ota: 'iOS OTA düzeltme bildirimi (tek seferlik)',
};

const PUSH_STATUS_LABELS: Record<string, string> = {
  delivered: 'Teslim edildi',
  sent: 'Gönderildi (teslim bekleniyor)',
  delivery_failed: 'Teslim başarısız',
  skipped: 'Atlandı',
  failed: 'Başarısız',
};

function ReleaseCard({ platform, data }: { platform: 'iOS' | 'Android'; data: MobileReleasePlatformStatus | null }) {
  const Icon = platform === 'iOS' ? Apple : Smartphone;

  if (!data) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400 flex items-center justify-center"><Icon className="w-4 h-4" /></div>
          <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">{platform}</p>
        </div>
        <p className="text-xs text-gray-400 dark:text-slate-500">Henüz build verisi yok.</p>
      </div>
    );
  }

  const latestIsFinished = data.latest_build_id === data.latest_finished_build_id;
  const hasFailedNewerBuild = !latestIsFinished && data.latest_build_status && data.latest_build_status !== 'FINISHED';
  // 13 Ekim 2026 düzeltmesi (kullanıcı uyarısı: "şuan uygulama en son
  // versionda başarılı şekilde çalışıyor" halde kart sadece alarm veriyordu):
  // başarısız YENİ bir build denemesi olsa bile, elimizde başarıyla
  // TAMAMLANMIŞ bir build varsa (latest_finished_*) bunu her zaman yeşil
  // "Canlıda Aktif" rozetiyle göster — başarısız deneme artık ayrı, daha
  // küçük bir ikaz rozeti olarak YANINDA gösteriliyor, onun YERİNE değil.
  const hasFinishedBuild = !!data.latest_finished_build_id;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400 flex items-center justify-center"><Icon className="w-4 h-4" /></div>
          <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">{platform}</p>
        </div>
        <div className="flex items-center gap-1.5">
          {hasFinishedBuild && (
            <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-[#EAF3DE] text-[#3B6D11]">
              <CheckCircle2 className="w-3 h-3" />Canlıda Aktif
            </span>
          )}
          {hasFailedNewerBuild && (
            <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-[#FBEAEA] text-[#9A3B3B]">
              <AlertTriangle className="w-3 h-3" />Son deneme başarısız
            </span>
          )}
          {!hasFinishedBuild && !hasFailedNewerBuild && (
            <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-[#EAF3DE] text-[#3B6D11]">
              <CheckCircle2 className="w-3 h-3" />Güncel
            </span>
          )}
        </div>
      </div>

      <div className="space-y-1.5 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-gray-400 dark:text-slate-500">Son tamamlanan sürüm</span>
          <span className="font-medium text-gray-700 dark:text-slate-300">
            {data.latest_finished_app_version ?? '—'} (build {data.latest_finished_build_number ?? '—'})
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-400 dark:text-slate-500">Tamamlanma tarihi</span>
          <span className="font-medium text-gray-700 dark:text-slate-300">{formatDate(data.latest_finished_completed_at)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-400 dark:text-slate-500">Kanal</span>
          <span className="font-medium text-gray-700 dark:text-slate-300">{data.latest_build_channel ?? '—'}</span>
        </div>
      </div>

      {hasFailedNewerBuild && (
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-slate-800">
          {hasFinishedBuild && (
            <p className="text-[11px] text-[#3B6D11] mb-1.5">
              ✓ Mağazada yayındaki sürüm yukarıdaki başarılı build&apos;e dayanıyor, kullanıcılar bu hatadan etkilenmiyor.
            </p>
          )}
          <p className="text-xs text-[#9A3B3B]">
            build {data.latest_build_number} ({data.latest_build_app_version}) — {data.latest_build_status}
            {data.latest_build_error ? `: ${data.latest_build_error}` : ''}
          </p>
        </div>
      )}

      {data.latest_build_commit_message && (
        <p className="mt-3 text-[11px] text-gray-400 dark:text-slate-500 truncate" title={data.latest_build_commit_message}>
          {data.latest_build_commit_message.split('\n')[0]}
        </p>
      )}
    </div>
  );
}

function StarRow({ rating }: { rating: number | null }) {
  if (rating == null) return null;
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className={`w-3 h-3 ${i < rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200 dark:text-slate-700'}`} />
      ))}
    </div>
  );
}

export default function MobileAppPage() {
  const [releaseData, setReleaseData] = useState<(MobileReleasePlatformStatus | null)[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [pushData, setPushData] = useState<MobilePushStatus | null>(null);
  const [pushLoading, setPushLoading] = useState(true);
  const [pushError, setPushError] = useState('');

  const [crashData, setCrashData] = useState<MobileCrashReportsResponse | null>(null);
  const [crashLoading, setCrashLoading] = useState(true);
  const [crashError, setCrashError] = useState('');

  const [reviewsData, setReviewsData] = useState<MobileReviewsResponse | null>(null);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviewsError, setReviewsError] = useState('');

  useEffect(() => {
    adminApi.getMobileReleaseStatus()
      .then((res) => setReleaseData(res.platforms))
      .catch(() => setError('Sürüm takibi verisi alınamadı.'))
      .finally(() => setLoading(false));

    adminApi.getMobilePushStatus()
      .then(setPushData)
      .catch(() => setPushError('Push bildirim verisi alınamadı.'))
      .finally(() => setPushLoading(false));

    adminApi.getMobileCrashReports()
      .then(setCrashData)
      .catch(() => setCrashError('Crash raporu verisi alınamadı.'))
      .finally(() => setCrashLoading(false));

    adminApi.getMobileReviews()
      .then(setReviewsData)
      .catch(() => setReviewsError('Mağaza değerlendirmeleri alınamadı.'))
      .finally(() => setReviewsLoading(false));
  }, []);

  const storeStatus = [
    {
      icon: Apple,
      platform: 'iOS',
      badge: 'Aktif — 1.0.3',
      badgeClass: 'bg-[#EAF3DE] text-[#3B6D11]',
      desc: 'App Store’da "Ready for Distribution" durumunda, yayında ve indirilebilir.',
    },
    {
      icon: Smartphone,
      platform: 'Android',
      badge: 'Aktif — Üretim',
      badgeClass: 'bg-[#EAF3DE] text-[#3B6D11]',
      desc: 'Play Console’da "Üretim" durumunda, yayında ve indirilebilir (app.lexis.mobile).',
    },
  ];

  const ios = releaseData?.[0] ?? null;
  const android = releaseData?.[1] ?? null;
  const checkedAt = ios?.checked_at ?? android?.checked_at ?? null;

  const crashesByPlatform = (platform: 'ios' | 'android') =>
    (crashData?.reports ?? []).filter((r) => r.platform === platform);
  const reviewsByPlatform = (platform: 'ios' | 'android') =>
    (reviewsData?.reviews ?? []).filter((r) => r.platform === platform);

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
                <CheckCircle2 className="w-3 h-3" />{badge}
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-slate-400">{desc}</p>
          </div>
        ))}
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <GitBranch className="w-4 h-4 text-gray-400 dark:text-slate-500" />
          <h2 className="text-sm font-semibold text-gray-700 dark:text-slate-300">Sürüm takibi</h2>
          {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />}
        </div>
        {error ? (
          <p className="text-xs text-[#9A3B3B]">{error}</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ReleaseCard platform="iOS" data={ios} />
            <ReleaseCard platform="Android" data={android} />
          </div>
        )}
        <p className="mt-2 text-[11px] text-gray-400 dark:text-slate-500">
          EAS build kayıtlarından alınıyor, günlük olarak yenilenir (son yenileme: {formatDate(checkedAt)}). Cihazlardaki gerçek güncelleme/adaptasyon oranı için uygulamaya analytics SDK entegrasyonu gerekiyor — henüz yok.
        </p>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <BellIcon className="w-4 h-4 text-gray-400 dark:text-slate-500" />
          <h2 className="text-sm font-semibold text-gray-700 dark:text-slate-300">Push bildirim yönetimi</h2>
          {pushLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />}
        </div>
        {pushError ? (
          <p className="text-xs text-[#9A3B3B]">{pushError}</p>
        ) : pushData ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-5">
              <p className="text-xs text-gray-400 dark:text-slate-500 mb-3">Kayıtlı push token</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">{pushData.tokens.total}</p>
              <div className="mt-3 space-y-1 text-xs text-gray-500 dark:text-slate-400">
                <div className="flex items-center justify-between"><span>iOS</span><span className="font-medium">{pushData.tokens.ios}</span></div>
                <div className="flex items-center justify-between"><span>Android</span><span className="font-medium">{pushData.tokens.android}</span></div>
                <div className="flex items-center justify-between"><span>Son 14 günde aktif</span><span className="font-medium">{pushData.tokens.fresh_14d}</span></div>
              </div>
            </div>

            <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-5">
              <p className="text-xs text-gray-400 dark:text-slate-500 mb-3">Son 7 günde gönderim (kampanya × durum)</p>
              {pushData.last_7_days.length === 0 ? (
                <p className="text-xs text-gray-400 dark:text-slate-500">Son 7 günde push bildirim kaydı yok.</p>
              ) : (
                <div className="space-y-1.5 text-xs">
                  {pushData.last_7_days.map((row) => (
                    <div key={`${row.category}-${row.status}`} className="flex items-center justify-between">
                      <span className="text-gray-500 dark:text-slate-400">
                        {PUSH_CATEGORY_LABELS[row.category] ?? row.category} — {PUSH_STATUS_LABELS[row.status] ?? row.status}
                      </span>
                      <span className="font-medium text-gray-700 dark:text-slate-300">{row.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : null}
        <p className="mt-2 text-[11px] text-gray-400 dark:text-slate-500">
          push_tokens ve notification_log tablolarından anlık okunuyor — ayrı bir arka plan işine ihtiyaç yok.
        </p>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <Bug className="w-4 h-4 text-gray-400 dark:text-slate-500" />
          <h2 className="text-sm font-semibold text-gray-700 dark:text-slate-300">Crash raporlama</h2>
          {crashLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />}
        </div>
        {crashError ? (
          <p className="text-xs text-[#9A3B3B]">{crashError}</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(['ios', 'android'] as const).map((platform) => {
              const status = crashData?.fetch_status?.[platform];
              const items = crashesByPlatform(platform);
              return (
                <div key={platform} className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-5">
                  <p className="text-xs font-semibold text-gray-700 dark:text-slate-300 mb-3">{platform === 'ios' ? 'iOS (TestFlight)' : 'Android (Play Console)'}</p>
                  {status && !status.ok ? (
                    <p className="text-xs text-amber-700 dark:text-amber-500">
                      {status.error?.includes('SERVICE_DISABLED') || status.error?.includes('playdeveloperreporting')
                        ? <>Google Play Developer Reporting API henüz etkin değil. <a href="https://console.developers.google.com/apis/api/playdeveloperreporting.googleapis.com/overview?project=856605079231" target="_blank" rel="noreferrer" className="underline">Etkinleştirmek için tıkla</a>, sonraki günlük yenilemede veriler gelir.</>
                        : (status.error ?? 'Veri alınamadı.')}
                    </p>
                  ) : items.length === 0 ? (
                    <p className="text-xs text-gray-400 dark:text-slate-500">Son dönemde crash kaydı yok.</p>
                  ) : (
                    <div className="space-y-3">
                      {items.slice(0, 3).map((c) => (
                        <div key={c.crash_id} className="text-xs border-b border-gray-50 dark:border-slate-800 pb-2 last:border-0 last:pb-0">
                          <div className="flex items-center justify-between text-gray-400 dark:text-slate-500">
                            <span>{c.device_model ?? '—'} · {c.os_version ?? '—'}</span>
                            <span>{formatDate(c.occurred_at)}</span>
                          </div>
                          {c.comment && <p className="mt-1 text-gray-700 dark:text-slate-300">{c.comment}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        <p className="mt-2 text-[11px] text-gray-400 dark:text-slate-500">
          TestFlight ve Play Console&apos;ın kendi crash raporlarından okunuyor (günlük yenilenir) — mobil uygulamaya ayrı bir crash SDK&apos;sı entegre etmeye gerek kalmadı.
        </p>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <MessageSquare className="w-4 h-4 text-gray-400 dark:text-slate-500" />
          <h2 className="text-sm font-semibold text-gray-700 dark:text-slate-300">Mağaza değerlendirmeleri</h2>
          {reviewsLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />}
        </div>
        {reviewsError ? (
          <p className="text-xs text-[#9A3B3B]">{reviewsError}</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(['ios', 'android'] as const).map((platform) => {
              const status = reviewsData?.fetch_status?.[platform];
              const items = reviewsByPlatform(platform);
              return (
                <div key={platform} className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-5">
                  <p className="text-xs font-semibold text-gray-700 dark:text-slate-300 mb-3">{platform === 'ios' ? 'App Store' : 'Play Store'}</p>
                  {status && !status.ok ? (
                    <p className="text-xs text-amber-700 dark:text-amber-500">{status.error ?? 'Veri alınamadı.'}</p>
                  ) : items.length === 0 ? (
                    <p className="text-xs text-gray-400 dark:text-slate-500">Henüz değerlendirme yok.</p>
                  ) : (
                    <div className="space-y-3">
                      {items.slice(0, 3).map((r) => (
                        <div key={r.review_id} className="text-xs border-b border-gray-50 dark:border-slate-800 pb-2 last:border-0 last:pb-0">
                          <div className="flex items-center justify-between">
                            <StarRow rating={r.rating} />
                            <span className="text-gray-400 dark:text-slate-500">{formatDate(r.review_date)}</span>
                          </div>
                          {r.title && <p className="mt-1 font-medium text-gray-700 dark:text-slate-300">{r.title}</p>}
                          {r.body && <p className="mt-0.5 text-gray-500 dark:text-slate-400">{r.body}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        <p className="mt-2 text-[11px] text-gray-400 dark:text-slate-500">
          App Store Connect ve Play Console&apos;ın kendi değerlendirme API&apos;lerinden okunuyor, günlük yenilenir.
        </p>
      </div>
    </div>
  );
}
