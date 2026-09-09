'use client';

// app/auth/apple/callback/page.tsx — Apple "Sign in with Apple" popup
// akışının (usePopup:true) kısa süreliğine yönlendirildiği dönüş sayfası.
// Bu URL Apple Developer Console'da Return URL olarak kayıtlı (bkz.
// AppleSignInButton.tsx redirectURI). Apple JS SDK bu sayfada da yüklenmeli:
// SDK, kendisinin bir popup içinde çalıştığını tespit edip sonucu otomatik
// olarak açan pencereye (opener) postMessage ile iletir ve popup'ı kapatır —
// bu sayfada başka hiçbir işlem yapmaya gerek yok, gösterilecek bir arayüz de
// yok (kullanıcı bu sayfayı görsel olarak fark etmeden geçer).
import Script from 'next/script';

export default function AppleCallbackPage() {
  return (
    <>
      <Script
        src="https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js"
        strategy="afterInteractive"
      />
      <div style={{ minHeight: '100vh' }} />
    </>
  );
}
