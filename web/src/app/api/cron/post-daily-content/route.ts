// web/src/app/api/cron/post-daily-content/route.ts
//
// Vercel Cron (bkz. web/vercel.json — "0 6 * * *" = her gün 06:00 UTC =
// 09:00 Türkiye saati) bu route'u günde bir kez GET ile tetikler. Vercel
// projesine CRON_SECRET ortam değişkeni eklendiyse Vercel bu isteğe
// otomatik olarak `Authorization: Bearer <CRON_SECRET>` header'ı ekliyor
// (Vercel'in kendi resmi güvenlik deseni — bkz. Vercel Cron Jobs dokümanı).
// Biz burada onu doğruluyoruz; geçerse gerçek işi yapan Railway backend'deki
// secret-korumalı /internal/cron/post-daily-content endpoint'ine server-side
// fetch ile haber veriyoruz.
//
// NEDEN Vercel doğrudan backend'i tetiklemiyor da bu ara route var: Vercel
// Cron sadece KENDİ projenin bir path'ini GET ile çağırabiliyor, dışarıdaki
// bir URL'i doğrudan tetikleyemiyor — o yüzden bu route bir "proxy" görevi
// görüyor.
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Prod'da Vercel dashboard'unda zaten NEXT_PUBLIC_API_URL Railway backend
  // URL'ine ayarlı (frontend zaten bu URL'i kullanıyor) — ayrıca
  // BACKEND_INTERNAL_URL tanımlanırsa o öncelikli olur.
  const backendUrl = process.env.BACKEND_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL;
  if (!backendUrl) {
    return Response.json(
      { error: 'BACKEND_INTERNAL_URL veya NEXT_PUBLIC_API_URL tanımlı değil (Vercel env vars)' },
      { status: 500 },
    );
  }

  try {
    const res = await fetch(`${backendUrl}/internal/cron/post-daily-content`, {
      method: 'POST',
      headers: { 'X-Cron-Secret': cronSecret },
      cache: 'no-store',
    });
    const body = await res.json().catch(() => ({}));
    return Response.json({ forwarded_status: res.status, body }, { status: res.ok ? 200 : 502 });
  } catch (err) {
    return Response.json({ error: "Backend'e ulaşılamadı", detail: String(err) }, { status: 502 });
  }
}
