// Kullanıcı raporu (25 Ekim 2026): exam-topic-practice sayfasında "Geri"
// butonları (hem sayfanın üstündeki hem BackHomeBar'daki) hiçbir şey
// yapmıyordu. Kök neden: ikisi de düz `router.back()` çağırıyordu — sayfa
// doğrudan bir linkten, yeni sekmede ya da sayfa yenilemesiyle açıldığında
// (ör. Program Haritası'ndan yeni sekmede açma, bir bildirim linki, ya da
// basit F5) bu sekme için uygulama İÇİNDE geri gidilecek bir önceki geçmiş
// kaydı olmuyor — `router.back()` ya hiçbir şey yapmıyor ya da uygulamanın
// DIŞINDAKİ bir sayfaya (ör. boş sekme) gidiyor; her iki durumda da
// kullanıcıya "buton çalışmıyor" gibi görünüyor.
//
// Çözüm: (app)/layout.tsx içinde (bkz. orada useAppNavDepthTracker) her
// gerçek uygulama-içi sayfa geçişinde sessionStorage'daki bir sayaç
// artırılıyor, tam sayfa yüklemesinde (yenileme/doğrudan link) sıfırlanıyor.
// "Geri" butonları artık bu sayacı okuyup gerçekten geri gidilecek bir
// uygulama-içi sayfa varsa router.back(), yoksa her zaman çalışan bir
// fallback rotasına router.push() yapıyor.
const APP_NAV_DEPTH_KEY = 'lx_app_nav_depth';

export function markAppNavReset() {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(APP_NAV_DEPTH_KEY, '0');
  } catch {
    // sessionStorage kapalı/kısıtlı olabilir (gizli sekme vb.) — sorun değil,
    // hasAppNavHistory() bu durumda zaten false dönüp fallback'e düşecek.
  }
}

export function markAppNavStep() {
  if (typeof window === 'undefined') return;
  try {
    const depth = parseInt(sessionStorage.getItem(APP_NAV_DEPTH_KEY) || '0', 10);
    sessionStorage.setItem(APP_NAV_DEPTH_KEY, String(depth + 1));
  } catch {
    // no-op
  }
}

function hasAppNavHistory(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return parseInt(sessionStorage.getItem(APP_NAV_DEPTH_KEY) || '0', 10) > 0;
  } catch {
    return false;
  }
}

/**
 * "Geri" butonları için güvenli geri gezinme: uygulama içinde gerçekten geri
 * gidilecek bir sayfa varsa router.back(), yoksa verilen fallback rotasına
 * router.push() yapar — böylece buton hiçbir koşulda "tepkisiz" kalmaz.
 */
export function safeBack(router: { back: () => void; push: (href: string) => void }, fallbackHref: string) {
  if (hasAppNavHistory()) {
    router.back();
  } else {
    router.push(fallbackHref);
  }
}