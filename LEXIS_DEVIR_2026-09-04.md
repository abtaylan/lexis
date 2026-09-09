# Lexis — Devir Notu
**Tarih:** 4 Eylül 2026
**Repo:** `C:\Users\ytt\OneDrive\Masaüstü\PROJELER\lexis\lexis`
**Son commit:** `df39c42`

> Yeni sohbette ele alınacak iki konu: **§1 XP / oyun sömürüsü** ve **§2 AB trader status**.
> Geri kalan bölümler bağlam ve tekrar hata yapmamak içindir.

---

## 0. Bugün nerede kaldık

| Konu | Durum |
|---|---|
| iOS 1.0 (8) | ⏳ App Store — **Waiting for Review** (4 Eyl 10:50 gönderildi) |
| Android 5 (1.0.0) | ⏳ Play — Kapalı test Alpha, **İncelemede** |
| Kelime arama kutusunda yazı görünmemesi | ✅ Çözüldü, kullanıcı doğruladı |
| Sözlük "kelime bulunamıyor" | ✅ Çözüldü, kullanıcı doğruladı |
| iOS ana ekran logosu | ✅ Çözüldü, kullanıcı doğruladı |
| Android build hatası (Maven 429) | ✅ Çözüldü (`buildFromSource`) |
| **XP / oyun sömürüsü** | 🔴 **Açık — kullanıcı kararı bekliyor** |
| **AB trader status** | 🔴 **Açık — hiç kontrol edilmedi** |

Her iki mağazadaki build de bugünkü kodu içeriyor: doğru L logosu, `flex:1` düzeltmesi,
sözlük 404 yakalama, dil çifti etiketi, Profil'de sürüm satırı.

**Kurulu zamanlanmış görev:** "Lexis — App Store & Play inceleme takibi", 4 saatte bir,
her iki paneli kontrol edip değişiklik olursa push bildirimi gönderiyor.

---

## 1. 🔴 XP / OYUN SÖMÜRÜSÜ — ana konu

### Kullanıcının şikâyeti (kendi sözleriyle, sesli mesajdan)

> "Quizlerde mesela yanlış bilince puan gitmiyor. Bir tane soru bildin 4xp verdi,
> diğerini bilemedin, hâlâ 4xp. Veyahut kelime eşleştirme oyununda dehşet XP kazarsın.
> 4 tanesini eşleştiriyorsun anlamına göre, yanlış yaptığın şey düzeliyor, tekrardan
> doğrusunu deneye deneye. Rastgele sırf XP kasmak için sabahtan akşama kadar yaparsın.
> Böyle birinci olunca bir ödül vesaire varsa çok basit şekilde gelip XP kasarsın,
> seviye atlarsın. Yani insan bilinçli bir şekilde uygulamayı kullanmıyor. Mesela yanlış
> yapınca bir puan gidecek, eksi olacak ki kendisini geliştirebilsin. Yoksa adam sürekli
> hep artı puan, artı puan. Eksi olan hiçbir şey yok."

İki ayrı problem var:
1. **Quizlerde yanlış cevabın bedeli yok** — doğru bilince XP, yanlış bilince sıfır. Ceza yok.
2. **Eşleştirme oyunu sınırsız XP kaynağı** — deneme-yanılmayla eninde sonunda doğruyu
   buluyorsun, sadece doğru sonuç sunucuya gidiyor. Liderlik tablosu ve seviye anlamsızlaşıyor.

### Teknik kök neden (doğrulandı)

`backend/app/api/routes/games.py` — dosyanın kendi docstring'i şunu söylüyor:

> "typing", "matching", "listening", "sprint" modlarında **doğruluk kontrolü (is_correct)
> istemci tarafında hesaplanıp `/attempt`'e gönderilir."

Yani ara denemeler sunucuya **hiç ulaşmıyor**. Kullanıcı 5 kez yanlış, 6. kez doğru yapsa
sunucunun gördüğü tek şey "doğru". Cezalandırılacak bir veri yok — bu yüzden bu bir
"tek satırlık bug" değil, **mimari + oyun tasarımı meselesi**.

İlgili detaylar:
- `MAX_WRONG_GUESSES = 6` sabiti var ama yalnızca **wordle (adam asmaca)** modu için.
- XP mantığı `games.py` içinde yaklaşık 344-546 satırlarında (`award_xp`, `xp_awarded`).
  Bu aralık satır satır analiz edilmedi — yeni oturumda okunmalı.
