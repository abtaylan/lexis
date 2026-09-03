# Lexis — Devir Notu / Kalan İşler
**Tarih:** 3 Eylül 2026
**Repo:** `C:\Users\ytt\OneDrive\Masaüstü\PROJELER\lexis\lexis`
**Son commit:** `cd50cfe` · **Son iOS build:** 1.0.0 (7) — `3681e052-593c-4481-a84b-26d93ca478fe`

> Bu dosya yeni sohbete devir içindir. **Önce "Tekrar Denenmemesi Gerekenler" bölümünü oku** — aynı yanlış teoriler tekrar denenmesin.

---

## 1. AÇIK SORUN: iOS ana ekran ikonu eski kalıyor 🔴

### Belirti
iOS ana ekranda **eski logo** görünüyor. Uygulamanın **içindeki** logo doğru. Android'de sorun yok.

### Kanıtlanmış olanlar (bunları tekrar doğrulamaya gerek yok)
| Kontrol | Yöntem | Sonuç |
|---|---|---|
| Kaynak dosya `mobile/assets/app-icon.png` | PIL ile piksel analizi | ✅ 1024×1024, **alfa kanalı yok**, tüm köşeler `#071D45` lacivert |
| `app.json` ikon ayarı | Dosya okuma | ✅ hem `icon` hem `ios.icon` → `./assets/app-icon.png` |
| `app.config.js` override'ı var mı | Dizin listeleme | ✅ Yok — sadece `app.json` var |
| EAS build gerçekten prebuild yapıyor mu | Build log'u (Prebuild adımı açıldı) | ✅ `Creating native directory (./ios)` + `Running prebuild` + `Finished prebuild` — cache'den geçmiyor |
| Build gerçekten yeni kaynakla mı derlendi | Build metadata | ✅ commit `cd50cfe`, versiyon 1.0.0 (7), toplam 6dk 29sn gerçek derleme |
| **IPA'nın içindeki gerçek ikon** | IPA açıldı → `Payload/Lexis.app/AppIcon60x60@2x.png` ve `AppIcon76x76@2x~ipad.png` Apple'ın CgBI formatından **özel yazılan decoder ile** çözüldü | ✅ **Doğru ikon** — lacivert, maskot, dört köşe `#071D45` |

