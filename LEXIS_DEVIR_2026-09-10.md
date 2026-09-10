# LEXIS — Devir Notu (10 Eylül 2026)

Bu dosya, V2 Faz 3 ("Gerçek Zamanlı Düello + Lig + Görev Haritası + B2B") kapsamında bu oturumda (session) yapılan işlerin özeti ve yeni bir chat'te devam edebilmen için gereken bağlamdır. Repo: `abtaylan/lexis` (monorepo — `backend/` FastAPI+Supabase, `web/` Next.js/Vercel, `mobile/` Expo/React Native, `supabase/migrations/`). Supabase project_id: `mrxeuxscyztpiuagsumh`.

Son commit: **`05bdc30`** — "Ozel (arkadas) ligler + admin Kullanici Listesi sutun siralama/e-posta duzeltmesi" (henüz `git push origin main` yapılmadı — bkz. altta "Yapılacaklar").

---

## 1. Bu oturumda tamamlananlar (özet, kronolojik)

### 1.1 Flashcards/quizlet sayacı
Haftalık lig tablosuna `flashcards_reviewed` sayacı eklendi (backend şema/route/rollover script, web+mobil tip/lokal/UI). `_rank_key` artık `(xp, duels_won, games_won, flashcards_reviewed)` dörtlüsüyle eşitlik bozuyor.

### 1.2 Lig kademeleri 6 → 12
`league_tiers` tablosu genişletildi: **Demir (iron) → Bronz → Gümüş → Altın → Platin → Zümrüt (emerald) → Elmas (diamond) → Yakut (ruby) → Usta (master) → Üstat (grandmaster) → Şampiyon (champion) → Efsane (legend)**. `profiles.current_league_tier` DEFAULT `'iron'` oldu. 10 dilin hepsinde `TIER_NAMES` çevirileri eklendi (web `leagueLocale.ts` + mobil `leagueStrings.ts`).