- **`backend/app/api/routes/words.py` → `review_word` ZATEN DOĞRU:** `if review.success:`
  kontrolü var, yanlışta XP vermiyor. Flashcard tekrarı bu şikâyetin kapsamında değil,
  boşuna dokunma.

### Cevaplanması gereken tasarım soruları

Bunlar kullanıcıya sorulmalı, tahmin edilmemeli:

1. **Yanlış cevabın bedeli ne olsun?** Sadece XP vermemek mi, yoksa XP düşmek mi
   (kullanıcı "eksi olacak" diyor ama toplam XP'nin eksiye düşmesi mi, yoksa o turdan
   kazanılanın azalması mı belirsiz)?
2. **Eşleştirmede kaç yanlış hakkı olsun?** Hak bitince tur biter mi, XP sıfırlanır mı?
3. **Ara denemeler sunucuya gönderilsin mi?** Gönderilmezse sunucu tarafında hiçbir
   koruma kurulamaz — istemciye güvenmek zorunda kalırız. Gönderilirse `/attempt`
   sözleşmesi ve istemci tarafı oyun kodları değişir (`mobile/src/app/(app)/game.tsx`
   ~40 KB, `quiz.tsx` ~12 KB).
4. **Liderlik tablosu geriye dönük düzeltilsin mi?** Şu ana kadar kasılmış XP duruyor.

### Önerilen yaklaşım (kullanıcı onayı sonrası)

Sunucu otoritesine geçmek doğru çözüm: doğru cevabı istemciye hiç göndermemek, cevabı
sunucuda doğrulamak. Ama bu büyük bir refactor. Ara adım olarak ara denemelerin de
`/attempt`'e gönderilmesi ve sunucunun "ilk denemede doğru mu" bilgisine göre XP vermesi
çok daha küçük bir değişiklikle sömürüyü kapatır.

---

## 2. 🔴 AB TRADER STATUS — ikinci konu

App Store Connect ana sayfasında duran uyarı:

> "Starting October 16, 2024, developers must provide their trader status to submit new
> apps or app updates for distribution in the European Union. To comply with the Digital
> Services Act, go to the Business section by February 17, 2025, to provide your trader
> status or your apps will be removed from the App Store in the EU."

**Durum:** Hiç kontrol edilmedi. Doldurulmamışsa AB dağıtımı engellenir; şu anki gönderim
kabul edilse bile AB'de yayınlanamayabilir.

**Nereye bakılacak:** App Store Connect → **Business** bölümü.

**Ayrıca kontrol edilmeli:** Google Play'de de eşdeğer bir "trader status" / DSA beyanı
zorunluluğu var (Play Console → Politika ve programlar veya Hesap ayrıları). İkisi ayrı
ayrı doldurulur.

**Not:** Bu bir yasal/uyum konusu. Kullanıcı bireysel geliştirici hesabı (Individual,
Apple Team P54655N2D7). "Trader" mı "non-trader" mı olduğu ticari faaliyet durumuna göre
değişir ve bu hukuki bir belirlemedir — kullanıcı kendi durumuna göre seçmeli, Claude
onun yerine karar vermemeli. Sadece nereye gidileceği ve seçeneklerin ne anlama geldiği
anlatılabilir.

---

## 3. Bugün yapılan düzeltmeler (bağlam)

| Sorun | Kök neden | Çözüm |
|---|---|---|
| Arama kutusunda yazı görünmüyor | Stilde `flex: 1` → `flexBasis: 0`; kapsayıcının yüksekliği auto olduğu için TextInput'un içerik yüksekliği 0'a çöküyordu. Kutu padding sayesinde normal görünüyor ama harf çizilecek yer yok | `flex: 1` kaldırıldı |
| Sözlük "kelime bulunamıyor" | (a) Cihazda aktif öğrenme dili **Almanca**'ydı, İngilizce kelime aranıyordu. (b) `dictionary.py` anlam bulamayınca **HTTP 404** fırlatıyor, axios bunu istisna sayıp `catch`'e atlıyor, backend'in mesajı hiç görünmüyordu | `catch` 404'ü "bulunamadı" olarak yorumluyor; "Kelime" etiketinde aktif dil çifti gösteriliyor (`EN → TR`); sözlük çağrısı timeout'u 60 sn |
| iOS ana ekran logosu eski | `assets/app-icon.png` dosyasının **içeriği** yanlış tasarımdı (maskot). Build hattı hep doğru çalışıyordu | Doğru L logosundan kenardan kenara lacivert, alfasız ikon üretildi |
| Android build çöküyor | Expo SDK 53+ Android modülleri Maven Central'dan hazır AAR olarak indiriyor; Maven **429** dönüyordu | `package.json` → `expo.autolinking.android.buildFromSource: [".*"]` |
| Profil'de "Sürüm: ? (?)" | `Constants.nativeAppVersion` bu expo-constants sürümünde kaldırılmış | `expo-application` kullanılıyor |

