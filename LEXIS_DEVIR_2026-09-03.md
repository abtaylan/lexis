# Lexis — Devir Notu / Kalan İşler
**Tarih:** 3 Eylül 2026 (20:45 güncellemesi)
**Repo:** `C:\Users\ytt\OneDrive\Masaüstü\PROJELER\lexis\lexis`
**Son commit:** `2ae93b6` · **iOS build:** 1.0.0 (8) ✅ · **Android build:** ❌ (Maven 429, kodla ilgisi yok)

> Yeni sohbete devir içindir. **Önce §7 "Tekrar Denenmemesi Gerekenler"i oku.**

---

## ✅ ÇÖZÜLDÜ — Kelime Listesi arama kutusunda yazı görünmüyor

**Kök neden:** `words.tsx`'te arama kutusunun stilinde `flex: 1` vardı. `flex: 1` = `flexBasis: 0`; kapsayıcı (`TextField.tsx` içindeki `inputWrap`) yüksekliğini içeriğinden aldığı için TextInput'un **içerik yüksekliği 0'a çöküyordu**. Kutu padding sayesinde normal görünüyor ama yazının çizileceği alan kalmıyordu. Bu yüzden: state güncelleniyor, liste filtreleniyor, klavye tahmin ediyor — ama harfler çizilmiyor. Ekran görüntüsündeki **mavi seçim bloğu** bunu doğruladı.

**Düzeltme:** `flex: 1` kaldırıldı (genişlik zaten dış View'daki `width: '100%'` ile geliyor). **Kullanıcı doğruladı: çözüldü.**

---

## ✅ ÇÖZÜLDÜ (test bekliyor) — "Sözlük kelimeyi bulamıyor"

### Gerçek kök neden — İKİ AYRI ŞEY ÜST ÜSTE BİNMİŞ

**1) Cihazdaki aktif öğrenme dili Almanca.**
Profil ekranı görüntüsü: *Dillerim → English (Aktif Yap) · **Deutsch (Aktif)***.
Yani iOS cihazda aktif dil **Deutsch**. Android'de English. Uygulama `learning_lang=de` ile arıyor; İngilizce `try`/`bus` doğal olarak bulunamıyor. **Platform farkı değil, dil ayarı farkı.**

Canlı API ile doğrulandı:
```
learning_lang=en → "try": 10 anlam, "bus": 4 anlam, source: "cambridge", error: null  ✅
learning_lang=de → HTTP 404                                                            ❌
```

**2) Backend 404 döndürüyor, mobil bunu "bağlantı hatası" sanıyordu.**
`backend/app/api/routes/dictionary.py` satır 18-19:
```python
if result.get("error") and not result.get("meanings"):
    raise HTTPException(status_code=404, detail=result["error"])
```
axios 404'ü istisna sayıp doğrudan `catch`'e atlıyor → `res.meanings.length` kontrolü ve backend'in kendi mesajı (*"Anlam bulunamadı, elle girebilirsin."*) **hiçbir zaman ekrana gelemiyordu**. Kullanıcı hep genel bir hata görüyordu.

