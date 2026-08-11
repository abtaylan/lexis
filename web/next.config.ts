import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Turbopack, en yakın lockfile'ı bularak proje kökünü tahmin etmeye çalışır.
  // Bu makinede proje klasörünün üstünde (OneDrive/Masaüstü vb.) başka bir
  // lockfile bulunması "multiple lockfiles" uyarısına yol açıyordu.
  // Kökü açıkça bu klasöre sabitleyerek uyarıyı ve olası yanlış-kök
  // davranışını ortadan kaldırıyoruz.
  turbopack: {
    root: path.join(__dirname),
  },
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
