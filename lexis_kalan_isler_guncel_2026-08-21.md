# Lexis — Güncel Durum ve Kalan İşler (21 Ağustos 2026)

Bu dosya, önceki `lexis_kalan_isler_guncel.md` dosyasının devamı niteliğindedir. En son oturumda ele alınan 3 madde (mobil giriş hatası, dil bazlı ekran görüntüleri, ek oyun modları) burada güncel durumlarıyla özetlenmiştir.

---

## 1. Mobil uygulama giriş hatası — devam ediyor, yeniden teşhis gerekiyor

**Bugüne kadar yapılanlar:**
- `mobile/.env` içindeki `EXPO_PUBLIC_API_URL`, `http://localhost:8000` yerine bilgisayarın LAN IP'sine (`http://192.168.1.120:8000`) çevrildi (manuel olarak, `.env` dosyalarına uzaktan yazma izni olmadığı için).
- `mobile/app.json` içindeki `extra.apiUrl` aynı şekilde güncellendi.
- Backend, `--host 0.0.0.0` ile başlatılarak LAN'dan erişilebilir hale getirildi.
- `npx eas-cli update --branch preview --environment preview` ile OTA (over-the-air) güncelleme yayınlandı.
- Tabletin tarayıcısından `http://192.168.1.120:8000/docs` başarıyla açıldı — ağ bağlantısı ve backend erişimi çalışıyor.
- Kök neden olarak **Android'in "cleartext traffic" (şifrelenmemiş HTTP) kısıtlaması** tespit edildi: Android 28+ işletim sistemleri, uygulamanın kendi ağ isteklerinde HTTPS olmayan adreslere bağlanmasını varsayılan olarak engelliyor — bu, sistem tarayıcısını etkilemiyor (o yüzden `/docs` açılabildi) ama uygulamanın kendi login isteğini backend'e hiç ulaştırmıyordu (backend logunda login isteği hiç görünmüyordu).
- Düzeltme: `mobile/app.json` → `expo.android.usesCleartextTraffic: true` eklendi. **Bu değişiklik native/manifest seviyesinde olduğu için sadece `eas build` ile (yeni bir APK derlemesiyle) etkili olur — OTA update ile YAYILMAZ.**

**Şu an durum:** Kullanıcı "hala aynı hata devam ediyor" bildirdi. En olası açıklama: yeni `eas build` ya tamamlanmadı, ya da tamamlandı ama tablet üzerindeki eski APK silinip yenisi kurulmadı.

**Yapılması gerekenler (bkz. sohbetteki "önce çalıştırılacak komutlar" bölümü):**
1. `npx eas-cli build --platform android --profile preview` komutunun başarıyla tamamlandığından emin ol.
2. Derlenen yeni APK'yı indir, tablet üzerindeki **eski sürümü kaldırıp** yenisini kur.
3. Uygulamayı tamamen kapatıp yeniden aç, girişi tekrar dene.
4. Hâlâ aynı hata alınıyorsa: `adb logcat` ile "CLEARTEXT" ifadesini ara — eğer bu ifade artık çıkmıyorsa sorun cleartext değil, başka bir şeydir (backend'in çalışır durumda olup olmadığını, IP'nin değişip değişmediğini — `ipconfig` ile tekrar kontrol et — ve tablet ile bilgisayarın hâlâ aynı Wi-Fi ağında olduğunu doğrula).

---

## 2. Dil bazlı ekran görüntüleri (landing sayfası, Madde 5) — devam ediyor

**Tamamlanan:** İngilizce (`en`) ekran görüntüleri (dashboard, words, game) çekildi, 900×577 formatına kırpılıp `landing/public/screenshots/en/` klasörüne kondu; `Hero.tsx` ve `Showcase.tsx` locale'e göre bu görselleri gösterecek şekilde güncellendi.

**Yeni iş akışı (kullanıcının isteği üzerine):** Önceki oturumda tek bir test hesabının (`testlexis`) dilini değiştirip geri almak riskli ve yavaş olduğu için, kalan 7 dil (Almanca, Fransızca, İspanyolca, İtalyanca, Rusça, Arapça, Japonca) için **backend'de doğrudan 7 ayrı test hesabı** oluşturuldu. Kimlik bilgileri sohbette sırayla paylaşıldı; kullanıcı Claude'un işaretiyle bu hesaplarla tek tek tarayıcıdan giriş yapacak (parola girişini güvenlik politikası gereği Claude yapmıyor).

