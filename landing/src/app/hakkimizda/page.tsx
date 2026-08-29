import type { Metadata } from 'next';
import { LegalLayout } from '@/components/LegalLayout';
import { COMPANY_INFO } from '@/lib/config';

export const metadata: Metadata = {
  title: 'Hakkımızda — Lexis',
  description: 'Lexis kelime öğrenme uygulaması hakkında.',
};

export default function AboutPage() {
  return (
    <LegalLayout title="Hakkımızda" updatedAt="29 Ağustos 2026">
      <>
        <h2>Lexis Nedir?</h2>
        <p>
          Lexis; kişisel kelime listeni, günlük çalışma programını ve arkadaşlarınla yarışabildiğin
          oyunları tek bir yerde birleştiren, 9 dilde arayüz sunan bir dil öğrenme uygulamasıdır.
          Kelime kartları, tekrar programı, quiz ve mini oyun modları (typing, matching, listening,
          sprint) ile öğrenmeyi alışkanlığa dönüştürmeyi hedefler; rozet, seviye (XP) ve liderlik
          tablosu gibi oyunlaştırma öğeleriyle motivasyonu yüksek tutar.
        </p>

        <h2>Kim İşletiyor?</h2>
        <p>
          Lexis&apos;in ticari/yasal işletmecisi (vergi mükellefi) {COMPANY_INFO.legalName}&apos;dır.
          Uygulamanın geliştirilmesi ve ürün yönetimi Ahmet Behçet Taylan tarafından
          yürütülmektedir.
        </p>

        <h2>İletişim</h2>
        <p>
          E-posta: {COMPANY_INFO.email}
          <br />
          Telefon: {COMPANY_INFO.phone}
          <br />
          Adres: {COMPANY_INFO.address}
        </p>
      </>
    </LegalLayout>
  );
}
