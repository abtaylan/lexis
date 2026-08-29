import type { Metadata } from 'next';
import { LegalLayout } from '@/components/LegalLayout';
import { COMPANY_INFO } from '@/lib/config';

export const metadata: Metadata = {
  title: 'KVKK Aydınlatma Metni — Lexis',
  description: '6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında Lexis aydınlatma metni.',
};

export default function KvkkPage() {
  return (
    <LegalLayout title="KVKK Aydınlatma Metni" updatedAt="29 Ağustos 2026">
      <>
        <p>
          İşbu Aydınlatma Metni, 6698 sayılı Kişisel Verilerin Korunması Kanunu (&quot;KVKK&quot;) madde 10
          uyarınca, Lexis uygulamasını (&quot;Lexis&quot;) kullanan kullanıcıların kişisel verilerinin veri
          sorumlusu sıfatıyla <strong>{COMPANY_INFO.legalName}</strong> tarafından işlenmesine ilişkin
          olarak aydınlatılması amacıyla hazırlanmıştır. Kişisel verilerin işlenmesine ilişkin daha
          detaylı bilgi için{' '}
          <a href="/gizlilik-politikasi">Gizlilik Politikamızı</a> inceleyebilirsiniz.
        </p>

        <h2>1. Veri Sorumlusunun Kimliği</h2>
        <p>
          <strong>{COMPANY_INFO.legalName}</strong>
          <br />
          Vergi Dairesi: {COMPANY_INFO.taxOffice} · Vergi No: {COMPANY_INFO.taxNumber}
          <br />
          Adres: {COMPANY_INFO.address}
          <br />
          E-posta: {COMPANY_INFO.email} · Telefon: {COMPANY_INFO.phone}
        </p>

        <h2>2. Kişisel Verilerin Hangi Amaçla İşleneceği</h2>
        <p>Toplanan kişisel verileriniz;</p>
        <ul>
          <li>hesabınızın oluşturulması ve kimlik doğrulamasının (e-posta ile tek kullanımlık kod) sağlanması,</li>
          <li>kişiselleştirilmiş kelime öğrenme, çalışma programı ve oyunlaştırma (rozet, liderlik tablosu) hizmetlerinin sunulması,</li>
          <li>Premium abonelik süreçlerinin yürütülmesi ve faturalandırma,</li>
          <li>hizmet kalitesinin ölçülmesi, geliştirilmesi ve hataların giderilmesi,</li>
          <li>yasal yükümlülüklerin yerine getirilmesi,</li>
          <li>açık rızanız halinde reklam gösterimi,</li>
        </ul>
        <p>amaçlarıyla KVKK&apos;nın 5. ve 6. maddelerinde belirtilen kişisel veri işleme şartları dahilinde işlenmektedir.</p>

        <h2>3. İşlenen Kişisel Verilerin Kimlere ve Hangi Amaçla Aktarılabileceği</h2>
        <p>
          Kişisel verileriniz, yukarıda belirtilen amaçların yerine getirilmesi ile sınırlı olarak;
          barındırma ve altyapı sağlayıcılarımıza (Vercel, Railway, Supabase), ödeme kuruluşumuz
          iyzico&apos;ya (ve mobilde Apple App Store / Google Play uygulama içi satın alma altyapılarına),
          reklam ağlarına (Google AdSense/AdMob) ve yasal olarak yetkili kamu kurum ve kuruluşlarına,
          KVKK&apos;nın 8. ve 9. maddelerinde belirtilen kişisel veri işleme şartları çerçevesinde aktarılabilecektir.
        </p>

        <h2>4. Kişisel Veri Toplamanın Yöntemi ve Hukuki Sebebi</h2>
        <p>
          Kişisel verileriniz, Lexis web sitesi ve mobil uygulaması üzerinden elektronik ortamda
          doğrudan sizin tarafınızdan sağlanan bilgiler ile uygulama kullanımınız sırasında otomatik
          yollarla toplanır. Bu veriler; bir sözleşmenin kurulması veya ifasıyla doğrudan ilgili olması,
          hukuki yükümlülüğün yerine getirilmesi, veri sorumlusunun meşru menfaati ve açık rızanızın
          bulunduğu hallerde açık rıza hukuki sebeplerine dayanılarak toplanmaktadır.
        </p>

        <h2>5. KVKK Madde 11 Kapsamındaki Haklarınız</h2>
        <p>KVKK&apos;nın 11. maddesi uyarınca kişisel veri sahibi olarak aşağıdaki haklara sahipsiniz:</p>
        <ul>
          <li>Kişisel verinizin işlenip işlenmediğini öğrenme,</li>
          <li>İşlenmişse buna ilişkin bilgi talep etme,</li>
          <li>İşlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme,</li>
          <li>Yurt içinde/yurt dışında aktarıldığı üçüncü kişileri bilme,</li>
          <li>Eksik/yanlış işlenmişse düzeltilmesini isteme,</li>
          <li>KVKK md. 7&apos;deki şartlar çerçevesinde silinmesini/yok edilmesini isteme,</li>
          <li>Düzeltme/silme işlemlerinin aktarıldığı üçüncü kişilere bildirilmesini isteme,</li>
          <li>Otomatik sistemlerle analiz edilmesi suretiyle aleyhinize bir sonucun ortaya çıkmasına itiraz etme,</li>
          <li>Kanuna aykırı işleme nedeniyle zarara uğramanız halinde zararın giderilmesini talep etme.</li>
        </ul>
        <p>
          Yukarıda sıralanan haklarınıza yönelik başvurularınızı, kimliğinizi tevsik edici belgelerle
          birlikte {COMPANY_INFO.email} adresine yazılı olarak iletebilirsiniz. Talebiniz, niteliğine göre
          en geç otuz gün içinde ücretsiz olarak sonuçlandırılacaktır.
        </p>
      </>
    </LegalLayout>
  );
}
