// lib/studyNotesPrompts.ts — "Çalışma Notlarım" sayfası için Gemini ve
// NotebookLM'e kopyalanıp yapıştırılacak hazır talimat metinlerini üretir
// (15 Ekim 2026 kullanıcı isteği). İkisinin de bu iş için ücretsiz/genel
// kullanıma açık bir API'si yok (kullanıcı AI soru üretimi için daha önce
// ödemeli bir LLM API'sini maliyet yüzünden iptal etmişti, aynı maliyete
// tekrar girmek istemiyor) — bu yüzden gerçek bir API entegrasyonu kurmak
// yerine kullanıcı bu metni kopyalayıp ilgili sitede (Gemini/NotebookLM)
// manuel olarak yapıştırıyor, oradan aldığı özeti de geri buraya yapıştırıp
// kaydediyor (bkz. study-notes/[date]/page.tsx).
//
// 16 Ekim 2026, kullanıcının İKİNCİ isteği (aynı gün): "bu prompt sadece
// [ana konu] için oluştu, ama diğer dört konu için de bu tarz prompt
// oluşmalı" -- önceden tek bir prompt, o haftaya bağlı diğer konuları
// sadece bir ek cümleyle ("...için de ayrı bir bölüm hazırla") listeliyordu.
// Artık GÜNÜN HER KONUSU (ana + ilgili) için AYRI, kendi başına tam bir
// infografik prompt'u üretiliyor -- bkz. study-notes/[date]/page.tsx'teki
// konu seçici (1-2-3-4-5 sekmeleri), her sekme kendi promptunu bu
// fonksiyonlarla (isMain bayrağıyla) üretiyor.

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

// Günün ana konusu için "bugün bunu çalıştım" baglamı, haftaya bağlı ilgili
// (ama bugün asıl çalışılmış olmayan) konular için "bu hafta çalışmam
// gereken konulardan biri" baglamı -- ikisi de kendi başına tam bir
// infografik isteği olarak devam ediyor.
function contextLine(dateIso: string, konu: string, activities: string[], isMain: boolean): string {
  const tarih = formatDateTr(dateIso);
  if (isMain) {
    const aktiviteSatiri =
      activities.length > 0 ? `\nBugün tamamladığım etkinlikler: ${activities.join(', ')}.` : '';
    return `Bugün (${tarih}) çalıştığım konu: ${konu}.${aktiviteSatiri}`;
  }
  return `Bu hafta (${tarih} tarihli günün de içinde olduğu haftanın programına dahil) çalışmam gereken konulardan biri: ${konu}.`;
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
  isMain: boolean = true
): string {
  const tarih = formatDateTr(dateIso);
  const konu = topicLine(topicTitle, activities);
  const giris = contextLine(dateIso, konu, activities, isMain);

  return `${giris}

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

Ayrıca bu konu için ayrı bir Zihin Haritası da oluştur: ana konu merkezde, alt başlıklar dallar, her dalın altında en fazla 3-4 alt madde olacak şekilde.

Not defterine yüklediğim kaynaklar bu iş için yeterli ve tamamlanmış durumda — bana hangi kaynağı yüklemem gerektiğini sorma, ek araştırma teklif etme ya da onay isteme; doğrudan üretime başla.`;
}

