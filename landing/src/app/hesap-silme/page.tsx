import type { Metadata } from 'next';
import { LegalLayout } from '@/components/LegalLayout';
import { COMPANY_INFO, LOGIN_URL } from '@/lib/config';

export const metadata: Metadata = {
  title: 'Hesap Silme — Lexis',
  description: 'Lexis hesabınızı ve verilerinizi nasıl silebileceğinizi öğrenin.',
};

export default function DeleteAccountPage() {
  return (
    <LegalLayout title="Hesap Silme" updatedAt="31 Ağustos 2026">
      <>
        <p>
          Lexis hesabınızı ve hesabınızla ilişkili tüm verilerinizi istediğiniz zaman, kalıcı ve
          geri alınamaz şekilde silebilirsiniz. Bunu yapmanın iki yolu vardır.
        </p>

        <h2>1. Uygulama veya web sitesi üzerinden (önerilen)</h2>
        <ol>
          <li>Lexis mobil uygulamasında veya <a href={LOGIN_URL}>web sitesinde</a> hesabınıza giriş yapın.</li>
          <li><strong>Profil</strong> sekmesine / sayfasına gidin.</li>
          <li>En altta yer alan <strong>&quot;Tehlikeli Bölge&quot;</strong> bölümünden <strong>&quot;Hesabımı Sil&quot;</strong> butonuna dokunun.</li>
          <li>Karşınıza çıkan uyarıyı onaylayın. Hesabınız anında ve kalıcı olarak silinir.</li>
        </ol>

        <h2>2. E-posta ile talep</h2>
        <p>
          Uygulamaya erişiminiz yoksa, hesabınızla ilişkili e-posta adresinden{' '}
          <strong>{COMPANY_INFO.email}</strong> adresine &quot;Hesap Silme Talebi&quot; konu satırıyla bir
          e-posta gönderin. Kimliğinizi (hesap e-postanızı) doğruladıktan sonra hesabınız en geç{' '}
          <strong>30 gün</strong> içinde tarafımızca silinir.
        </p>

        <h2>3. Silinen veriler</h2>
        <p>Hesabınızı sildiğinizde aşağıdaki veriler kalıcı olarak silinir:</p>
        <ul>
          <li>Hesap bilgileri: e-posta, kullanıcı adı, görünen ad, şifre (Supabase Auth kaydı),</li>
          <li>Profil bilgileri: ana dil, öğrenilen diller, günlük hedef,</li>
          <li>Öğrenme verileri: kaydettiğiniz kelimeler, çalışma programı, oyun/quiz geçmişi, XP ve rozetler,</li>
          <li>Sosyal veriler: arkadaşlıklar, takip ilişkileri, engellenen kullanıcılar, mesajlar ve sohbetler,</li>
          <li>Bildirim tercihleri ve push bildirim jetonları.</li>
        </ul>

        <h2>4. Saklanabilecek veriler</h2>
        <p>
          Yürürlükteki mevzuat (ör. vergi/muhasebe mevzuatı) gereği saklanması zorunlu olan işlem
          kayıtları (örneğin geçmiş Premium abonelik faturaları), yalnızca yasal saklama süresi
          boyunca ve yalnızca bu amaçla saklanabilir; başka hiçbir amaçla kullanılmaz.
        </p>

        <p>
          Sorularınız için <strong>{COMPANY_INFO.email}</strong> adresinden bize ulaşabilirsiniz.
        </p>
      </>
    </LegalLayout>
  );
}
