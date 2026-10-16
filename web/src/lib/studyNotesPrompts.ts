// lib/studyNotesPrompts.ts — "Çalışma Notlarım" sayfası için Gemini ve
// NotebookLM'e kopyalanıp yapıştırılacak hazır talimat metinlerini üretir
// (15 Ekim 2026 kullanıcı isteği). İkisinin de bu iş için ücretsiz/genel
// kullanıma açık bir API'si yok (kullanıcı AI soru üretimi için daha önce
// ödemeli bir LLM API'sini maliyet yüzünden iptal etmişti, aynı maliyete
// tekrar girmek istemiyor) — bu yüzden gerçek bir API entegrasyonu kurmak
// yerine kullanıcı bu metni kopyalayıp ilgili sitede (Gemini/NotebookLM)
// manuel olarak yapıştırıyor, oradan aldığı özeti de geri buraya yapıştırıp
// kaydediyor (bkz. study-notes/[date]/page.tsx).

function formatDateTr(dateIso: string): string {
  const [y, m, d] = dateIso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' });
}

function topicLine(topicTitle: string | null, activities: string[]): string {
  if (topicTitle) return topicTitle;
  if (activities.length > 0) return activities[0];
  return 'Genel Çalışma Programı';
}

// NotebookLM: Studio panelindeki "İnfografik" veya "Raporlar" aracının özel
// talimat alanına yapıştırılır (kaynak olarak o günkü ders notu/Gramer
// Rehberi sayfası NotebookLM'e önceden kaynak olarak yüklenmiş olmalı).
// "Zihin Haritası" ayrı bir Studio butonu olduğu için bu metne dahil
// edilmiyor, ayrıca tek tıkla üretilebiliyor.
export function buildNotebookLMPrompt(
  dateIso: string,
  topicTitle: string | null,
  activities: string[],
  relatedTopics: string[] = []
): string {
  const tarih = formatDateTr(dateIso);
  const konu = topicLine(topicTitle, activities);
  const aktiviteSatiri =
    activities.length > 0 ? `\nBugün tamamladığım etkinlikler: ${activities.join(', ')}.` : '';
  // 16 Ekim 2026, kullanıcı isteği -- bu haftaya bağlı diğer konular da
  // GERÇEK müfredat (sadece referans değil), özet/infografik bunları da
  // kapsasın.
  const ilgiliSatiri =
    relatedTopics.length > 0
      ? `\nBu hafta ayrıca şu konulara da çalışmam gerekiyor, lütfen her biri için de aynı formatta ayrı bir bölüm hazırla: ${relatedTopics.join(', ')}.`
      : '';

  return `Bugün (${tarih}) çalıştığım konu: ${konu}.${aktiviteSatiri}${ilgiliSatiri}

Yüklediğim kaynaklardan yola çıkarak bu konuyu aşağıdaki formatta, görsel olarak zengin ve akılda kalıcı bir "çalışma özeti" infografiği hazırla:

1. Başlık: "${konu} — Çalışma Özeti (${tarih})"
2. En üstte, konuyu tek cümlede özetleyen kısa bir giriş kutusu.
3. Konuyu mantıksal alt başlıklara ayır (kullanım alanları, kurallar, yapı, zaman zarfları, istisnalar vb. — konuya göre uyarla). Her alt başlığı ayrı renkli bir kutu/bölüm olarak göster.
4. Her alt başlıkta en kritik/unutulmaması gereken kuralı diğer metinden ayrışacak şekilde renkli ve altı çizili ya da renkli arka planlı bir kutu içinde vurgula.
5. Her kuralın yanına kısa, somut bir örnek cümle ekle — mümkünse doğru/yanlış karşılaştırmalı.
6. Karıştırılan/benzer başka bir yapı varsa, en altta ayrı bir "Sık Yapılan Hatalar" ya da "Karşılaştırma" bölümünü turuncu/kırmızı tonlu bir uyarı kutusu olarak ekle.
7. En sona, konuyu tek bakışta özetleyen küçük bir "Hızlı Kural Kartı" koy.
8. Renk paletini tutarlı kullan: ana kurallar mavi/yeşil, uyarılar turuncu/kırmızı, örnekler nötr gri kutularda olsun.
9. Uzun düz metin paragrafları yerine kutular, ikonlar ve kısa maddeler kullan — format bir infografik/rapor olsun, deneme değil.

Ayrıca bu konu için ayrı bir Zihin Haritası da oluştur: ana konu merkezde, alt başlıklar dallar, her dalın altında en fazla 3-4 alt madde olacak şekilde.`;
}

// Gemini: düz sohbet penceresine yapıştırılır, Gemini'nin kendi görsel
// üretim özelliğini (resim oluştur) kullanarak renkli bir infografik
// GÖRSELİ üretmesi istenir (kullanıcının önceki örneği de bu şekildeydi).
export function buildGeminiPrompt(
  dateIso: string,
  topicTitle: string | null,
  activities: string[],
  relatedTopics: string[] = []
): string {
  const tarih = formatDateTr(dateIso);
  const konu = topicLine(topicTitle, activities);
  const aktiviteSatiri =
    activities.length > 0 ? `\nBugün tamamladığım etkinlikler: ${activities.join(', ')}.` : '';
  const ilgiliSatiri =
    relatedTopics.length > 0
      ? `\nBu hafta ayrıca şu konulara da çalışmam gerekiyor, lütfen her biri için de ayrı bir görsel/bölüm hazırla: ${relatedTopics.join(', ')}.`
      : '';

  return `Bugün (${tarih}) çalıştığım konu: ${konu}.${aktiviteSatiri}${ilgiliSatiri}

Bu konuyu özetleyen, renkli ve görsel olarak zengin bir İNFOGRAFİK GÖRSELİ oluştur (bir resim üret, düz metin değil). Görsel şu özelliklere sahip olsun:

1. Üstte büyük başlık: "${konu}"
2. Konuyu "Kullanım Alanları", "Yapı/Kurallar", "Zaman Zarfları/İpuçları" gibi ayrı renkli kutulara/bölümlere ayır (her bölüm farklı pastel bir arka plan rengine sahip olsun).
3. Her bölümde en fazla 3-4 kısa madde, gerektiğinde küçük bir ikonla.
4. Her kuralın yanına kısa bir örnek cümle ekle.
5. Bu konu başka bir yapıyla sıkça karıştırılıyorsa, altta "vs." şeklinde yan yana bir karşılaştırma bölümü ekle (iki farklı renk).
6. En altta, dikkat çekici bir renkte kısa bir "Hızlı Kural" özet kutusu olsun.
7. Görsel kalabalık olmasın, okunaklı büyük fontlar ve bol boşluk kullan — infografik/eğitim posteri tarzında olsun.

Görseli oluşturduktan sonra, aynı içeriği kısa bir metin özeti olarak da yaz ki kopyalayıp notlarıma ekleyebileyim.`;
}