// Gemini: düz sohbet penceresine yapıştırılır, Gemini'nin kendi görsel
// üretim özelliğini (resim oluştur) kullanarak renkli bir infografik
// GÖRSELİ üretmesi istenir (kullanıcının önceki örneği de bu şekildeydi).
export function buildGeminiPrompt(
  dateIso: string,
  topicTitle: string | null,
  activities: string[],
  isMain: boolean = true
): string {
  const konu = topicLine(topicTitle, activities);
  const giris = contextLine(dateIso, konu, activities, isMain);

  return `${giris}

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


// 21 Ekim 2026 kullanici istegi: "o gun icinde cikarttigimiz tum ozetleri
// videolu sekilde anlatan notebooklm promtu hazirla" -- yukaridaki
// buildNotebookLMPrompt KONU bazli (her sekme/konu icin ayri infografik
// prompt'u), bu fonksiyon ise GUN bazli TEK bir prompt uretir: o gunun TUM
// konularini (ana + ilgili, StudyDayTopic dizisi) sirayla ele alan, tek bir
// NotebookLM "Video Ozeti" (Video Overview) studio araci icin ozel talimat
// metni. "Bugunun Ozet Videosu" karti bu prompt'u gosterir (bkz.
// study-notes/[date]/page.tsx).
export function buildDaySummaryVideoPrompt(
  dateIso: string,
  topics: { title: string | null; is_main: boolean }[],
  activities: string[]
): string {
  const tarih = formatDateTr(dateIso);
  const konuBasliklari = topics.map((t) => topicLine(t.title, activities));
  const konuListesi = konuBasliklari.map((k, i) => `${i + 1}. ${k}`).join('\n');
  const konuSayisi = konuBasliklari.length;

  return `Bugün (${tarih}) çalıştığım, aşağıda sıraladığım ${konuSayisi} konuyu kapsayan; yüklediğim kaynaklara (o günkü ders notları/Gramer Rehberi sayfaları) dayanan TEK bir video özeti hazırla.

ÖNEMLİ: Bu not defterine YÜKLEDİĞİM kaynaklar bu video için yeterli ve tamamlanmış durumda. Bana hangi kaynağı yükleyeceğimi sorma, web araştırması yapmayı teklif etme ya da başka bir onay/netleştirme sorusu sorma — doğrudan video özetini üretmeye başla. Kaynaklarda bir konuyla ilgili ayrıntı sınırlıysa bile elindeki bilgiyle en iyi özeti çıkar, durup soru sorma.

Bugünün konuları (bu sırayla ele al):
${konuListesi}

Video şu şekilde kurgulansın:
1. Kısa bir açılış: "${tarih} tarihli çalışma özeti" ve bugün kaç konu işlendiği.
2. Her konu için ayrı bir bölüm: konunun en kritik 2-3 kuralı, birer somut örnek cümle ve varsa sık yapılan hata/karıştırılan yapı. Her bölümde AŞAĞIDAKİLER MUTLAKA ekranda YAZILI METİN olarak görünsün (sadece sözlü anlatılıp geçilmesin):
   - Konunun gramer yapısı/formülü kısa ve net bir şablon halinde (ör. "Subject + have/has + V3", "Subject + was/were + V-ing").
   - O an anlatılan kural/zaman ifadesi ekranda okunabilir metin olarak dursun — anlatımda geçen anahtar kelimeler (ör. "since", "for", "already", "yet", "ago") ekranda büyük ve vurgulu yazı olarak gösterilsin.
   - Her örnek cümlenin TAMAMI (İngilizce, varsa kısa Türkçe karşılığıyla) ekranda eksiksiz yazılı metin olarak görünsün — sadece bir ikon/illüstrasyonla temsil edilmesin.
   - Sık yapılan hata varsa, yanlış ve doğru halleri TAM CÜMLE olarak yan yana ekranda yazsın (ör. "❌ I have went..." / "✅ I have gone...").
3. GÖRSEL-ANLATIM SENKRONU: Ekrandaki yazı/görsel, o anda anlatılan şeyle birebir eşleşsin. Anlatıcı bir kelimeyi, kuralı ya da cümleyi söylerken o kelime/kural/cümle o anda gerçekten ekranda yazılı olmalı; anlatıcı "ekranda gördüğünüz gibi" dediğinde ekranda sözü edilen şey fiilen görünür olmalı. Bir görsel/illüstrasyon sadece dekoratif kalıp anlatım onun kapsamadığı yeni bir noktaya geçmesin — her yeni kurala, kelimeye ya da örneğe geçildiğinde ekran içeriği de hemen güncellensin.
4. Konular arasında net bir geçiş olsun ("Şimdi ikinci konumuza geçiyoruz" gibi), her konuya yaklaşık eşit süre ayrılsın.
5. Kaynaklardaki örnekleri ve kuralları birebir kullan, uydurma bilgi ekleme.
6. En sonda, tüm günün konularını özetleyen 3-4 maddelik hızlı bir tekrar/kapanış bölümü olsun; bu bölümde de her maddenin yanında ilgili anahtar yapı/kelime ekranda yazılı olarak görünsün.

Bu video sadece hızlıca konuşulup geçilen bir "özet" OLMAMALI — gerçek bir ders videosu gibi öğretici ve eğitici olmalı: izleyen kişi sesi kapatıp sadece ekranı okuyarak bile konunun gramer yapısını, anahtar kelimelerini ve örnek cümlelerini öğrenebilmeli. Dekoratif illüstrasyon/ikon kullanımı serbest ama bunlar yazılı içeriğin (yapı, kelime, örnek cümle) YERİNE DEĞİL, ONUN YANINDA/DESTEĞİNDE olmalı — her sahnede mutlaka o an anlatılan gramer yapısı, kelime(ler) ve örnek cümle(ler) okunabilir yazı olarak bulunsun.

Ton: bir öğretmenin sınava hazırlanan öğrenciye video dersi anlatması gibi, sade ve akıcı.`;
}


// 22 Ekim 2026 kullanıcı isteği: "Video özeti oluşturması için bizim
// hazırladığımız not, özet ve görsellere ihtiyaç olacaksa, onları
// indirebileceğimiz bir buton yapalım." -- NotebookLM'in Video Özeti aracı
// SADECE not defterine önceden kaynak yüklenmişse çalışıyor (bkz.
// DaySummaryVideoCard, study-notes/[date]/page.tsx); bu fonksiyon o
// kaynağı üretir: günün her konusu için Gramer Rehberi'ndeki kural/örnek/
// sık-hata içeriğini (grammar_topics -- otorite kaynak) ve kullanıcının o
// konu için daha önce Gemini/NotebookLM/manuel panellerine kaydettiği notu
// (study_notes.content/image_urls) TEK bir Markdown dosyasında birleştirir.
// Kullanıcı bu dosyayı indirip NotebookLM'e kaynak olarak yükledikten sonra
// yukarıdaki buildDaySummaryVideoPrompt'u çalıştırabilir.
export interface DaySourceGrammarContent {
  title_tr: string;
  summary_tr: string;
  rule_content_md: string;
  example_sentences: { en: string; tr?: string | null }[];
  common_mistakes: { wrong: string; correct: string; note: string }[];
}

export interface DaySourceSavedNote {
  source: string;
  content: string;
  image_urls: string[];
}

export interface DaySourceTopic {
  slug: string;
  title: string | null;
  // grammar: o konu için Gramer Rehberi'nde içerik bulunamadıysa (ör. "genel"
  // slug'lı gün) null -- bu durumda sadece kullanıcının kendi notları yazılır.
  grammar: DaySourceGrammarContent | null;
  savedNotes: DaySourceSavedNote[];
}

const NOTE_SOURCE_LABELS: Record<string, string> = {
  gemini: 'Gemini',
  notebooklm: 'NotebookLM',
  manual: 'Kendi Notlarım',
};

export function buildDaySourcesDocument(dateIso: string, topics: DaySourceTopic[]): string {
  const tarih = formatDateTr(dateIso);

  const sections = topics.map((topic, i) => {
    const baslik = topic.title || topic.grammar?.title_tr || `Konu ${i + 1}`;
    const parts: string[] = [`## ${i + 1}. ${baslik}`];

    if (topic.grammar) {
      parts.push(topic.grammar.summary_tr);
      parts.push(topic.grammar.rule_content_md);

      if (topic.grammar.example_sentences.length > 0) {
        parts.push(
          '### Örnek Cümleler\n' +
            topic.grammar.example_sentences
              .map((e) => `- ${e.en}${e.tr ? ` — ${e.tr}` : ''}`)
              .join('\n')
        );
      }

      if (topic.grammar.common_mistakes.length > 0) {
        parts.push(
          '### Sık Yapılan Hatalar\n' +
            topic.grammar.common_mistakes
              .map((m) => `- ❌ ${m.wrong} → ✅ ${m.correct} (${m.note})`)
              .join('\n')
        );
      }
    } else {
      parts.push('_Bu konu için Gramer Rehberi içeriği bulunamadı._');
    }

    if (topic.savedNotes.length > 0) {
      const notLines = topic.savedNotes
        .map((n) => {
          const etiket = NOTE_SOURCE_LABELS[n.source] || n.source;
          const gorseller =
            n.image_urls.length > 0 ? `\n(Görseller: ${n.image_urls.join(', ')})` : '';
          return `**${etiket}:**\n${n.content}${gorseller}`;
        })
        .join('\n\n');
      parts.push(`### Daha Önce Kaydettiğim Notlarım\n${notLines}`);
    }

    return parts.join('\n\n');
  });

  return `# ${tarih} — Çalışma Kaynakları

Bu dosya, ${tarih} tarihinde çalıştığım ${topics.length} konunun Gramer Rehberi'ndeki kuralları, örnekleri, sık yapılan hataları ve (varsa) bu konular için daha önce kaydettiğim notları/görsel bağlantılarını içerir.

NotebookLM'de yeni bir not defteri aç (veya bugünün konularına ayrılmış defteri kullan), bu dosyayı kaynak olarak yükle, ardından "Bugünün Özet Videosu" kartındaki metni kopyalayıp Video Özeti aracının özel talimat alanına yapıştır.

${sections.join('\n\n---\n\n')}`;
}
