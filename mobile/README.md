# Lexis Mobile (React Native / Expo)

Lexis'in mobil uygulaması — Expo (managed workflow) + TypeScript + expo-router.
Backend, `web/` ile aynı FastAPI/Supabase altyapısını kullanır; ayrı bir API yok.

Kapsam ve karar gerekçeleri için: `lexis_mobil_uygulama_kapsam_ve_alert_stratejisi.md`
(proje kökünde, `lexis_kalan_isler_guncel.md`'nin yanında).

## Faz 1'de tamamlananlar

- Proje kurulumu (Expo SDK 57, expo-router, TypeScript)
- Auth: Giriş, Kayıt (2 adımlı: hesap + dil seçimi), OTP doğrulama, Şifremi unuttum, Şifre sıfırla
- Token saklama: `expo-secure-store` (Keychain/Keystore), 401'de otomatik çıkış
- i18n: web'in `lib/i18n.tsx`'inden **birebir üretilen** 9 dilin tamamı (`src/i18n/translations.json`),
  artı mobile-only ekler (OTP/bildirim izni/ağ durumu metinleri) ve oyun ekranı sözlüğü
  (web'in `game/page.tsx`'inden birebir taşındı)
- Dashboard: XP çubuğu, seri (streak) bildirimi, günlük özet, sıralama (leaderboard) önizlemesi
- Kelimeler: liste, arama, ekleme (sözlük entegrasyonlu), silme
- Kelime Oyunu: mod → yön → havuz seçimi, çoktan seçmeli + adam asmaca (wordle), gerçek API entegrasyonu
- Program (Schedule): günlere göre liste, ekleme, aç/kapat, silme
- Profil: bilgi düzenleme, çoklu dil yönetimi, arayüz dili seçimi, çıkış
- Push bildirim **altyapısının temeli**: izin soft-ask ekranı, Expo push token alma,
  backend'e kaydetme (`POST /api/v1/me/push-tokens` — bkz. `supabase/migrations/017_push_tokens.sql`).
  **Henüz hiçbir bildirim gönderilmiyor** — bu Faz 2/3'te sosyal olaylarla birlikte eklenecek.

## Faz 1'de kapsam dışı bırakılanlar (sonraki fazlar)

- Sosyal özellikler (arkadaşlık/takip/mesajlaşma/meydan okuma) — Faz 2
- Premium/abonelik ekranı (WebView checkout) — Faz 3
- Bildirim tercihleri ekranı (kategori bazlı aç/kapa) — Faz 3, backend'de tercih alanı gerekiyor
- Hazır program şablonları (web'deki `scheduleTemplates.ts`) — sadece kullanıcının kendi
  şablonları (oluştur/uygula/sil) destekleniyor, kürasyonlu hazır şablon listesi eklenmedi
- Tam native RTL (Arapça) — metin hizalaması `isRTL` bayrağıyla mevcut ama layout flip için
  uygulama yeniden başlatması gerekiyor, henüz otomatik tetiklenmiyor

## Kurulum

```bash
cd mobile
npm install
cp .env.example .env   # EXPO_PUBLIC_API_URL'i kendi backend adresine göre düzenle
npx expo start
```

Fiziksel telefonda test etmek için Expo Go uygulamasını kur, QR kodu okut — bilgisayar ve
telefon aynı Wi-Fi ağında olmalı ve `.env`'deki `EXPO_PUBLIC_API_URL` bilgisayarının LAN
IP'sini göstermeli (`localhost` telefonun kendisini işaret eder, backend'e ulaşamaz).

## Backend tarafında gereken değişiklik

Bu oturumda backend'e de bir değişiklik yapıldı — **backend'i yeniden başlatman gerekiyor**:

- `backend/app/api/routes/push_tokens.py` yeni eklendi
- `backend/app/main.py`'a router kaydı eklendi
- `supabase/migrations/017_push_tokens.sql` **canlıya uygulandı** (Supabase MCP ile,
  elle SQL çalıştırmana gerek yok)

## Bilinen sınırlamalar / store yayını öncesi yapılacaklar

- Uygulama ikonu (`assets/logo-icon.png`, 499×499) store'lar için önerilen 1024×1024
  boyutunun altında — store'a yayın öncesi (Faz 4) yüksek çözünürlüklü bir versiyon gerekiyor
- Android adaptive icon monochrome/background dosyaları hâlâ Expo'nun demo varlıkları —
  marka varlıklarıyla değiştirilmeli
- `eas.json` henüz oluşturulmadı (EAS Build/Submit için Faz 4'te gerekecek)