### Yapılan düzeltmeler
- `words.tsx` → `catch` artık **404'ü "anlam bulunamadı" olarak** gösteriyor ve backend'in `detail` metnini kullanıyor. Zaman aşımı / HTTP hatası / ağ hatası ayrı ayrı raporlanıyor.
- `words.tsx` → "Kelime" etiketinde artık **aktif dil çifti yazıyor** (`DE → TR` gibi). Bu karışıklık bir daha yaşanmasın diye.
- `api/words.ts` → sözlük çağrısının timeout'u 60 sn'ye çıkarıldı (genel 20 sn yetmiyordu; backend Cambridge'i scrape ediyor).

### Kullanıcının yapması gereken
Profil → **Dillerim → English → "Aktif Yap"**. İngilizce kelime eklemek için aktif dilin English olması gerekiyor.

### Kalıcı iyileştirme önerisi (yapılmadı)
- Backend'de sözlük sonuçlarını **cache'lemek** (her arama Cambridge'i baştan scrape ediyor).
- Backend'in 404 yerine `200 + boş liste` dönmesi daha doğru API tasarımı olur (web tarafını kırmamak için şimdilik istemcide çözüldü).

---

## ✅ ÇÖZÜLDÜ (test bekliyor) — Profil'de "Sürüm: ? (?)"

`Constants.nativeAppVersion` / `nativeBuildVersion` **expo-constants'ın bu sürümünde kaldırılmış** → ikisi de `undefined` dönüyordu.
**Düzeltme:** `expo-application`'a geçildi (`Application.nativeApplicationVersion` / `nativeBuildVersion`). Bu paket zaten kurulu — Android gradle log'unda `[📦] expo-application (57.0.2)` olarak görünüyor.

⚠️ `package.json`'da doğrudan bağımlılık olarak yok. Bir kez şunu çalıştırmak gerekiyor:
```bash
npx expo install expo-application
```

> **Yan bulgu — çok önemli:** "Sürüm" satırının ekranda **görünüyor olması**, yeni build'in telefona gerçekten kurulduğunu kanıtlıyor (o satır yeni eklenen koddu). Yani "telefon eski build'de kalıyor" ihtimali **elendi**.

---

## ⚠️ Android build hatası — BİZİM KODLA İLGİSİ YOK

Build `7c7aa3ec` · "Run gradlew" log'u:
```
Could not GET 'https://repo.maven.apache.org/maven2/.../expo.modules.webview-57.0.1.pom'.
Received status code 429 from server: Too Many Requests
> Repository MavenRepo is disabled due to earlier error below:
> There are 15 more failures with identical causes.
```
**Maven Central rate limit (429).** Geçici altyapı sorunu. **Çözüm: build'i tekrar çalıştırmak.** Kodda değiştirilecek bir şey yok.

---

## ✅ ÇÖZÜLDÜ — İKON (kök neden nihayet bulundu)

### Gerçek kök neden: kaynak dosyanın İÇERİĞİ yanlış tasarımdı

`mobile/assets/app-icon.png` dosyasının içinde **gözlüklü maskot + kitap** tasarımı vardı. Kullanıcının istediği ikon ise **"L" harfi + LEXIS yazısı** olan logo.

Yani **build hattı en başından beri doğru çalışıyordu** — o dosyada ne varsa sadakatle derliyordu. Günlerce "iOS ikonu güncellenmiyor" sanıldı; oysa iOS her seferinde **doğru dosyayı** gösteriyordu, dosyanın içeriği yanlıştı.

**Kesin doğrulama:** `assets/images/splash-icon.png` zaten **L logosu**. Uygulama içi logonun doğru, ana ekran ikonunun yanlış görünmesinin sebebi tam olarak buydu — iki dosya farklı tasarım içeriyordu.

> **Ders:** Bir varlığın *doğru üretildiğini* kanıtlamak, *doğru varlık olduğunu* kanıtlamaz. Pipeline forensiği (IPA açma, CgBI decoder yazma vb.) teknik olarak doğruydu ama yanlış soruyu cevaplıyordu. Bir sonraki benzer durumda İLK iş: kaynak dosyayı kullanıcıya gösterip "istediğin bu mu?" diye sormak.

### İkinci kök neden: "beyaz kenar" sorunu

Kullanıcının gönderdiği doğru logo (`LEXIS_Logo_Farkli_Boyutlar.zip` → `01_mobil_uygulama_1024x1024.png`) tasarımın **kendi yuvarlatılmış köşelerini** ve etrafında **beyaz bir çerçeve** içeriyor (köşe pikselleri ölçüldü: `(254,253,253)`). iOS/Android ikonu kenardan kenara basıp ÜSTÜNE kendi maskesini uyguladığı için o beyaz çerçeve "beyaz kenar" olarak görünüyordu — en baştaki şikâyetin sebebi buydu.

### Yapılan
`build_icons.py` ile logonun içindeki asıl içerik (L + LEXIS) alınıp, **kenardan kenara dolu lacivert** zemine, orijinal orandaki (%72.3) gibi ortalanarak yerleştirildi. Yuvarlatma işletim sistemine bırakıldı — doğru olan bu.

Üretilen ve projeye yazılan dosyalar:
| Dosya | Özellik |
|---|---|
| `assets/app-icon.png` | 1024×1024, **RGB (alfa yok)**, dört köşe de `(7,29,67)` lacivert |
| `assets/images/android-icon-foreground.png` | 1024×1024 RGBA, içerik %62'ye küçültüldü (Android maskesi dış %33'ü kırpabiliyor) |
| `assets/images/android-icon-background.png` | 1024×1024 düz lacivert |
| `assets/play_store_icon_512.png` | 512×512, alfasız |

### Kontrol edilmesi iyi olur (yapılmadı)
`assets/logo-icon.png` (expo-notifications bildirim ikonu) ve `assets/icon.png` hâlâ eski tasarımı içeriyor olabilir. Bildirim ikonu Android'de ideal olarak **şeffaf zeminde beyaz siluet** olmalı.

---

## 🟡 TEST BEKLEYEN diğer düzeltmeler

| Konu | Dosya | Not |
|---|---|---|
| Sayaçların güncellenmemesi ("gir-çık gir-çık") | `dashboard.tsx`, `flashcards.tsx` | `useFocusEffect` eklendi. Kullanıcı artık şikâyet etmiyor → muhtemelen düzeldi |
| "Anlam" alanına kelimenin kendisinin yazılması | `dictionary_service.py` | MyMemory girdiyi aynen döndürüyordu; gerçek-çeviri kontrolü eklendi |
| Modal'da klavyenin alanları kapatması | `words.tsx` | `ScrollView` + `KeyboardAvoidingView` + `maxHeight: '90%'` |
| Modal'da eski arama sonucunun kalması | `words.tsx` | Modal açılışında state sıfırlanıyor |
| Dashboard karşılaması hep "Günaydın" | `dashboard.tsx` | Saate göre 4 metin |

---

## 🔴 HENÜZ BAŞLANMADI

### XP / oyun sömürüsü (kullanıcı kararı bekliyor)
- Quizlerde yanlış cevabın **cezası yok**; eşleştirmede **deneme-yanılma ile sınırsız XP** kasılabiliyor.
- **Kök neden:** `games.py` — `typing`/`matching`/`listening`/`sprint` modlarında doğruluk **istemcide** hesaplanıp yalnızca son (doğru) deneme `/attempt`'e gönderiliyor. Ara yanlışları sunucu hiç görmüyor.
- **Oyun tasarımı kararı gerekiyor:** kaç yanlış hakkı, XP eksiye düşsün mü, yanlış denemeler sunucuya gönderilsin mi?
- Not: flashcard tekrarı (`words.py`) **zaten doğru** — `if review.success` ile yanlışta XP vermiyor.

### App Store Connect gönderimi
- Red: Guideline 5.1.1(v) hesap silme. **Apple eski build 4'ü incelemiş**; hesap silme ve demo hesap notları sonradan eklendi, build 5 hiç gönderilmedi.
- Kalan: production build → hesap silme akışının fiziksel cihazda ekran kaydı → App Review notları + yeni build → gönderim.
- ⚠️ Gönderim gibi geri alınamaz adımlar **kullanıcı onayı olmadan yapılmayacak**.

### Küçük iş
`Claude outputs/screenshot-1788420166564-0.jpg` istemeden git'e girmiş görünüyor; temizlenebilir.

---

## ⛔ 7. TEKRAR DENENMEMESİ GEREKENLER

Denendi, **çalışmadı / yanlış çıktı**:

1. "Silip yeniden kurmak ikon önbelleğini temizler" → düzelmedi
2. "`eas build --clear-cache` ikonu düzeltir" → düzelmedi (bağımlılık cache'i, ikonla ilgisi yok)
3. "EAS fingerprint cache prebuild'i atlıyor" → log açıldı, prebuild çalışıyor. **Yanlış**
4. "Prebuild 1 sn sürmesi şüpheli" → değil; modern Xcode tek 1024px ikon kullanıyor
5. "İkonun alfa kanalı beyaza flatten ediliyor" → dosyada alfa **yok**. **Geçersiz**
6. Telefonu restart / Ana Ekran Düzenini Sıfırla → düzelmedi
7. "Arama kutusu sorunu FlatList re-render'ından" → `React.memo`/`useCallback` eklendi, düzelmedi. Gerçek sebep `flex: 1`
8. "iOS'ta Cambridge kelimeyi bulamıyor" → **yanlış**; sorun aktif dilin Almanca olması + backend'in 404'ü
9. `Constants.nativeAppVersion` / `nativeBuildVersion` → bu expo-constants sürümünde **yok**, `expo-application` kullan
10. **"İkon build/cache sorunu"** → **tamamen yanlış**. Pipeline hep doğruydu; `app-icon.png`'nin İÇERİĞİ yanlış tasarımdı (maskot, oysa L logosu olmalıydı). Günlerce yanlış katmanda arandı

### Ortam kısıtları
- Kullanıcının Windows makinesinde **`device_bash` yok** — komut çalıştırılamıyor, komutlar kullanıcıya verilmeli.
- Sandbox'tan rastgele domaine **`curl` engelli** (proxy 403). **`WebFetch` çalışıyor** — canlı API testleri böyle yapıldı.
- Ses dosyası transkripsiyonu yapılamıyor (Whisper indirmesi engelli).
- **`device_stage_files` yerel düzenlemeleri EZER** — düzenledikten sonra tekrar stage etme (bu oturumda bir kez oldu).
- Expo build sayfasında log satırına tıklamak **toggle**; `get_page_text` boş geliyorsa tek sayıda tıklandığından emin ol. Sayfa ağır, `screenshot` zaman aşımına uğrayabiliyor.

---

## 8. SIRADAKİ ADIM

```bash
cd "C:\Users\ytt\OneDrive\Masaüstü\PROJELER\lexis\lexis\mobile"
npx expo install expo-application

cd ..
git add -A
git commit -m "Sozluk 404 handling, aktif dil gostergesi, surum satiri expo-application"
git push

cd mobile
eas build --profile preview --platform all
```

Kurulumdan sonra test sırası:
1. **Profil → Sürüm** → artık `1.0.0 (9)` gibi gerçek numara göstermeli (`? (?)` değil)
2. **Profil → Dillerim → English → "Aktif Yap"**
3. Kelime ekle → etikette `EN → TR` yazdığını gör → `try` ara → anlam gelmeli
4. Ana ekran ikonu
