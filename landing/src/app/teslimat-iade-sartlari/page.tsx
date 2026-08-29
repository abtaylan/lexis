import type { Metadata } from 'next';
import { LegalLayout } from '@/components/LegalLayout';
import { COMPANY_INFO } from '@/lib/config';

export const metadata: Metadata = {
  title: 'Teslimat ve İade Şartları — Lexis',
  description: 'Lexis Premium abonelik hizmeti teslimat ve iade şartları.',
};

export default function DeliveryRefundPage() {
  return (
    <LegalLayout title="Teslimat ve İade Şartları" updatedAt="29 Ağustos 2026">
      <>
        <h2>1. Teslimat</h2>
        <p>
          Lexis Premium, fiziksel bir ürün değil, elektronik ortamda sunulan bir dijital abonelik
          hizmetidir. Bu nedenle kargo veya fiziksel teslimat söz konusu değildir. Ödemenin
          ilgili ödeme kuruluşu (iyzico) veya mağaza (Apple App Store / Google Play) tarafından
          onaylanmasının ardından, Premium erişim hesabınıza <strong>anında</strong> tanımlanır. Herhangi
          bir gecikme yaşarsanız {COMPANY_INFO.email} adresinden bize ulaşabilirsiniz.
        </p>

        <h2>2. Cayma Hakkı İstisnası</h2>
        <p>
          Mesafeli Sözleşmeler Yönetmeliği&apos;nin 15/1-ğ maddesi uyarınca, elektronik ortamda anında
          ifa edilen hizmetler için, ifanın hemen başlamasını onaylayan tüketici cayma hakkını
          kullanamaz. Lexis Premium satın alımında bu onay, ödeme adımında açıkça alınır. Detaylar
          için <a href="/mesafeli-satis-sozlesmesi">Mesafeli Satış Sözleşmesi</a>&apos;ne bakınız.
        </p>

        <h2>3. Gönüllü İade Politikamız</h2>
        <p>
          Yasal cayma hakkı istisnasına rağmen, memnuniyetinizi önemsiyoruz. Aşağıdaki durumlarda
          talebinizi değerlendirip iade sağlayabiliriz:
        </p>
        <ul>
          <li>Ödemenin mükerrer (aynı dönem için birden fazla) tahsil edilmesi,</li>
          <li>Teknik bir arıza nedeniyle satın aldığınız Premium hizmete hiç erişememeniz,</li>
          <li>
            Satın alma tarihinden itibaren <strong>14 gün</strong> içinde,
            Premium&apos;a ait hiçbir ek özelliği (reklamsız kullanım, premium içerik vb.)
            kullanmamış olmanız.
          </li>
        </ul>
        <p>
          İade talepleri {COMPANY_INFO.email} adresine, satın alma tarihini ve sipariş/işlem
          bilgilerinizi belirterek iletilmelidir. Talepler en geç 14 iş günü içinde
          değerlendirilerek sonuçlandırılır. Onaylanan iadeler, ödemenin yapıldığı yönteme
          (kart/mağaza hesabı) iade edilir.
        </p>
        <p>
          Mobil uygulama içi satın alımlarda (Apple App Store / Google Play) iade talepleri,
          ilgili mağazanın kendi iade politikası ve süreci üzerinden de yürütülebilir; bu durumda
          mağazanın kararları esas alınır.
        </p>

        <h2>4. İptal</h2>
        <p>
          Aboneliğinizi dilediğiniz zaman Lexis Premium sayfasından iptal edebilirsiniz. İptal,
          ödenmiş mevcut dönemin sonunda etkin olur; dönem sonuna kadar Premium erişiminiz kesintisiz
          devam eder ve kalan süre için ayrıca ücret iadesi yapılmaz (3. maddedeki istisnalar hariç).
        </p>
      </>
    </LegalLayout>
  );
}
