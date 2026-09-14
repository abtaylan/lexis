import { Header } from '@/components/Header';
import { Hero } from '@/components/Hero';
import { Features } from '@/components/Features';
import { ExamPrep } from '@/components/ExamPrep';
import { MoreFeatures } from '@/components/MoreFeatures';
import { Showcase } from '@/components/Showcase';
import { HowItWorks } from '@/components/HowItWorks';
import { Faq } from '@/components/Faq';
import { Cta } from '@/components/Cta';
import { Footer } from '@/components/Footer';

export default function HomePage() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <Features />
        <ExamPrep />
        <MoreFeatures />
        <Showcase />
        <HowItWorks />
        <Faq />
        <Cta />
      </main>
      <Footer />
    </>
  );
}
