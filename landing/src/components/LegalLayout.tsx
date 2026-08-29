import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

export function LegalLayout({
  title,
  updatedAt,
  children,
}: {
  title: string;
  updatedAt: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl px-5 py-14">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{title}</h1>
        <p className="text-sm text-gray-400 mb-10">Son güncelleme: {updatedAt}</p>
        <div className="legal-prose">{children}</div>
      </main>
      <Footer />
    </>
  );
}
