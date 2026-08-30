# Lexis — Kalan İşler (Güncel Durum)

_Son güncelleme: 29 Ağustos 2026 — bu oturumda canlı kontrol edilmiştir (Railway, Vercel, GitHub, Google Play Console, App Store Connect)._

---

## ✅ Bu oturumda tamamlananlar

- **KVKK Aydınlatma Metni** sayfası oluşturuldu (`landing/src/app/kvkk/page.tsx`), footer'a bağlandı.
- **Kullanım Şartları** sayfası oluşturuldu (`landing/src/app/kullanim-sartlari/page.tsx`), footer'a bağlandı.
- **Ödeme logoları** (Visa, Mastercard, American Express) resmi kaynaklardan (Wikimedia Commons) sağlandı; yer tutucuların yerine kondu:
  - `landing` footer (lexiswords.com)
  - `web` Premium ödeme ekranı (`app.lexiswords.com/premium`)
  - Not: **Troy logosu hâlâ eksik** — resmi kaynak bulunamadı, BKM/Troy'dan marka izni istenmesi gerekiyor (aşağıda ayrı madde).
- **Teslimat/İade Şartları** sayfasındaki iade süresi yer tutucusu kaldırıldı → **14 gün** olarak sabitlendi.
- **Dashboard tasarımı** onaylanan tasarım canvas'ıyla (`Main.dc.html`) birebir eşleşecek şekilde yeniden yazıldı: gradyan header, avatar, gömülü seri/seviye kartları, ikonlu 3'lü aksiyon grid'i, özel dashboard sekme ikonu. `expo-linear-gradient` paketi eklendi. `tsc --noEmit` temiz, ekran görüntüleri yeni tasarımla eşleşecek şekilde yeniden üretildi ve tarafınıza gönderildi (`dashboard-6.7in.png`, `dashboard-6.5in.png`).
- **Canlı doğrulama** yapıldı (daha önce yanlış raporladığım maddeler düzeltildi):
  - Apple credentials (`APPLE_ISSUER_ID` / `APPLE_KEY_ID` / `APPLE_PRIVATE_KEY_P8`) → Railway'de mevcut ✅
  - Gerçek AdMob birim ID'leri → `app.json`'da mevcut ✅
  - `CRON_SECRET` → Railway + Vercel + GitHub Actions secrets, 3/3 doğrulandı ✅
  - Domain (lexiswords.com) → satın alınmış ve canlı ✅

---

## 🧑‍💻 Sizin yapmanız gerekenler

1. **Git commit/push** — bu oturumda yazılan tüm dosyalar yerel repoda duruyor, henüz commit edilmedi. VS Code'da:
   ```
   cd "C:\Users\ytt\OneDrive\Masaüstü\PROJELER\lexis\lexis"
   git status
   git add -A
   git commit -m "KVKK/Kullanım Şartları sayfaları, resmi ödeme logoları, iade süresi, dashboard yeniden tasarım"
   git push
   ```
2. **App Store ekran görüntüleri yükleme** — hem bulut tarayıcıda hem bilgisayarınıza bağlı tarayıcıda App Store Connect'te aktif oturum bulunamadı (Apple 2FA gerektiriyor, şifre/kimlik bilgisi girmem güvenlik kuralları gereği yasak). İki seçenek:
   - Siz `appstoreconnect.apple.com`'a giriş yapın (2FA ile), ardından devam edip yüklemeyi ben yaparım, **veya**
   - Size gönderilmiş olan `dashboard-6.7in.png` ve `dashboard-6.5in.png` dosyalarını kendiniz, App Store Connect → Lexis → App Store sekmesi → ilgili sürüm → "iPhone 6.7" Display" / "iPhone 6.5" Display" ekran görüntüsü alanlarına yükleyin.
3. **`eas build`** — `expo-linear-gradient` yeni native bağımlılık olarak eklendiği için, bir sonraki build'in bu değişikliği doğru şekilde alıp almadığının kontrol edilmesi gerekiyor.

---

## ⏳ Bloke / dış etkene bağlı (aksiyon şu an mümkün değil)

- **`GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`** — Google Play Console hesabınızın tamamı (uygulama oluşturma, API erişimi, telefon doğrulama dahil) Google'ın kimlik doğrulama incelemesi tamamlanana kadar kilitli. Sonuç e-posta ile size gelecek. Geldiğinde: Play Console'da uygulama oluşturma → Ayarlar → API erişimi → yeni Google Cloud servis hesabı bağlama → JSON anahtarı üretme adımlarında size eşlik ederim; **JSON değerini Railway'e girme işlemini güvenlik kuralım gereği siz yapmanız gerekecek** (API anahtarlarını hiçbir alana benim girmem yasak, bunu siz istemiş olsanız bile).

---

## 📋 Orta/uzun vadeli (şu an aktif çalışılmıyor, hatırlatma amaçlı)

- iyzico 401 hatası çözümü
- iyzico üye iş yeri başvurusunun sonucu bekleniyor
- Döviz bazlı Premium (USD/EUR) — kod hazır, iyzico'da plan oluşturma üye iş yeri onayına bağlı
- Troy logosu / marka izni — BKM/Troy'dan resmi izin istenmesi gerekiyor
- Ek oyun modları
- Backend otomatik testler
- Kalan sosyal medya hesap kurulumları

---

_İyi çalışmalar — yarın `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` ve App Store ekran görüntüsü yüklemesinden devam edebiliriz._