### Doğrulanamayan tek nokta
`Info.plist` şunu içeriyor: `CFBundleIcons → CFBundlePrimaryIcon → CFBundleIconName: "AppIcon"`.
Modern iOS ana ekran ikonunu buradan, yani **`Assets.car`** (derlenmiş asset catalog) içindeki `AppIcon` setinden okur — yukarıda doğrulanan gevşek PNG'ler **eski/yedek mekanizmadır**.
`Assets.car` Apple'ın tescilli CoreUI binary formatında; sandbox'ta çözülemedi (PNG imzası yok, ImageMagick "unhandled critical chunk CgBI" veriyor, PyPI'da çalışan parser yok).
→ **Bir sonraki oturumun ilk işi bu olmalı.** Aynı `actool` çağrısında aynı kaynaktan üretildikleri için bozuk olma ihtimali düşük ama **kanıtlanmadı**.

### Kullanıcının denediği ve İŞE YARAMAYAN adımlar
1. Uygulamayı silip yeniden kurma
2. `eas build --profile preview --platform ios --clear-cache` ile yeni build
3. Telefonu tamamen kapatıp açma (restart)
4. Ana Ekran Düzenini Sıfırla

### Sıradaki somut adımlar
1. **`Assets.car` içindeki `AppIcon`'u çöz.** IPA elde: kullanıcı `.rar` olarak gönderebiliyor. Seçenekler: BOM/CoreUI formatını elle parse etmek, ya da kullanıcıya Windows'ta çalışan bir asset-catalog aracı önermek.
2. **Profil ekranındaki yeni "Sürüm" satırını kullan** (bkz. §3). Yeni build kurulduğunda sürüm `1.0.0 (8)` göstermiyorsa → telefon yeni build'i hiç kurmuyor demektir, sorun tamamen başka yerde.
3. `expo prebuild --clean` ile **yerelde** `ios/` klasörünü üretip `ios/Lexis/Images.xcassets/AppIcon.appiconset/` içine bakmak — orada ne olduğunu doğrudan görmek (Windows'ta çalışır, Mac gerekmez).

---

## 2. ÇÖZÜLDÜ (test bekliyor): iOS'ta sözlük "kelimeyi bulamıyor" 🟡

### Belirti
iOS'ta `try`, `bus` gibi kelimelerde "Sözlükte bulunamadı. Elle girebilirsin." çıkıyor. Android'de aynı kelimeler bulunuyor.

### GERÇEK KÖK NEDEN (3 Eylül'de bulundu)
**Sözlük çalışıyor. İstek zaman aşımına uğruyordu.**

Canlı API doğrudan test edildi:
```
GET /api/v1/dictionary/lookup?word=try&learning_lang=en&native_lang=tr → 10 anlam, error: null, source: "cambridge"
GET /api/v1/dictionary/lookup?word=bus&learning_lang=en&native_lang=tr →  4 anlam, error: null, source: "cambridge"
```

Arayüzdeki **"Sözlükte bulunamadı"** metni (`lookupNotFound`) kodda **yalnızca `catch` bloğundan** geliyordu. Yani backend "kelime yok" demiyordu — **istek hiç tamamlanmıyordu**. Backend Cambridge'i sırayla scrape ediyor; Railway konteyneri soğuksa süre `client.ts`'teki genel **20 sn** timeout'u aşıyor, axios istisna fırlatıyor, kullanıcı bunu "kelime sözlükte yok" sanıyordu. Android'de sadece istek zamanında yetiştiği için çalışıyor gibi görünüyordu — platform farkı değil, **zamanlama yarışı**.

### Yapılan düzeltmeler (commit edildi, build bekliyor)
- `mobile/src/api/words.ts` → `dictionaryApi.lookup` için timeout **60 sn**'ye çıkarıldı (sadece bu çağrı için).
- `mobile/src/app/(app)/words.tsx` → `catch` bloğu artık nedeni ayırt ediyor:
  - zaman aşımı → *"Sözlük sunucusu zamanında yanıt vermedi..."*
  - ağ hatası → *"Bağlantı hatası: sözlüğe ulaşılamadı..."*
  - Böylece bir daha "kelime yok" ile "istek düştü" karışmayacak.

### Kalıcı iyileştirme önerisi (henüz yapılmadı)
Backend'de sözlük sonuçlarını **cache'lemek** (aynı kelime ikinci kez sorulunca anında dönsün). Şu an her arama Cambridge'i baştan scrape ediyor — asıl yavaşlık kaynağı bu.

---

## 3. ÇÖZÜLDÜ (test bekliyor): Kelime Listesi arama kutusunda yazı görünmüyor 🟡

### Belirti
Kelime Listesi'nin üstündeki arama kutusuna yazınca **harfler görünmüyor**. Ama liste doğru filtreleniyor ve iOS klavyesi yazılanı tahmin ediyor. Hem iOS hem Android'de.

### GERÇEK KÖK NEDEN (3 Eylül'de bulundu)
`words.tsx`'te arama kutusunun stilinde **`flex: 1`** vardı.

`flex: 1` = `flexBasis: 0`. Bu TextInput'un kapsayıcısı (`TextField.tsx` içindeki `inputWrap` View'ı) **sabit yüksekliğe sahip değil**, yüksekliğini içeriğinden alıyor. Yüksekliği `auto` olan bir kapsayıcıda `flexBasis: 0` olan çocuğun **içerik yüksekliği 0'a çöküyor**:
- Kutu ekranda normal boyutta görünüyor ✅ (padding + border yerinde)
- Ama yazının çizileceği alan **0 piksel** ❌

Bu yüzden: state güncelleniyor → liste filtreleniyor → klavye tahmin ediyor → **ama harfler çizilmiyor**. Kullanıcının son ekran görüntüsündeki **mavi seçim bloğu** bunu doğruladı: metin var, sadece çizilecek yeri yok.

Modal'daki "Kelime" alanının çalışmasının sebebi de bu: onda `flex: 1` yok.

### Yapılan düzeltme (commit edildi, build bekliyor)
`flex: 1` kaldırıldı. Genişlik zaten `TextField`'ın dış View'ındaki `width: '100%'` ile geliyor, `flex`e gerek yok. Renk de garantiye almak için açıkça verildi.

### ⚠️ Not
Bundan önceki 3 deneme (debounce, `React.memo` + `useCallback` ile FlatList optimizasyonu, kutu boyutunu büyütme) **yanlış teorilere** dayanıyordu ve kök nedene dokunmuyordu. Hepsi kodda duruyor — zarar vermiyorlar ama sorunu çözen bunlar değil.

---

## 4. TEST BEKLEYEN diğer düzeltmeler

| Konu | Dosya | Durum |
|---|---|---|
| Dashboard/Flashcards'ta sayaçların güncellenmemesi ("gir-çık gir-çık") | `dashboard.tsx`, `flashcards.tsx` | `useFocusEffect` eklendi — Expo Router sekmeleri unmount olmadığı için veri sadece ilk açılışta çekiliyordu. **Kullanıcı son raporlarda bundan şikâyet etmedi → muhtemelen düzeldi.** |
| "Anlam" alanına kelimenin kendisinin yazılması | `backend/.../dictionary_service.py` | MyMemory çeviri bulamayınca girdiyi aynen geri döndürüyordu; gerçek-çeviri kontrolü eklendi. Deploy edildi. |
| Modal'da klavyenin alanları kapatması | `words.tsx` | `ScrollView` + `KeyboardAvoidingView` + `maxHeight: '90%'` eklendi |
| Modal'da eski arama sonucunun kalması | `words.tsx` | Modal her açıldığında state sıfırlanıyor |
| Dashboard karşılamasının hep "Günaydın" olması | `dashboard.tsx` | Saate göre 4 farklı metin |

## 5. YENİ EKLENDİ: Sürüm göstergesi

`profile.tsx` → Hesap Bilgileri kartına **"Sürüm"** satırı eklendi (`Constants.nativeAppVersion` + `nativeBuildVersion`).
10 dile çeviri eklendi (`translations.json` → `appVersionLabel`).

**Neden önemli:** Bu, "telefonda gerçekten hangi build kurulu?" sorusunu tahminden çıkarıyor. Yeni build kurulduktan sonra Profil'deki numara artmıyorsa, sorun kodda değil — kurulum yeni binary'yi getirmiyor demektir.

---

## 6. HENÜZ BAŞLANMADI

### 6.1 XP / oyun sömürüsü (kullanıcı kararı bekliyor)
- Quizlerde **yanlış cevabın cezası yok** — yanlış yapınca puan gitmiyor.
- Eşleştirme oyununda **deneme-yanılma ile sınırsız XP** kasılabiliyor.
- **Kök neden:** `backend/app/api/routes/games.py` docstring'inde yazdığı gibi, `typing`/`matching`/`listening`/`sprint` modlarında **doğruluk istemci tarafında hesaplanıp** yalnızca son (doğru) deneme `/attempt`'e gönderiliyor. Ara yanlış denemeleri sunucu hiç görmüyor → cezalandıracak bir şey yok.
- **Bu bir oyun tasarımı kararı**, tek satırlık bug değil. Kullanıcıya sorulan ama henüz cevaplanmayan sorular: kaç yanlış hakkı olsun, XP eksiye düşsün mü, eşleştirmede yanlış denemeler sunucuya gönderilsin mi?
- Not: `words.py`'deki flashcard tekrarı **zaten doğru** — `if review.success` kontrolü var, yanlışta XP vermiyor.

### 6.2 App Store Connect gönderimi
- **Red sebebi:** Guideline 5.1.1(v) — hesap silme.
- **Gerçek durum:** Apple **eski build 4'ü** incelemiş; hesap silme özelliği ve demo hesap notları o build'den sonra eklenmiş, build 5 hiç gönderilmemiş.
- **Kalan iş:** production build → kullanıcının hesap silme akışını fiziksel cihazda ekran kaydı alması → App Review notlarını güncelleyip yeni build'i iliştirmek → göndermek.
- ⚠️ Gönderim/Apple'a cevap gibi geri alınamaz adımlar **kullanıcının açık onayı olmadan yapılmayacak**.

### 6.3 Küçük iş
`git` geçmişine istemeden girmiş görünen bir dosya var: `Claude outputs/screenshot-1788420166564-0.jpg`. Kullanıcıya sorulup temizlenebilir.

---

## 7. TEKRAR DENENMEMESİ GEREKENLER ⛔

Bunlar denendi ve **çalışmadı / yanlış çıktı**:

1. **"iOS ikon önbelleği, silip yeniden kurunca temizlenir"** → kullanıcı yaptı, düzelmedi.
2. **"`eas build --clear-cache` ikonu düzeltir"** → kullanıcı yaptı, düzelmedi. (`--clear-cache` bağımlılık cache'ini temizler, ikonla ilgisi yok.)
3. **"EAS fingerprint cache prebuild'i atlıyor"** → build log'u açıldı, prebuild gerçekten çalışıyor. Teori **yanlış**.
4. **"Prebuild 1 saniye sürmesi şüpheli"** → değil; modern Xcode tek 1024px ikon kullanıyor, boyut boyut resize yok.
5. **"İkonun alfa kanalı beyaza flatten ediliyor"** → dosyada **alfa kanalı yok**, teori **geçersiz**.
6. **Telefonu restart etmek** → kullanıcı yaptı, düzelmedi.
7. **"Arama kutusu sorunu FlatList re-render'ından"** → `React.memo`/`useCallback` eklendi, düzelmedi. Gerçek sebep `flex: 1` (bkz. §3).
8. **"iOS'ta Cambridge kelimeyi bulamıyor"** → canlı API testi bunun **yanlış** olduğunu kanıtladı; sorun timeout (bkz. §2).

### Ortam kısıtları (zaman kaybetmemek için)
- Kullanıcının Windows makinesinde **`device_bash` yok** — komut çalıştırılamıyor, sadece dosya oku/yaz. Komutları kullanıcıya vermek gerekiyor.
- Sandbox'tan **rastgele domaine `curl` engelli** (proxy 403). **`WebFetch` çalışıyor** — canlı API testleri bu şekilde yapıldı.
- Ses dosyası **transkripsiyonu yapılamıyor** (Whisper model indirmesi proxy tarafından engelli).
- **`device_stage_files` yerel düzenlemeleri EZER.** Bir dosyayı düzenledikten sonra tekrar stage etme — değişiklikler kaybolur (bu oturumda bir kez oldu).

---

## 8. SIRADAKİ ADIM

```bash
# 1) Değişiklikleri gönder
git add -A
git commit -m "Sözlük timeout düzeltmesi, arama kutusu flex hatası, sürüm göstergesi"
git push

# 2) Yeni build (karekodlu)
cd mobile
eas build --profile preview --platform all
```

Kurulumdan sonra **önce Profil ekranındaki Sürüm satırına bak** — `1.0.0 (8)` görüyorsan yeni build gerçekten kurulmuş demektir. Sonra sırayla test et:
1. Kelime Listesi arama kutusu → yazılan harfler görünüyor mu?
2. Kelime ekle → `try` / `bus` ara → anlam geliyor mu? (gelmiyorsa **artık hata mesajı nedeni söyleyecek**)
3. Ana ekran ikonu