**Oluşturulan 7 hesap** (kullanıcı adları `testlexis_<dil kodu>` formatında, native_lang ilgili dile, learning_lang `en`'e ayarlı, her birine 4 kelimelik bir "Kendi Kelimelerim" havuzu eklendi — genel havuz sadece Türkçe hedef dil için dolu olduğundan bu gerekli):

| Dil | Kullanıcı adı | Durum |
|---|---|---|
| Almanca (de) | testlexis_de | Oluşturuldu, giriş bekleniyor |
| Fransızca (fr) | testlexis_fr | Oluşturuldu, giriş bekleniyor |
| İspanyolca (es) | testlexis_es | Oluşturuldu, giriş bekleniyor |
| İtalyanca (it) | testlexis_it | Oluşturuldu, giriş bekleniyor |
| Rusça (ru) | testlexis_ru | Oluşturuldu, giriş bekleniyor |
| Arapça (ar) | testlexis_ar | Oluşturuldu, giriş bekleniyor |
| Japonca (ja) | testlexis_ja | Oluşturuldu, giriş bekleniyor |

Parolalar ve e-postalar (güvenlik açısından bu dosyaya değil) sohbet geçmişinde yer alıyor. OTP kodu hepsinde sabit: `123456`.

**Kalan adımlar (her dil için tekrarlanacak):** Kullanıcı ilgili hesapla giriş yapar → Claude ekran görüntülerini alır → 900×577'ye kırpıp `landing/public/screenshots/<dil>/` klasörüne koyar → `Hero.tsx`/`Showcase.tsx`'teki `screenshotSrc` fonksiyonuna o dil için bir dal daha eklenir.

---

## 3. Ek oyun modları — Web tarafında TÜMÜ tamamlandı

Daha önce sadece **Yazma (Typing)** modu vardı. Bu oturumda **Dinleme (Listening)**, **Sprint** ve **Eşleştirme (Matching)** modları da `web/src/app/(app)/game/page.tsx` dosyasına eklendi — artık backend'in desteklediği 6 modun (Çoktan Seçmeli, Adam Asmaca, Yazma, Dinleme, Sprint, Eşleştirme) hepsi web arayüzünde oynanabilir durumda.

- **Dinleme:** Kelime tarayıcının yerleşik seslendirme özelliğiyle (Web Speech API) okunuyor, kullanıcı duyduğunu yazıyor. Anlam küçük bir ipucu olarak altta gösteriliyor.
- **Sprint:** Yazma moduyla aynı mekanik, ama 60 saniyelik bir geri sayımla — süre dolunca oturum otomatik bitiyor. Ne kadar çok doğru kelime yazılırsa o kadar XP.
- **Eşleştirme:** Her turda 4 kelime çekilip iki sütun halinde (kelimeler / anlamlar) karışık gösteriliyor, kullanıcı tıklayarak eşleştiriyor; tur bitince yeni 4 kelime çekiliyor.
- Hepsi 9 dile (tr/en/ar/ru/de/fr/es/it/ja) çevrildi.
- **Backend'de hiçbir değişiklik gerekmedi** — `games.py`'deki `next-word` endpoint'i bu üç mod için zaten genel bir kelime+anlam yanıtı döndürüyordu, XP tabloları da zaten hazırdı (bir önceki oturumda doğrulanmıştı).

**Not / kapsam kararı:** Bu iş **sadece web** tarafında yapıldı. Mobil uygulamada (`mobile/`) şu an sadece Adam Asmaca ve Çoktan Seçmeli var; Yazma/Dinleme/Sprint/Eşleştirme mobile'a henüz taşınmadı. Ekran görüntüleri web üzerinden alındığı ve mobil tarafın öncelik sırası kullanıcı tarafından netleştirilmediği için bu bilinçli bir kapsam sınırlaması — istenirse bir sonraki adım olarak mobile de eklenebilir.

**Aktive etmek için komut gerekmiyor** — dosya doğrudan proje klasörüne yazıldı, Next.js dev sunucusu değişikliği otomatik yakalayıp hot-reload yapacaktır (sunucu çalışmıyorsa `web` klasöründe `npm run dev`).

---

## Devam eden / hızlı kapanabilecek maddeler (önceki dosyadan taşınan)

- **iyzico 401 Unauthorized hatası:** Kod tarafında (imza/HMAC mantığı, `.env` CRLF bozulması ihtimali) hiçbir hata bulunamadı — ikisi de doğrulandı ve temiz çıktı. Kalan olası nedenler hesap/ortam kaynaklı: API key/secret'ın `https://api.iyzipay.com` (canlı) ortamı için doğru olup olmadığı, iyzico panelinde "Subscription" (abonelik) modülünün aktif olup olmadığı, IP allowlist kısıtlaması, veya sunucu saat senkronizasyonu. Kesin teşhis için scriptin canlı çalıştırılıp iyzico'nun döndürdüğü tam hata gövdesinin görülmesi gerekiyor.

## Büyük, henüz başlanmamış işler

- Mobil Faz 2/3/4 (önceki dosyada listelenen kapsam).
- Ek oyun modlarının mobile'a taşınması (yukarıda not edildi).
