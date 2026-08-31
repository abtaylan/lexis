# Lexis — Kalan İşler (Güncel Durum)

_Son güncelleme: 31 Ağustos 2026 — bu dosya, 29 Ağustos 2026 tarihli önceki "kalan işler" dosyasının yerini alır ve onu günceller. Bu oturumda önce App Store başvurusu tamamlandı, sonra 8 dilin veritabanı bütünlüğü denetlendi; Portekizce (`pt`) özelinde başlayan inceleme, kod tabanı ve backend sorgularıyla doğrulanarak **genel kelime havuzunun aslında sadece İngilizce öğrenimini desteklediği** ve **mobil kayıt ekranında web'de zaten düzeltilmiş bir arayüz-dili bug'ının yeniden açık kaldığı** şeklinde iki önemli, koddan doğrulanmış bulguya dönüştü. Yeni sohbette buradan devam edilebilir._

---

## ✅ Bu oturumda tamamlananlar

### 1. App Store Connect başvurusu — TAMAMLANDI ✅
"Add for Review" tıklanınca çıkan hatalar sırayla giderildi ve uygulama incelemeye gönderildi:

- **Kategori**: Primary = Education, Secondary = Reference
- **İçerik Hakları**: "Yes, it contains, shows, or accesses third-party content, and I have the necessary rights."
- **Fiyatlandırma**: Base Country = Türkiye (TRY), Fiyat = ₺0,00 (Ücretsiz), 175 ülke/bölgenin tamamında
- **Mağaza Bilgileri**: Promosyon metni, açıklama (~2641 karakter), anahtar kelimeler, Support URL + Marketing URL = `https://lexis-blush.vercel.app`, Copyright = "2026 Arif Emre Taylan"
- **Sign-In Information**: kullanıcı adı `appreview@test.com`, OTP doğrulama kodu her zaman `123456` (test hesabı bypass'ı) — parolayı siz kendiniz girdiniz (güvenlik kuralı gereği bu bilgiyi ben giremem)
- **Build**: 1.0.0 (build 4) eklendi
- **İpad/Apple Watch ekran görüntüsü**: gerekmiyor — `app.json`'da `supportsTablet: false` ve watch hedefi yok, siz de onayladınız
- **iPhone 6.5" ekran görüntüsü**: 1 tane yeterli (siz onayladınız)

**Sonuç: "1 Item Submitted" — inceleme süresi en fazla 48 saat.**

### 2. EAS Build/Submit hatası çözüldü ✅
Build şu hatayla düşüyordu: `npm ci --include=dev exited with non-zero code: 1` → kök neden: `Missing: expo-linear-gradient@57.0.1 from lock file` (yani `package.json`'a paket eklenmiş ama `package-lock.json` güncellenmemiş). **Bu, önceki oturumun (29 Ağustos) kalan-işler dosyasında da "bir sonraki build'in `expo-linear-gradient` değişikliğini doğru aldığından emin olun" olarak not edilmişti — bu oturumda gerçekten o sorun çıktı ve çözüldü.**

Çözüm: `mobile/` içinde `npm install` çalıştırıldı, `package-lock.json` yeniden commit'lendi, `eas build --platform ios --profile production` tekrar çalıştırıldı → `✔ Build finished`. Ardından `eas submit --platform ios --latest` → "Submitted your app to Apple App Store Connect!" ve TestFlight daveti size ulaştı.

### 3. `general_word_pool` — 8 dil arası tam bütünlük (SQL ile) ✅
Önceki oturumda "diğer diller için havuzdaki eksik kelimeleri SQL ile tamamla" görevinin gerçekten tamamlanıp tamamlanmadığı yeniden denetlendi. `meaning` alanı zaten tamdı, ama denetimde **`example` alanında 371, `definition` alanında da eksikler bulundu** — bunlar SQL ile giderildi (aşağıda "Çalıştırılan SQL" bölümünde tam sorgular var).

**Doğrulanmış son durum:** `ar, de, es, fr, it, ja, ru, tr` dillerinin her birinde 303 kelime (toplam 2424 satır); `meaning`, `example`, `definition`, `difficulty_level` alanlarında 0 boş değer; `is_active=false` olan 0 satır; 8 dilde birebir aynı 303 kelimelik set (çapraz JOIN ile doğrulandı).

### 4. Google Play Console durumu kontrol edildi
Hâlâ Google'ın kimlik doğrulama incelemesini bekliyor — dış etken, şu an yapılabilecek bir şey yok. Sonuçlanınca e-posta gelecek (bkz. aşağıdaki "Bloke" bölümü, önceki dosyadaki `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` maddesiyle aynı).

---

## 🆕 Bu oturumda yeni tespit edilen sorunlar (önem sırasına göre)

### 1. [EN ÖNEMLİ, ürün kararı gerektiriyor] `general_word_pool` sadece İngilizce öğrenenler için dolu

Kelime havuzunun **sadece Portekizce'de değil**, İngilizce dışındaki **hiçbir öğrenme dili için** hazır içeriği olmadığı, hem veritabanı hem backend kodu üzerinden doğrulandı:

- SQL kanıtı: `SELECT DISTINCT source_lang, target_lang, count(*) FROM general_word_pool GROUP BY source_lang, target_lang` → sonuçta **`source_lang` her satırda `'en'`**; `target_lang` sadece `ar/de/es/fr/it/ja/ru/tr` (8 dil, her biri 303 satır). Yani havuz "İngilizce kelime + 8 dilde anlamı" şeklinde kurulu — "Almanca kelime", "Fransızca kelime" gibi başka bir `source_lang` hiç yok.
- Kod kanıtı: `backend/app/api/routes/games.py` içindeki kelime oyunu sorguları:
  ```python
  supabase_admin.table("general_word_pool")
      .select("id, word, meaning, example, definition")
      .eq("source_lang", learning_lang)   # kullanıcının öğrendiği dil
      .eq("target_lang", native_lang)     # kullanıcının ana dili
      .eq("is_active", True)
  ```
  `learning_lang` İngilizce değilse (`de`, `fr`, `es`, `it`, `ja`, `ru`, `ar`, `tr`, `pt` — hepsi dahil) bu sorgu **her zaman boş sonuç döner**. Dosyanın kendi Türkçe açıklaması da bunu doğruluyor: `pool_source="general"` → `general_word_pool`'dan beslenir; `"definition_to_word"` (Faz 2, tek dilli) oyun modu **sadece** `pool_source="general"` ile çalışır.
- **Etkilenmeyen kısım**: `pool_source="own"` (kullanıcının kendi eklediği `words` tablosu) her dil için çalışır — çünkü o tablo kullanıcı girdisiyle dolduruluyor, `source_lang` orada `learning_lang`'a eşit tutuluyor (bkz. `backend/app/api/routes/words.py`, `data["source_lang"] = active_lang`).
- **Karar gerektiren soru**: Bu, v1 kapsamının bilinçli olarak "içerik/havuz sadece İngilizce, diğer diller sadece kişisel kelime listesi için seçilebilir" şeklinde tasarlandığı anlamına mı geliyor, yoksa unutulmuş bir eksik mi? Yeni sohbette netleştirilmeli. İki olası çözüm yönü:
  - (a) `learning_lang` seçimini de (native_lang gibi) şimdilik sadece içerik olan dillerle sınırlayın (yani sadece `en` seçilebilsin, ta ki başka dillerin havuzu doldurulana kadar), **veya**
  - (b) Diğer öğrenme dilleri için de gerçek kelime havuzu üretin (büyük iş — her öğrenme dili için ayrı `source_lang` seti ve 8 farklı `target_lang`'a çeviri gerekir).

### 2. `pt` (Portekizce) — hem bu genel sorunun bir alt kümesi, hem ayrıca arayüz dili olarak da desteklenmiyor

- `languages` tablosunda `is_active=true` (10 aktif dilden biri: `en, tr, de, fr, es, it, ja, ar, ru, pt`), web ve mobilde öğrenme dili (learning language) olarak seçilebiliyor.
- Yukarıdaki madde 1 gereği zaten `general_word_pool`'da `pt` için (diğer 8 dil gibi) sıfır içerik var — bu, `pt`'ye özel değil, genel sorunun bir parçası.
- Ayrıca `pt`, **arayüz (UI) dili olarak hiçbir yerde desteklenmiyor** — `web/src/lib/i18n.tsx` ve `landing/src/lib/i18n.tsx`'teki `LOCALE_META` (9 kod: `tr, en, ar, ru, de, fr, es, it, ja`) ve mobildeki `mobile/src/i18n/locales.ts`'teki `LOCALE_META` (aynı 9 kod) listesinde yok. Bu kısıtlama **bilinçli** (web kod yorumu: "Arayüz (UI) çevirisi olmayan diller ana dil seçeneği olarak sunulmamalı — aksi halde LocaleProvider sessizce Türkçe'ye düşüyor (bkz. Bug 2, Ağustos 2026)").
- **Karar seçenekleri** (madde 1'deki kararla birlikte değerlendirilmeli):
  - (a) `languages.is_active=false` yapıp `pt`'yi tüm seçicilerden gizleyin, gerçekten hazır olunca aktifleştirin, **veya**
  - (b) `pt`'yi tam bir 10. dil yapın: 303 kelimeyi Portekizce'ye çevirip `general_word_pool`'a ekleyin VE `LOCALE_META`'ya (web + landing + mobil, 3 ayrı dosya) arayüz çevirisiyle birlikte ekleyin.

### 3. [YENİ, KODDAN DOĞRULANMIŞ CROSS-PLATFORM BUG] Mobil kayıt ekranı, web'de düzeltilmiş bir bug'ı arka kapıdan yeniden açıyor

Web tarafında hem `web/src/app/(auth)/register/page.tsx` hem `web/src/app/(app)/profile/page.tsx`, ana dil (native_lang / arayüz dili) seçicisini `UI_SUPPORTED_CODES` (yani `LOCALE_META`'daki 9 kod) ile filtreliyor — kasıtlı, kod yorumuyla belgelenmiş bir güvenlik önlemi. Mobilde `mobile/src/app/(app)/profile.tsx` da aynı şekilde güvenli: arayüz dili seçici `LOCALE_META.map(...)` kullanıyor (9 koda sabit).

**Ama `mobile/src/app/(auth)/register.tsx` bu filtreyi hiç uygulamıyor:**

```tsx
// satır 26-34, 80
const [languages, setLanguages] = useState<Language[]>([]);
...
languagesApi.getAll().then(setLanguages).catch(() => {});
...
const langOptions = languages.map((l) => ({ value: l.code, label: ... }));
// satır 108: HEM native_lang HEM learning_lang seçicisi aynı filtresiz langOptions'ı kullanıyor
<ChipSelect options={langOptions} value={nativeLang} onChange={setNativeLang} />
```

**Doğrulanmış etki zinciri:**

1. Mobilde kayıt olan bir kullanıcı ana dil olarak "Português" seçebilir (şu an `languages` tablosunda `pt` aktif olduğu için listede görünüyor) → backend'e `native_lang: 'pt'` kaydedilir.
2. Mobil tarafta bu görünürde sorun yaratmaz — çünkü mobilin arayüz dili `native_lang`'dan değil, cihazda ayrı saklanan bir değerden geliyor (`mobile/src/i18n/index.tsx`: `bulkStorage`'daki `lexis_ui_locale` anahtarı, varsayılan `'tr'`, `LOCALE_META.some(...)` ile doğrulanıyor). Yani mobil kendi kendini bu hatadan koruyor.
3. **Ama aynı hesapla web uygulamasına (`app.lexiswords.com`) giriş yapıldığında patlıyor**: `web/src/lib/i18n.tsx` içindeki
   ```ts
   function resolveLocale(code?: string): Locale {
     if (code && code in dictionaries) return code as Locale;
     return 'tr';
   }
   const locale = user?.native_lang ? resolveLocale(user.native_lang) : guestLocale;
   ```
   satırı, giriş yapmış kullanıcının arayüz dilini **doğrudan `native_lang`'dan** belirliyor. `'pt'`, `dictionaries` içinde olmadığı için `resolveLocale('pt')` sessizce `'tr'`ye düşüyor — bu tam olarak web kodundaki yorumda bahsedilen "Bug 2, Ağustos 2026" hatasının ta kendisi. Yani: **mobil kayıt ekranındaki eksik filtre, web'de zaten kapatılmış olan bu hatayı arka kapıdan tekrar açık bırakıyor.**

**Önerilen düzeltme:** `mobile/src/app/(auth)/register.tsx` içinde native dil `ChipSelect`'i için ayrı, `LOCALE_META` ile filtrelenmiş bir liste kullanın (learning dil seçicisi filtresiz kalabilir — bu web'in tasarımıyla tutarlı, öğrenme dili UI dilini değil sadece kelime havuzu hedefini belirliyor). Küçük, hızlı bir kod değişikliği; madde 1/2'deki `pt` kararından bağımsız olarak, ilerde `languages` tablosuna UI çevirisi olmayan başka bir dil eklenirse aynı hata tekrar yaşanmasın diye zaten yapılmalı.

### 4. `learning_resources` tablosu — 5/10 dilde hiç kayıt yok
Sadece `ar, de, en, es, fr` dillerinde 5'er kayıt var (tüm alanları dolu). `it, ja, ru, tr, pt` için sıfır kayıt. Bu, SQL ile otomatik doldurulamaz — gerçek, küro edilmiş dış kaynak URL'leri gerekiyor (bir insanın seçmesi/onaylaması gereken bir iş).

### 5. `badges` tablosu — sadece TR/EN, KODDAN DOĞRULANDI
`backend/app/services/badge_service.py` → `get_user_badges()` fonksiyonu, rozetleri şu join ile getiriyor:
```python
"badge_code, period_key, earned_at, meta, badges(name_tr, name_en, description_tr, description_en, icon_emoji)"
```
Yani rozet adı/açıklaması veritabanında **gerçekten sadece Türkçe ve İngilizce** olarak tutuluyor, başka dil sütunu yok. Arayüz dili `de/fr/es/it/ja/ru/ar` olan kullanıcılar (9 UI dilinden 7'si) muhtemelen rozetleri kendi dillerinde değil, İngilizce (veya kod fallback'ine göre Türkçe) görüyor.

Not: `mobile/src/i18n/index.tsx` içinde ayrıca client tarafında `BADGE_LABELS` diye bir sözlük daha var (`dashboardStrings.ts`'den, `useLocale()` üzerinden `badgeLabels` olarak sunuluyor) — bunun DB'deki `badges.name_*` alanlarını override edip etmediği bu oturumda doğrulanamadı (`dashboardStrings.ts` dosyası stage edilmedi). **Yeni sohbette ilk kontrol edilecek şey**: `mobile/src/i18n/dashboardStrings.ts` içindeki `BADGE_LABELS`'ın 9 dili kapsayıp kapsamadığı ve ekranlarda gerçekten DB yerine bu sözlüğün mü kullanıldığı.

---

## Sizin yapmanız / karar vermeniz gerekenler

1. **Git commit/push** — 29 Ağustos'taki dosyada "henüz commit edilmedi" notu vardı; bu oturumda local repo durumu (`git status`) tekrar kontrol edilmedi, yeni sohbette veya sizin tarafınızda doğrulanmalı.
2. **Madde 1 + 2 kararı**: `general_word_pool`'un kapsamı (sadece İngilizce mi kalacak, yoksa diğer öğrenme dilleri için de içerik üretilecek mi) ve buna bağlı olarak `pt`'nin durumu (deaktive mi, tam desteklenen 10. dil mi olacak).
3. **Madde 3 fix onayı**: mobil kayıt ekranındaki filtre eksikliğinin küçük bir kod değişikliğiyle düzeltilmesini ister misiniz (önerilen: evet, düşük riskli).
4. **`learning_resources`** için 5 dilde küratörlü kaynak linkleri (bu bir insan kararı, otomatikleştirilemez).
5. **`badges`** i18n kapsamının netleştirilmesi (dashboardStrings.ts kontrolü sonrası gerekirse DB şemasına dil sütunu/JSON eklenmesi).

---

## ⏳ Bloke / dış etkene bağlı (aksiyon şu an mümkün değil)

- **`GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`** — Google Play Console hesabının kimlik doğrulaması hâlâ bekleniyor (bu oturumda tekrar kontrol edildi, sonuç değişmedi). Sonuç e-posta ile gelecek; geldiğinde Play Console → Ayarlar → API erişimi → servis hesabı bağlama → JSON üretme adımlarında eşlik edilecek. **JSON'u Railway'e girme işlemini güvenlik kuralı gereği siz yapmanız gerekiyor** (API anahtarlarını hiçbir alana ben giremem).
- **App Store incelemesi** — "1 Item Submitted", sonuç en geç 48 saat içinde beklenir.

---

## 📋 Orta/uzun vadeli backlog (bu oturumda tekrar kontrol edilmedi — 29 Ağustos dosyasından taşındı, güncel durumu yeni sohbette teyit edilmeli)

- iyzico 401 hatası çözümü
- iyzico üye iş yeri başvurusunun sonucu
- Döviz bazlı Premium (USD/EUR) — kod hazır, iyzico'da plan oluşturma üye iş yeri onayına bağlı
- Troy logosu / marka izni — BKM/Troy'dan resmi izin istenmesi gerekiyor
- Ek oyun modları
- Backend otomatik testler

## ✅ Eski backlog'dan artık geçerli olmayan / tamamlanmış madde

- **"Kalan sosyal medya hesap kurulumları"** (29 Ağustos dosyasında hâlâ backlog'daydı) — bu oturumda `landing/src/lib/config.ts` içeriği kontrol edildi: Telegram, Slack, YouTube, Instagram, X, LinkedIn linklerinin hepsi artık gerçek `href` değerlerine sahip (boş/`null` değil). Bu madde **tamamlanmış** sayılabilir, backlogdan çıkarıldı.

---

## Yeni sohbette öncelik sırası önerisi

1. `general_word_pool` kapsam kararı (madde 1) — en büyük ürün kararı, diğer her şeyi etkiliyor
2. Mobil `register.tsx` filtre bug'ı fix (madde 3) — küçük, hızlı, düşük riskli
3. `pt` kararı (madde 2) — madde 1'in kararına bağlı
4. `badges` i18n kapsamının netleştirilmesi (madde 5) — `dashboardStrings.ts` okunarak başlanmalı
5. `learning_resources` için küratörlü linkler (madde 4)
6. Git commit/push kontrolü + orta/uzun vadeli backlog'un (iyzico, Troy logosu, döviz Premium, ek oyun modları, otomatik testler) güncel durumunun teyidi

---

## Referans: bu oturumda çalıştırılan SQL (audit trail)

```sql
-- example alanını, aynı kelimenin dolu olan bir satırından diğer dillere kopyala
UPDATE general_word_pool AS t
SET example = src.example
FROM (
  SELECT DISTINCT ON (word) word, example
  FROM general_word_pool
  WHERE example IS NOT NULL AND example <> ''
  ORDER BY word, example
) AS src
WHERE t.word = src.word AND (t.example IS NULL OR t.example = '');

-- Hiçbir dilde definition'ı olmayan 2 kelime için elle standart İngilizce tanım yazıldı
UPDATE general_word_pool SET definition = 'to find out or learn something with certainty' WHERE word = 'ascertain';
UPDATE general_word_pool SET definition = 'feeling or showing worry, nervousness, or unease about something' WHERE word = 'anxious';

-- definition alanını, aynı kelimenin dolu olan bir satırından diğer dillere kopyala
UPDATE general_word_pool AS t
SET definition = src.definition
FROM (
  SELECT DISTINCT ON (word) word, definition
  FROM general_word_pool
  WHERE definition IS NOT NULL AND definition <> ''
  ORDER BY word, definition
) AS src
WHERE t.word = src.word AND (t.definition IS NULL OR t.definition = '');
```

Doğrulama sorgusu (bu oturumda kullanılan mantık): `SELECT DISTINCT source_lang, target_lang, count(*) FROM general_word_pool GROUP BY source_lang, target_lang ORDER BY source_lang, target_lang;` — sonuç: sadece `source_lang='en'`, `target_lang` ∈ {ar,de,es,fr,it,ja,ru,tr}, her biri 303 satır.

---

## Referans: ilgili dosya/tablo yolları

**Veritabanı (Supabase, project_id `mrxeuxscyztpiuagsumh`):**
- `general_word_pool` (id, source_lang, target_lang, word, meaning, example, difficulty_level, is_active, created_at, definition)
- `languages` (id, code, name_native, name_en, flag_emoji, is_active, created_at) — 10 aktif satır
- `learning_resources` (id, language_code, category, title, url, description, is_active, created_at)
- `badges` (code, name_tr, name_en, description_tr, description_en, icon_emoji, created_at)
- `words` (kullanıcının kişisel kelime listesi — source_lang/target_lang her kullanıcıda farklı olabilir, `general_word_pool`'dan bağımsız)

**Web (`web/`):**
- `src/lib/i18n.tsx` — `LOCALE_META` (9 kod), `resolveLocale()`, `LocaleProvider` (giriş yapmış kullanıcı için `locale = resolveLocale(user.native_lang)`)
- `src/app/(auth)/register/page.tsx` — `UI_SUPPORTED_CODES` ile filtrelenmiş native_lang seçici (satır 16, 196), filtresiz learning_langs seçici (satır 208-209, kasıtlı)
- `src/app/(app)/profile/page.tsx` — aynı desen

**Landing (`landing/`):**
- `src/lib/i18n.tsx` — aynı 9 kodluk `LOCALE_META`, pt hiç geçmiyor (tutarlı, sorun yok)
- `src/lib/config.ts` — `COMPANY_INFO`, `SOCIAL_LINKS` (hepsi dolu), `CONTACT_EMAIL`

**Mobil (`mobile/`):**
- `src/i18n/locales.ts` — `LOCALE_META` (9 kod, web ile birebir aynı)
- `src/i18n/index.tsx` — `LocaleProvider`, arayüz dilini `bulkStorage`'daki `lexis_ui_locale`'den okuyor (native_lang'dan BAĞIMSIZ — bu yüzden mobilin kendisi Bug 2'den etkilenmiyor, ama web etkileniyor)
- `src/app/(auth)/register.tsx` — **filtre eksik** (bkz. madde 3), satır 26-34, 80, 108
- `src/app/(app)/profile.tsx` — filtre doğru (`LOCALE_META.map`, satır 134), learning dil ekleme modalı filtresiz (kasıtlı, web ile tutarlı)
- `src/api/languages.ts` — `languagesApi.getAll()` → `/languages` endpoint'i, ham/filtresiz liste döner

**Backend (`backend/`):**
- `app/api/routes/games.py` — `general_word_pool` sorguları (`source_lang=learning_lang`, `target_lang=native_lang`), `pool_source` mantığı (satır 5-26, 208-215, 278-314)
- `app/api/routes/words.py` — kişisel `words` tablosu, `source_lang`/`target_lang` ataması (satır 92-94)
- `app/services/learning_languages.py` — çoklu öğrenme dili yönetimi, `profiles.native_lang`/`profiles.learning_lang` "ayna" tasarımı
- `app/services/badge_service.py` — `get_user_badges()`, sadece `name_tr`/`name_en` join
- `backend/seed_general_word_pool.py` — havuzun ilk dolduruluş script'i (source_lang='en' varsayımı muhtemelen burada da görülebilir, yeni sohbette incelenebilir)
