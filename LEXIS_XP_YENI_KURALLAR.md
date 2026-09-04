# Lexis — XP / Oyun Sömürüsü: Yeni Kurallar
**Tarih:** 4 Eylül 2026
**Hazırlayan:** Claude (analist/PM rolünde, kullanıcı onayına gerek kalmadan karar verme yetkisiyle)
**Kapsam:** Devir notu §1'deki XP sömürüsü sorunu — kod analiziyle doğrulanmış kök neden ve buna göre alınan bağlayıcı kararlar.

---

## 0. Özet — asıl sömürü nerede?

Kod okunduktan sonra tablo netleşti: **tek gerçek, kritik sömürü eşleştirme (matching) modunda.**

| Mod | Sunucuya yanlış deneme gidiyor mu? | Aynı kelimeyi bedelsiz tekrar deneyebiliyor mu? | Durum |
|---|---|---|---|
| `multiple_choice` | ✅ Evet, her tıklama gönderiliyor | ❌ Hayır — buton ilk tıklamadan sonra kilitleniyor | Sömürü yok, tasarım zaten doğru |
| `typing` / `listening` / `sprint` | ✅ Evet, tek deneme gönderiliyor | ❌ Hayır — cevap kilitleniyor | Sömürü yok |
| `wordle` | Harf harf, sunucu state'inde (`game_sessions.state`) tutuluyor | ❌ Hayır — `MAX_WRONG_GUESSES=6` sunucuda sayılıyor | Sömürü yok, zaten sağlam |
| **`matching`** | **❌ HAYIR — yanlış eşleştirme hiçbir zaman `/attempt`'e gitmiyor** | **✅ EVET — sınırsız, bedelsiz deneme-yanılma** | **🔴 Gerçek sömürü burada** |

`mobile/.../game.tsx` içindeki `attemptMatch` fonksiyonu, doğru eşleşmede `submitAttempt` çağırıyor ve XP veriyor; **yanlış eşleşmede sadece görsel bir "flaş" gösterip hiçbir şeyi sunucuya bildirmiyor.** Yani kullanıcı 4 kelimeyi rastgele deneyerek (en kötü ihtimalle birkaç deneme) hepsini bulur, hiçbir yanlış kaydedilmez, her doğru eşleşme tam XP kazandırır ve tur bitince yeni bir 4'lük tur otomatik yükleniyor — devir notundaki "sabahtan akşama kadar XP kasma" tarifi tam olarak bu.

Diğer modlardaki "yanlış bilince XP gitmiyor ama eksi de olmuyor" davranışı bir güvenlik açığı değil, bilinçli bir tasarım — aşağıda bunu neden değiştirmediğimi açıklıyorum.

---

## 1. Karara bağlanan 4 soru

### Soru 1 — Yanlış cevabın bedeli ne olsun?
**Karar: XP verilmiyor (0 XP), ama toplam XP asla eksiye düşmüyor.**

Gerekçe: `total_xp` düşürülürse `level_from_total_xp()` kullanıcıyı **seviye düşürebilir** (level, total_xp'den her hesaplamada yeniden türetiliyor). Bir kelime öğrenme uygulamasında kullanıcının seviyesinin geriye gitmesi ciddi bir motivasyon/churn riski — sektörde de norm budur (Duolingo dahil hiçbir major uygulama XP'yi eksiye düşürmez, sadece ödülü keser). "Eksi olsun" isteğinin arkasındaki gerçek ihtiyaç zaten karşılanıyor: **yanlış yapmanın gerçek bir bedeli olsun, kullanıcı bedelsiz doğruya ulaşamasın.** Bunu XP'yi eksiltmek yerine "sadece ilk doğru denemede XP ver" kuralıyla sağlıyoruz (bkz. Kural aşağıda).