**Önemli gotcha (2 kere karşılaşıldı, ileride yeni bot-seed migration'ı yazarsan dikkat et):** Bir migration önce `auth.users` INSERT edip sonra ayrı bir `UPDATE profiles SET current_league_tier=...` yaparsa, `on_profile_created_league_enroll` AFTER-INSERT trigger'ı INSERT anındaki (henüz DEFAULT) tier değerine göre kullanıcıyı **hemen** yanlış lige yerleştiriyor — sonraki UPDATE bu yerleşimi geri almıyor. Çözüm: ya tier'i INSERT anında doğru ver, ya da UPDATE sonrası `league_memberships` satırını sil/yeniden oluştur.

**Diğer gotcha:** Postgres'te `CREATE OR REPLACE FUNCTION` farklı parametre listesiyle çağrılırsa YENİ bir overload yaratır, eskisini SİLMEZ — `DROP FUNCTION IF EXISTS ...` eklemeyi unutma.

Her kademe artık HER ZAMAN tam 4 grup (A/B/C/D) gösteriyor — boş gruplar dahil (`seed_tier_leagues(4,4)`, bot yokluğu artık grup açılmasını engellemiyor). `get_league_overview()`'daki boş-grup filtreleme hatası da düzeltildi.

### 1.3 Web dashboard saat bazlı selamlama
Web'deki statik "Günaydın" yazısı, mobildeki gibi 4 zaman dilimine (`greeting`/`greetingAfternoon`/`greetingEvening`/`greetingNight`) göre değişen selamlamaya çevrildi (`web/src/app/(app)/dashboard/page.tsx` + `web/src/lib/i18n.tsx`, 10 dil).

### 1.4 Özel (arkadaş) ligler — YENİ ÖZELLİK (bu oturumun ana işi)
Kullanıcı isteği: *"kendi arkadaşlarımdan oluşan özel lig kurup kendi aramızda yarışabilmeliyim... hem arkadaşlarımı hem sistemde bulunan diğer user'ları ekleyebilmeliyim."*

- **Migration 056** (`supabase/migrations/056_custom_leagues.sql`, uygulandı): `custom_leagues`, `custom_league_members`, `custom_league_invites` tabloları + RLS. Kademe lig sisteminden TAMAMEN bağımsız, haftalık döngüye tabi değil (her üye kendi katıldığı andan itibaren kazandığı XP'ye göre sıralanıyor).
- **Backend**: `backend/app/schemas/custom_leagues.py` + `backend/app/api/routes/custom_leagues.py` (473 satır, `duels.py`'nin oda/davet desenini birebir takip ediyor). Router `/api/v1/custom-leagues/*` altında `main.py`'ye bağlandı.
  - Uçlar: `POST /custom-leagues` (oluştur), `GET /mine`, `GET /{id}`, `DELETE /{id}` (kurucu-only), `POST /{id}/leave` (kurucu ayrılamaz, silmeli), `POST /{id}/invite` (**herhangi bir üye** davet edebilir, arkadaşlık şartı YOK — duels.py'den kasıtlı fark), `GET /invites/mine`, `POST /invites/{id}/accept|decline|cancel`.
- **Web**: `web/src/app/(app)/league/custom/page.tsx` (liste + oluştur + bekleyen davetler) ve `.../custom/[id]/page.tsx` (üye tablosu + arama-tabanlı davet — `socialApi.searchUsers` ile sistemdeki HERHANGİ kullanıcı aranabiliyor). Ana lig sayfasına (`league/page.tsx`) "Özel Ligler" giriş butonu eklendi. `customLeaguesApi` → `web/src/lib/api.ts`, tipler → `web/src/types/index.ts`.
- **Mobil**: `mobile/src/app/(app)/custom-leagues.tsx` + `custom-league-detail.tsx` (react-query tabanlı, `duels.tsx`/`league-detail.tsx` desenleri), `mobile/src/api/customLeagues.ts`, `mobile/src/i18n/customLeagueStrings.ts` (10 dil), `_layout.tsx`'e yeni rotalar eklendi, `league.tsx` header'ına giriş butonu eklendi.
- Web `tsc --noEmit` temiz. Mobil `tsc --noEmit`'te YENİ eklenen `custom-leagues`/`custom-league-detail` rotaları için expo-router typed-routes hataları çıkıyor — bu, `league-detail.tsx` için de zaten var olan **bilinen/zararsız** bir durum (typed-routes derleme zamanında değil build/generate anında güncelleniyor, kod mantığı doğru). `BadgeShowcase.tsx`'teki JSX overload hatası da önceden var, bu oturumla ilgisiz.

### 1.5 Admin panel — Kullanıcılar sayfası
Kullanıcı isteği: *"Kullanıcı Listesi'ndeki tüm sütunlarda artan/azalan özelliği olsun. E-posta sütunu boş, dolu olsun."*

- **Sıralama**: `web/src/app/(admin)/admin/users/page.tsx`'e tüm sütun başlıklarına tıklanabilir artan/azalan sıralama eklendi (`sortKey`/`sortDir` state + `useMemo` ile sıralanmış liste, ok ikonlu göstergeler).
- **E-posta boşluğu kök nedeni bulundu ve düzeltildi**: `backend/app/api/routes/admin.py`'deki `list_users()` ucu, e-postaları `supabase_admin.auth.admin.list_users()` ile eşleştiriyordu ama bu çağrı **TEK SAYFA** (GoTrue admin API varsayılanı `per_page=50`) dönüyordu. `profiles` tablosunda artık **149 kayıt** var — 50. kullanıcıdan sonrakiler `email_map`'e hiç girmiyor, e-posta boş kalıyordu. Yeni `_list_all_auth_users()` yardımcı fonksiyonu TÜM sayfaları geziyor; hem `list_users` hem `create_user`'daki (aynı bug'ı taşıyan) e-posta ön-kontrolü bu yardımcıyı kullanacak şekilde güncellendi.

**⚠️ Sistemik/geniş kapsamlı NOT — düzeltilmedi, ileride dikkat:** Aynı `supabase_admin.auth.admin.list_users()` (sayfalamasız, tek sayfa varsayan) deseni şu dosyalarda DA var: `backend/app/api/routes/admin_platform.py`, `backend/app/api/routes/auth.py`, `backend/app/api/routes/exams.py`, `backend/app/api/routes/organizations.py`, `backend/send_daily_word_email.py`, `backend/send_schedule_reminders.py`. Kullanıcı sayısı 50'yi geçtiği için bu dosyalardaki mantık da (örn. toplu e-posta gönderimi, organizasyon üye eşleştirmesi) sessizce eksik/yanlış çalışıyor olabilir. Bu oturumda SADECE `admin.py` (raporlanan bug'ın kaynağı) düzeltildi — diğerleri kapsam dışı bırakıldı çünkü her birinin davranışını ayrı test etmeden dokunmak riskli. **Yeni chat'te bunu bir sonraki iş kalemi olarak ele almayı düşün.**

---

## 2. Bilinen açık konular / önceki oturumlardan devreden notlar

- **`league_tiers` tablosunda RLS kapalı** (Supabase advisory) — önceki oturumlarda tespit edildi, kullanıcının örtük ertelemesiyle hiç dokunulmadı. Tablo herkese açık okunması gereken statik veri (kademe isimleri) olduğu için düşük risk, ama formalite olarak `ENABLE ROW LEVEL SECURITY` + `USING (true)` select policy eklenmesi önerilir.
- **Yukarıdaki `list_users()` sayfalama bug'ı** — sadece `admin.py` düzeltildi, diğer 6 dosya kapsam dışı (bkz. §1.5).
- Mobil `tsc --noEmit`'teki expo-router typed-routes + `BadgeShowcase.tsx` hataları — bu oturumdan ÖNCE de vardı, kod mantığını etkilemiyor, `npx expo customize` / normal build akışında typed-routes dosyası otomatik yeniden üretiliyor.

---

## 3. Yapılacaklar (bu chat kapanmadan önce / yeni chat'e geçerken)

1. **`git push origin main`** — bu oturumda `device_bash`'ten push çalışmıyor (bilinen kısıt, tüm oturum boyunca böyleydi). Kendi PowerShell'inden çalıştır:
   ```powershell
   cd C:\Users\ytt\OneDrive\Masaüstü\PROJELER\lexis\lexis
   git push origin main
   ```
   Push sonrası: Vercel (web) ve Railway (backend) otomatik deploy olacak. Mobil tarafta EAS build/submit gerekmiyorsa (native kod değişmedi, sadece JS/TS) OTA update yeterli olabilir — `eas update` komutunu kendi tarafında çalıştırman gerekiyor (bu session'dan tetiklenemiyor).
2. Backend deploy olduktan sonra **canlıda hızlı doğrulama** öner:
   - Admin panelde `/admin/users` sayfasını aç, E-posta sütununun artık dolu geldiğini ve sütun başlıklarına tıklayınca sıralamanın çalıştığını gör.
   - Web'de `/league` sayfasındaki "Özel Ligler" butonuna tıkla, bir özel lig oluştur, arama kutusuyla bir kullanıcı davet et (kendi ikinci bir test hesabınla veya bir arkadaşınla dene).
   - Mobilde (Expo Go veya güncellenmiş build) `Lig` ekranındaki "Özel Ligler" butonunu dene.

## 4. Sonraki mantıklı iş kalemleri (öneri, kullanıcı onayı gerekir)

- `list_users()` sayfalama bug'ının diğer 6 dosyadaki etkisini tek tek incele ve düzelt (bkz. §1.5 uyarı).
- `league_tiers` RLS'i aç (düşük öncelik, güvenlik formalitesi).
- Özel liglerde şu an "kurucu ayrılamaz, silmeli" kısıtlaması var (ownership transfer henüz yok) — kullanıcı bunu isterse `custom_leagues.created_by` devri için yeni bir uç eklenebilir.
- Mobilde EAS build/submit ve OTA update akışları hâlâ manuel (kullanıcı kendi PowerShell'inden tetikliyor) — otomasyon isteniyorsa ayrıca konuşulmalı.

---

*Bu dosya, önceki oturumlarda oluşturulup silinen `LEXIS_DEVIR_*.md` dosyalarıyla aynı amaçla hazırlandı — yeni bir chat'te bu dosyayı okuyarak kaldığın yerden devam edebilirsin. İşin bittiğini düşünürsen bu dosyayı silebilirsin (önceki dosyalarda olduğu gibi).*
