import type { Metadata } from 'next';
import { LegalLayout } from '@/components/LegalLayout';
import { COMPANY_INFO } from '@/lib/config';

export const metadata: Metadata = {
  title: 'Kullanım Şartları — Lexis',
  description: 'Lexis web sitesi ve mobil uygulamasının kullanım şartları.',
};

export default function TermsOfUsePage() {
  return (
    <LegalLayout title="Kullanım Şartları" updatedAt="29 Ağustos 2026">
      <>
        <p>
          Bu Kullanım Şartları (&quot;Şartlar&quot;), <strong>{COMPANY_INFO.legalName}</strong> (&quot;İşletme&quot;,
          &quot;biz&quot;) tarafından işletilen Lexis web sitesi ve mobil uygulamasını (birlikte
          &quot;Lexis&quot; veya &quot;Hizmet&quot;) kullanımınıza ilişkin koşulları düzenler. Hizmete kaydolarak
          veya Hizmeti kullanarak bu Şartları kabul etmiş sayılırsınız.
        </p>

        <h2>1. Hizmetin Tanımı</h2>
        <p>
          Lexis; kişisel kelime listesi oluşturma, günlük çalışma programı takibi, oyun ve quiz
          modlarıyla pekiştirme, XP/seviye ve rozet sistemi, arkadaş ekleme ve liderlik tablosu gibi
          özellikler sunan bir dil öğrenme uygulamasıdır. Hizmet, ücretsiz bir temel plan ile ek
          özellikler sunan ücretli bir Premium plandan oluşur; Premium planın satın alma koşulları
          ayrıca <a href="/mesafeli-satis-sozlesmesi">Mesafeli Satış Sözleşmesi</a>&apos;nde düzenlenir.
        </p>

        <h2>2. Hesap Oluşturma ve Kullanıcı Yükümlülükleri</h2>
        <ul>
          <li>Hizmeti kullanabilmek için doğru ve güncel bilgilerle bir hesap oluşturmanız gerekir.</li>
          <li>Hesabınızın ve kimlik doğrulama bilgilerinizin gizliliğinden siz sorumlusunuz; hesabınız üzerinden gerçekleşen tüm işlemlerden siz sorumlu tutulursunuz.</li>
          <li>Hizmeti yasa dışı amaçlarla, başkalarını taciz/tehdit edecek şekilde, hakaret veya nefret söylemi içerecek şekilde ya da başkalarının fikri mülkiyet haklarını ihlal edecek şekilde kullanamazsınız.</li>
          <li>Diğer kullanıcılara yönelik uygunsuz davranışları uygulama içindeki engelleme ve şikayet/rapor etme araçlarıyla bize bildirebilirsiniz.</li>
          <li>Hizmetin işleyişine zarar verecek şekilde otomatik araçlar (bot, scraping vb.) kullanılamaz.</li>
        </ul>

        <h2>3. Fikri Mülkiyet</h2>
        <p>
          Lexis markası, logosu, arayüz tasarımı, yazılım kodu ve uygulama içi orijinal içerikler
          İşletmeye veya lisans verenlerine aittir ve telif hakkı ile marka mevzuatı kapsamında
          korunmaktadır. Kullanıcı olarak Hizmeti yalnızca kişisel, ticari olmayan amaçlarla
          kullanmak üzere sınırlı, devredilemez bir kullanım hakkına sahip olursunuz. Kelime
          listenize eklediğiniz kendi içerikleriniz (örnekler, notlar vb.) size aittir; bunları
          Hizmeti size sunabilmemiz için gerekli ölçüde işlememize izin vermiş olursunuz.
        </p>

        <h2>4. Premium Abonelik ve Ödemeler</h2>
        <p>
          Premium abonelik satın alımları; web üzerinden iyzico altyapısıyla, mobil uygulamalarda ise
          Apple App Store / Google Play uygulama içi satın alma (IAP) altyapılarıyla gerçekleştirilir.
          Fiyatlandırma, cayma hakkı ve iade koşulları için{' '}
          <a href="/mesafeli-satis-sozlesmesi">Mesafeli Satış Sözleşmesi</a> ve{' '}
          <a href="/teslimat-iade-sartlari">Teslimat ve İade Şartları</a> sayfalarımız geçerlidir.
        </p>

        <h2>5. Hizmetin Değişmesi ve Kesintiler</h2>
        <p>
          Hizmeti geliştirmek amacıyla özelliklerinde zaman zaman değişiklik yapabilir, bakım
          çalışmaları nedeniyle geçici kesintiler yaşanabilir. Makul ölçüde önceden bilgilendirme
          yapmaya çalışırız; ancak planlanmamış kesintilerden dolayı sorumluluk kabul etmeyiz.
        </p>

        <h2>6. Sorumluluğun Sınırlandırılması</h2>
        <p>
          Lexis, dil öğrenme sürecinizi desteklemek amacıyla &quot;olduğu gibi&quot; sunulmaktadır. Yasaların
          izin verdiği azami ölçüde, Hizmetin kullanımından doğabilecek dolaylı zararlardan (veri
          kaybı, kâr kaybı vb.) İşletme sorumlu tutulamaz. Bu sınırlama, İşletmenin kasıt veya ağır
          kusurundan doğan sorumluluğunu ortadan kaldırmaz.
        </p>

        <h2>7. Hesabın Askıya Alınması veya Sonlandırılması</h2>
        <p>
          Bu Şartların ihlal edilmesi halinde hesabınızı askıya alma veya sonlandırma hakkımız
          saklıdır. Siz de dilediğiniz zaman hesabınızı uygulama içinden veya {COMPANY_INFO.email}{' '}
          adresine yazarak kapatabilirsiniz; hesap kapatma sonrası kişisel verilerinizin işlenmesi{' '}
          <a href="/gizlilik-politikasi">Gizlilik Politikamız</a> uyarınca sona erer.
        </p>

        <h2>8. Uygulanacak Hukuk ve Yetkili Mahkeme</h2>
        <p>
          Bu Şartlardan doğabilecek uyuşmazlıklarda Türkiye Cumhuriyeti kanunları uygulanır;
          tüketici işlemlerinde tüketici hakem heyetleri ve tüketici mahkemeleri, diğer
          uyuşmazlıklarda ise {COMPANY_INFO.address.split(',').pop()?.trim() || 'işletme merkezinin bulunduğu yer'} mahkemeleri ve icra daireleri yetkilidir.
        </p>

        <h2>9. Değişiklikler</h2>
        <p>
          Bu Kullanım Şartları, yasal düzenlemeler veya hizmetlerimizdeki değişiklikler doğrultusunda
          güncellenebilir. Güncel sürüm her zaman bu sayfada yayımlanır; önemli değişikliklerde sizi
          uygulama içinden bilgilendirmeye çalışırız.
        </p>

        <h2>10. İletişim</h2>
        <p>
          Bu Şartlarla ilgili sorularınız için {COMPANY_INFO.email} adresinden bize ulaşabilirsiniz.
        </p>
      </>
    </LegalLayout>
  );
}
