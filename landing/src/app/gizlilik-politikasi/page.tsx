import type { Metadata } from 'next';
import { LegalLayout } from '@/components/LegalLayout';
import { COMPANY_INFO } from '@/lib/config';

export const metadata: Metadata = {
  title: 'Gizlilik Politikası — Lexis',
  description: 'Lexis gizlilik politikası ve KVKK aydınlatma metni.',
};

export default function PrivacyPolicyPage() {
  return (
    <LegalLayout title="Gizlilik Politikası" updatedAt="29 Ağustos 2026">
      <>
        <h2>1. Veri Sorumlusu</h2>
        <p>
          6698 sayılı Kişisel Verilerin Korunması Kanunu (&quot;KVKK&quot;) uyarınca, Lexis uygulaması
          (&quot;Lexis&quot;, &quot;biz&quot;) kapsamında işlenen kişisel verileriniz bakımından veri sorumlusu{' '}
          <strong>{COMPANY_INFO.legalName}</strong>&apos;dır (&quot;İşletme&quot;).
        </p>
        <p>
          Adres: {COMPANY_INFO.address}
          <br />
          E-posta: {COMPANY_INFO.email}
          <br />
          Telefon: {COMPANY_INFO.phone}
        </p>

        <h2>2. Toplanan Kişisel Veriler</h2>
        <p>Lexis&apos;i kullanırken aşağıdaki kategorilerde kişisel veriler işlenebilir:</p>
        <ul>
          <li><strong>Kimlik ve iletişim verileri:</strong> ad-soyad, kullanıcı adı, e-posta adresi.</li>
          <li><strong>Hesap ve kullanım verileri:</strong> öğrenilen kelimeler, çalışma programı, oyun/quiz sonuçları, rozet ve seviye (XP) bilgileri, uygulama içi etkinlik günlükleri.</li>
          <li><strong>Ödeme verileri:</strong> Premium abonelik satın alımlarında kart bilgileriniz tarafımızca değil, doğrudan ödeme kuruluşu iyzico (ve mobilde Apple/Google uygulama içi satın alma altyapıları) tarafından işlenir; bize yalnızca işlem sonucu ve abonelik durumu iletilir.</li>
          <li><strong>Teknik veriler:</strong> IP adresi, cihaz/tarayıcı bilgisi, çerezler ve benzeri teknolojiler aracılığıyla toplanan kullanım istatistikleri (Vercel Web Analytics).</li>
          <li><strong>Pazarlama/reklam verileri:</strong> Google AdSense (web) ve Google AdMob (mobil) aracılığıyla gösterilen reklamlara ilişkin veriler; bu veriler yalnızca açık rızanız/onay bannerındaki tercihiniz doğrultusunda işlenir.</li>
        </ul>

        <h2>3. İşleme Amaçları</h2>
        <ul>
          <li>Hesabınızın oluşturulması, kimlik doğrulaması (e-posta ile tek kullanımlık kod/OTP) ve güvenliğinin sağlanması,</li>
          <li>Kişiselleştirilmiş kelime öğrenme deneyimi, çalışma programı ve oyunlaştırma (rozet, liderlik tablosu) hizmetlerinin sunulması,</li>
          <li>Premium abonelik süreçlerinin yürütülmesi ve faturalandırma,</li>
          <li>Ürün geliştirme, hata giderme ve kullanım analizleri,</li>
          <li>Yasal yükümlülüklerin yerine getirilmesi ve olası uyuşmazlıkların çözümü,</li>
          <li>Açık rızanız halinde reklam gösterimi ve pazarlama iletişimi.</li>
        </ul>

        <h2>4. Hukuki Sebep</h2>
        <p>
          Kişisel verileriniz; bir sözleşmenin kurulması veya ifasıyla doğrudan ilgili olması, hukuki
          yükümlülüğün yerine getirilmesi, ilgili kişinin temel hak ve özgürlüklerine zarar vermemek
          kaydıyla veri sorumlusunun meşru menfaati ve açık rızanızın bulunduğu hallerde açık rıza
          hukuki sebeplerine dayanılarak, KVKK md. 5 ve 6 kapsamında işlenmektedir.
        </p>

        <h2>5. Kişisel Verilerin Aktarılması</h2>
        <p>
          Verileriniz, hizmetin sunulabilmesi için gerekli ölçüde aşağıdaki taraflarla paylaşılabilir:
        </p>
        <ul>
          <li>Barındırma ve altyapı sağlayıcıları: Vercel, Railway, Supabase,</li>
          <li>Ödeme kuruluşu: iyzico; mobilde Apple App Store / Google Play uygulama içi satın alma altyapıları,</li>
          <li>Reklam ağları: Google AdSense / Google AdMob,</li>
          <li>Yasal olarak yetkili kamu kurum ve kuruluşları (talep halinde).</li>
        </ul>
        <p>
          Bu hizmet sağlayıcılardan bir kısmının sunucuları yurt dışında bulunabilir; bu durumda
          aktarım, KVKK&apos;nın yurt dışına veri aktarımına ilişkin hükümlerine (md. 9) uygun şekilde
          gerçekleştirilir.
        </p>

        <h2>6. Saklama Süresi</h2>
        <p>
          Kişisel verileriniz, işleme amacının gerektirdiği süre boyunca ve ilgili mevzuatta öngörülen
          zamanaşımı süreleri saklı kalmak kaydıyla saklanır. Hesabınızı sildiğinizde, yasal saklama
          yükümlülüğü bulunanlar hariç, kişisel verileriniz makul bir süre içinde silinir veya anonim
          hale getirilir.
        </p>

        <h2>7. Çerezler (Cookies)</h2>
        <p>
          Web sitemizde ve uygulamamızda, oturum yönetimi için zorunlu çerezlerin yanı sıra, açık
          rızanız halinde reklam ve analiz amaçlı çerezler kullanılmaktadır. Çerez tercihlerinizi web
          sitemizde karşınıza çıkan onay bannerı üzerinden yönetebilirsiniz.
        </p>

        <h2>8. KVKK Kapsamındaki Haklarınız</h2>
        <p>KVKK&apos;nın 11. maddesi uyarınca aşağıdaki haklara sahipsiniz:</p>
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
          Bu haklarınızı kullanmak için {COMPANY_INFO.email} adresine yazılı olarak başvurabilirsiniz.
        </p>

        <h2>9. Değişiklikler</h2>
        <p>
          Bu Gizlilik Politikası, yasal düzenlemeler veya hizmetlerimizdeki değişiklikler doğrultusunda
          güncellenebilir. Güncel sürüm her zaman bu sayfada yayımlanır.
        </p>
      </>
    </LegalLayout>
  );
}
