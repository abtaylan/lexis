import type { Metadata } from 'next';
import { LegalLayout } from '@/components/LegalLayout';
import { COMPANY_INFO } from '@/lib/config';

export const metadata: Metadata = {
  title: 'Mesafeli Satış Sözleşmesi — Lexis',
  description: 'Lexis Premium abonelik hizmeti mesafeli satış sözleşmesi.',
};

export default function DistanceSalesAgreementPage() {
  return (
    <LegalLayout title="Mesafeli Satış Sözleşmesi" updatedAt="29 Ağustos 2026">
      <>
        <h2>1. Taraflar</h2>
        <p>
          <strong>SATICI</strong>
          <br />
          Unvan: {COMPANY_INFO.legalName}
          <br />
          Yetkilisi: {COMPANY_INFO.ownerName}
          <br />
          Vergi Dairesi / No: {COMPANY_INFO.taxOffice} / {COMPANY_INFO.taxNumber}
          <br />
          Adres: {COMPANY_INFO.address}
          <br />
          E-posta: {COMPANY_INFO.email}
          <br />
          Telefon: {COMPANY_INFO.phone}
        </p>
        <p>
          <strong>ALICI</strong>
          <br />
          Lexis platformunda hesap açarak ve Premium abonelik satın alarak işbu sözleşmeyi kabul eden
          üye (&quot;Alıcı&quot;, &quot;Tüketici&quot;).
        </p>

        <h2>2. Sözleşmenin Konusu</h2>
        <p>
          İşbu sözleşmenin konusu, Alıcı&apos;nın Satıcı&apos;ya ait lexiswords.com / app.lexiswords.com
          adresi üzerinden elektronik ortamda satın aldığı &quot;Lexis Premium&quot; dijital abonelik
          hizmetinin satışı ve ifasına ilişkin, 6502 sayılı Tüketicinin Korunması Hakkında Kanun ve
          Mesafeli Sözleşmeler Yönetmeliği hükümleri uyarınca tarafların hak ve yükümlülüklerinin
          belirlenmesidir.
        </p>

        <h2>3. Hizmetin Temel Nitelikleri ve Fiyatı</h2>
        <p>
          Lexis Premium; reklamsız kullanım, sınırsız kelime listesi/çalışma programı ve premium
          içeriklere erişim gibi ek özellikler sunan, dijital ortamda anında ifa edilen bir abonelik
          hizmetidir. Güncel fiyatlar ve ödeme periyotları (aylık/yıllık), satın alma anında Lexis
          Premium sayfasında Alıcı&apos;ya seçtiği para birimi (TRY/USD/EUR) üzerinden açıkça
          gösterilir ve Alıcı&apos;nın onayına sunulur. Fiyata yürürlükteki mevzuat gereği tahsil
          edilmesi gereken vergiler dahildir.
        </p>

        <h2>4. Ödeme Şekli</h2>
        <p>
          Ödemeler, web üzerinden iyzico ödeme altyapısı ile kredi/banka kartından; mobil
          uygulamalarda ise Apple App Store veya Google Play uygulama içi satın alma (IAP) sistemleri
          üzerinden tahsil edilir. Kart bilgileri Satıcı tarafından görülmez veya saklanmaz; işlem
          doğrudan ilgili ödeme kuruluşunun güvenli altyapısında gerçekleşir.
        </p>

        <h2>5. Abonelik Süresi, Yenileme ve İptal</h2>
        <ul>
          <li>Abonelik, seçilen plana göre (aylık/yıllık) otomatik olarak yenilenir.</li>
          <li>Alıcı, aboneliğini dilediği zaman Lexis Premium sayfasından iptal edebilir; iptal, mevcut ödenmiş dönemin sonunda etkili olur, dönem içinde kesinti olmadan hizmete erişim devam eder.</li>
          <li>Mobil uygulama içi satın alımlarda iptal işlemi ilgili mağazanın (App Store / Google Play) abonelik yönetim ekranı üzerinden yapılır.</li>
        </ul>

        <h2>6. Cayma Hakkı</h2>
        <p>
          Mesafeli Sözleşmeler Yönetmeliği&apos;nin 15. maddesinin birinci fıkrasının (ğ) bendi
          uyarınca; <strong>elektronik ortamda anında ifa edilen hizmetler ve tüketiciye anında
          teslim edilen gayrimaddi mallar</strong> (Lexis Premium gibi dijital abonelik hizmetleri)
          bakımından, Alıcı&apos;nın ifanın hemen başlamasını onaylaması halinde cayma hakkı
          kullanılamaz. Alıcı, ödeme adımında bu hususu onaylayarak satın alma işlemini
          tamamlamaktadır.
        </p>
        <p>
          Buna karşın Satıcı, dilerse Alıcı memnuniyetini gözeten gönüllü bir iade politikası
          uygulayabilir; güncel iade politikası için{' '}
          <a href="/teslimat-iade-sartlari">Teslimat ve İade Şartları</a> sayfasına bakınız.
        </p>

        <h2>7. Uyuşmazlıkların Çözümü</h2>
        <p>
          İşbu sözleşmeden doğan uyuşmazlıklarda, Ticaret Bakanlığınca her yıl ilan edilen parasal
          sınırlar dahilinde Alıcı&apos;nın veya Satıcı&apos;nın yerleşim yerindeki Tüketici Hakem
          Heyetleri, bu sınırları aşan uyuşmazlıklarda ise Tüketici Mahkemeleri yetkilidir.
        </p>

        <h2>8. Yürürlük</h2>
        <p>
          Alıcı, Lexis Premium satın alma adımında bu sözleşmeyi okuduğunu ve kabul ettiğini beyan
          ederek elektronik ortamda onaylar; bu onay ile sözleşme yürürlüğe girer.
        </p>
      </>
    </LegalLayout>
  );
}