---

## 4. ⛔ Tekrar denenmemesi gerekenler

1. "İkon build/cache sorunu" → **yanlış**. Pipeline doğruydu, dosyanın içeriği yanlıştı.
   Bir varlığın doğru üretildiğini kanıtlamak, doğru varlık olduğunu kanıtlamaz.
2. "iOS'ta Cambridge kelimeyi bulamıyor" → **yanlış**. Aktif dil + 404 sorunu.
3. "Arama kutusu FlatList re-render'ından" → `React.memo`/`useCallback` eklendi, çözmedi.
4. `eas build --clear-cache`, telefon restart, Ana Ekran Düzenini Sıfırla → ikonu düzeltmedi.
5. `Constants.nativeAppVersion` / `nativeBuildVersion` → bu sürümde yok.

## 5. Ortam kısıtları

- Kullanıcının Windows makinesinde **`device_bash` yok** — komutlar kullanıcıya verilmeli.
- Sandbox'tan rastgele domaine **`curl` engelli**; **`WebFetch` çalışıyor** (canlı API
  testleri böyle yapıldı).
- **`device_stage_files` yerel düzenlemeleri EZER** — bir dosyayı düzenledikten sonra
  tekrar stage etme, değişiklikler kaybolur (bu oturumda bir kez oldu).
- **App Store Connect uzun metin yazarken donuyor.** 2500 karakteri `type` ile yazmak
  renderer'ı kilitledi. Çözüm: `javascript_tool` ile textarea'nın value'sunu native
  setter üzerinden set edip `input` + `change` event dispatch etmek. Tek çağrıda çalışıyor.
  (Not: ASC'deki karakter sayacı **kalan** karakteri gösteriyor, kullanılanı değil —
  4000 limit üzerinden.)
- Expo build sayfasında log satırına tıklamak **toggle**; içerik gelmiyorsa tek sayıda
  tıklandığından emin ol. Sayfa ağır, `screenshot` zaman aşımına uğrayabiliyor.
- **IPA/AAB web'den yüklenemez.** Windows'ta tek yol `eas submit`. iOS için ASC API Key
  EAS sunucularında kurulu (Key ID `TT3LBPRG97`), `eas submit --platform ios` çalışıyor.
  **Android için Google Service Account JSON hâlâ YOK** — Play'e yükleme elle yapılıyor.

## 6. Kimlikler / sabitler

| | |
|---|---|
| Bundle ID | `app.lexis.mobile` |
| EAS project ID | `06c954fe-baae-4671-a38f-8d053d954fad` |
| ASC App ID | `6806612758` |
| Apple Team | P54655N2D7 (Individual) |
| Play developer | 9216436788787157740 · app 4976178569042711201 |
| Backend | `https://lexis-production-6a53.up.railway.app` |
| Demo hesap | `mobiltest@test.com` / `Lexis2026Test!` (OTP hep 123456) |
| Kapalı test | 15 kayıtlı test kullanıcısı, liste: "Lexis test kullanıcıları" |

---

## 7. Yeni sohbette başlangıç

Önce **§1**: `backend/app/api/routes/games.py` (özellikle 344-546 arası) ve
`mobile/src/app/(app)/game.tsx` + `quiz.tsx` okunup XP akışı çıkarılmalı, sonra §1'deki
dört tasarım sorusu kullanıcıya sorulmalı. Kod yazmadan önce karar alınmalı.

Sonra **§2**: App Store Connect → Business ve Play Console'daki DSA/trader beyanı
kontrol edilmeli. Karar kullanıcının.