### Soru 2 — Eşleştirmede kaç yanlış hakkı olsun?
**Karar: Sabit bir hak sayısı yok; onun yerine "ilk deneme" kuralı uygulanıyor (bkz. §2).** Kullanıcı istediği kadar yanlış deneyebilir, tur bitmez, ama bir kelimede en az bir yanlış yapıldıysa o kelime XP kazandırmaz (doğru bulunsa bile). Sabit bir "3 hakkın var" sınırı yerine bunu tercih ettim çünkü: (a) uygulaması daha basit — yeni bir sayaç/tablo gerektirmiyor, mevcut `game_attempts` kaydından türetiliyor; (b) tüm modlarla (multiple_choice, typing, vb.) **aynı tek kuralı** paylaşıyor, bakımı kolaylaştırıyor; (c) kullanıcıyı turdan atmıyor, öğrenme deneyimini bozmuyor — sadece "kolay yoldan XP" kapanıyor.

### Soru 3 — Ara denemeler sunucuya gönderilsin mi?
**Karar: Evet — ve zaten çoğu modda gönderiliyordu. Eksik olan tek yer eşleştirme modu, o da düzeltiliyor.**

Ayrıca: istemcinin gönderdiği `attempts_count` alanına **güvenilmiyor** (istemci taraflı sayaç kolayca manipüle edilebilir). Sunucu "bu ilk deneme mi?" sorusunu kendi `game_attempts` tablosundaki geçmiş kayıttan sayarak cevaplıyor — istemci ne gönderirse göndersin sonuç değişmiyor. Bu, mimarideki en önemli sağlamlaştırma.

### Soru 4 — Liderlik tablosu geriye dönük düzeltilsin mi?
**Karar: Hayır, dokunulmuyor.**

Gerekçe: Kullanıcılar var olan sistemi olduğu gibi kullandı, hata onların değil bizim mimarimizdeydi. Geçmiş XP'yi geri almak destek taleplerine, güven kaybına ve "neden benim puanım düştü" şikayetlerine yol açar — kazanımı kaybettirmeden çok daha yüksek maliyetli. Kural yalnızca **bugünden itibaren** geçerli olacak. İstersen ileride "şüpheli XP" raporu (matching modundan anormal yüksek XP kazanan kullanıcılar) çıkarabilirim, ama otomatik/manuel kesinti önermiyorum.

---

## 2. Yeni kural — tek cümlede

> **XP, bir kelime/eşleştirme turunda yalnızca İLK denemede doğru cevap verildiğinde ödenir. Yanlış yapılıp sonra doğru bulunan bir kelime, skor için sayılır (turu tamamlar) ama 0 XP kazandırır. Bu kural sunucu tarafında, istemciye güvenmeden, o session + o kelime için önceki `game_attempts` kayıtlarına bakılarak uygulanır.**

Bu kural tüm modlarda zaten var olan davranışla %100 tutarlı (multiple_choice/typing/listening/sprint zaten tek denemelik) — sadece **eşleştirme modunu onlarla aynı sözleşmeye sokuyor.** Wordle ayrı kalıyor (harf tahmini farklı bir oyun mekaniği, zaten sunucu taraflı ve sınırlı).

## 3. Faz 2 önerisi (backlog, şimdi zorunlu değil)
Bu kural sömürüyü kapatsa da, bir kullanıcı gün boyu "own" havuzundaki az sayıda kelimeyle yeni yeni session açıp gerçek pratikle düşük-eforlu tekrar XP'si toplayabilir (bu, spaced-repetition mantığına aykırı değil — pratik teşvik edilmeli). İstersen ileride kaynak tipi başına (`game_matching`, `game_typing` vb.) günlük yumuşak bir XP tavanı ekleyebiliriz. Şimdilik gerekli görmüyorum, MVP'de kapsam dışı bıraktım.

---

## 4. Uygulama (yapıldı)

- **Backend** (`backend/app/api/routes/games.py`): `submit_attempt` artık XP vermeden önce o session + o kelime için önceki deneme sayısını kontrol ediyor; ilk deneme değilse `is_correct=true` olsa da `xp_awarded=0`.
- **Mobile** (`mobile/src/app/(app)/game.tsx`): `attemptMatch` artık yanlış eşleşmede de her iki kelime için `submitAttempt(is_correct: false)` çağırıyor — yanlış denemeler artık kayıt altında.

Değişikliklerin tam içeriği için ilgili dosyaların güncel hallerine bakabilirsin (aynı depoya yazıldı).
