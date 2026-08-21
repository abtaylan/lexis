"""
backend/setup_iyzico_plans.py

Döviz bazlı Premium (TRY/USD/EUR) için iyzico tarafında tek bir "product"
(ürün) ve onun altında 6 fiyatlandırma planı (her para birimi için
aylık + yıllık) oluşturur, dönen referans kodlarını `backend/.env`'e
yazar. Referans: https://docs.iyzico.com/en/products/subscription

UYARI — CANLI ORTAM: `backend/.env`'deki IYZICO_BASE_URL şu an
https://api.iyzipay.com (sandbox DEĞİL, GERÇEK/production). Bu script
çalıştırılınca gerçek bir ürün ve gerçek fiyatlandırma planları
oluşturulur — iyzico merchant panelinizde görünür ve bu planlara
abone olan kullanıcılardan gerçek para tahsil edilir. Sandbox'ta
denemek isterseniz .env'de geçici olarak IYZICO_BASE_URL'i
https://sandbox-api.iyzipay.com yapıp sandbox API anahtarlarıyla
çalıştırın.

Yinelenen ürün/plan oluşturmayı önlemek için: script, .env'deki 6 ref
koduna bakar; herhangi biri zaten dolu ve placeholder değilse (yani
"<...>" ile başlamıyorsa) çalışmayı reddeder. Yeniden oluşturmak
isterseniz ilgili satırları .env'de boşaltıp tekrar çalıştırın.

Kullanım:
    cd backend
    venv\\Scripts\\activate      # Windows
    python setup_iyzico_plans.py

Script, fiyatları .env'deki PREMIUM_MONTHLY_PRICE / PREMIUM_YEARLY_PRICE
/ _USD / _EUR alanlarından okur — kendisi bir fiyat DEĞİŞTİRMEZ, sadece
kullanır. Çalıştırmadan önce bu değerlerin doğru olduğunu kontrol edin.
"""

import asyncio
import re
import sys
from pathlib import Path

from app.core.config import settings
from app.services.iyzico_client import iyzico_client

ENV_PATH = Path(__file__).parent / ".env"

PRODUCT_NAME = "Lexis Premium"

# (env_key, plan_name, price, currency, interval)
PLANS = [
    ("IYZICO_MONTHLY_PLAN_REF", "Lexis Premium - Aylık (TRY)", settings.PREMIUM_MONTHLY_PRICE, "TRY", "MONTHLY"),
    ("IYZICO_YEARLY_PLAN_REF", "Lexis Premium - Yıllık (TRY)", settings.PREMIUM_YEARLY_PRICE, "TRY", "YEARLY"),
    ("IYZICO_MONTHLY_PLAN_REF_USD", "Lexis Premium - Monthly (USD)", settings.PREMIUM_MONTHLY_PRICE_USD, "USD", "MONTHLY"),
    ("IYZICO_YEARLY_PLAN_REF_USD", "Lexis Premium - Yearly (USD)", settings.PREMIUM_YEARLY_PRICE_USD, "USD", "YEARLY"),
    ("IYZICO_MONTHLY_PLAN_REF_EUR", "Lexis Premium - Monatlich (EUR)", settings.PREMIUM_MONTHLY_PRICE_EUR, "EUR", "MONTHLY"),
    ("IYZICO_YEARLY_PLAN_REF_EUR", "Lexis Premium - Jährlich (EUR)", settings.PREMIUM_YEARLY_PRICE_EUR, "EUR", "YEARLY"),
]


def _is_placeholder(value: str) -> bool:
    return not value or value.strip().startswith("<")


def _read_env_value(key: str) -> str:
    text = ENV_PATH.read_text(encoding="utf-8")
    m = re.search(rf"^{re.escape(key)}=(.*)$", text, re.MULTILINE)
    return m.group(1).strip() if m else ""


def _write_env_value(key: str, value: str) -> None:
    text = ENV_PATH.read_text(encoding="utf-8")
    pattern = rf"^{re.escape(key)}=.*$"
    if re.search(pattern, text, re.MULTILINE):
        text = re.sub(pattern, f"{key}={value}", text, count=1, flags=re.MULTILINE)
    else:
        text = text.rstrip("\n") + f"\n{key}={value}\n"
    ENV_PATH.write_text(text, encoding="utf-8")


async def main() -> None:
    print(f"iyzico base URL: {settings.IYZICO_BASE_URL}")
    if "sandbox" not in settings.IYZICO_BASE_URL:
        print(
            "\n*** UYARI: IYZICO_BASE_URL 'sandbox' içermiyor — bu CANLI/production "
            "ortama karşı çalışacak. Oluşturulacak ürün ve fiyatlandırma planları "
            "gerçek iyzico hesabınızda görünecek. ***\n"
        )

    already_set = [k for (k, *_rest) in PLANS if not _is_placeholder(_read_env_value(k))]
    if already_set:
        print("Şu ref kodları zaten dolu (placeholder değil), güvenlik için durduruluyor:")
        for k in already_set:
            print(f"  {k}={_read_env_value(k)}")
        print("\nYeniden oluşturmak isterseniz .env'de ilgili satırı manuel boşaltın ve tekrar çalıştırın.")
        sys.exit(1)

    for _k, _n, price, currency, _i in PLANS:
        if not price or price <= 0:
            print(f"UYARI: {currency} fiyatı .env'de 0/boş — yine de plan oluşturulmaya çalışılacak, iyzico reddedebilir.")

    answer = input(
        f"'{PRODUCT_NAME}' ürünü ve 6 fiyatlandırma planı oluşturulacak. Devam edilsin mi? (evet/hayır): "
    ).strip().lower()
    if answer not in ("evet", "e", "yes", "y"):
        print("İptal edildi.")
        return

    print(f"\nÜrün oluşturuluyor: {PRODUCT_NAME}")
    try:
        product_res = await iyzico_client.create_product(
            name=PRODUCT_NAME,
            description="Lexis kelime ogrenme uygulamasi - Premium abonelik",
            conversation_id="lexis-premium-product-setup",
        )
    except Exception as e:
        print(f"\nHATA: Ürün oluşturulamadı: {e}")
        print(
            "\nBu genelde şunlardan biridir: (1) .env'deki IYZICO_API_KEY / "
            "IYZICO_SECRET_KEY yanlış ya da bu ortam (production/sandbox) için "
            "geçerli değil, (2) iyzico merchant hesabınızda 'Abonelik' "
            "(Subscription) modülü henüz aktif değil — bunu iyzico canlı destek "
            "hattından etkinleştirmeniz gerekebilir, (3) saat senkronizasyon "
            "sorunu. Yukarıdaki 'Yanıt gövdesi' satırı iyzico'nun asıl hata "
            "mesajını içeriyorsa en net ipucu odur."
        )
        sys.exit(1)
    if product_res.get("status") != "success":
        print("HATA: Ürün oluşturulamadı:", product_res)
        sys.exit(1)
    product_ref = product_res["data"]["referenceCode"]
    print(f"Ürün oluşturuldu: {product_ref}")

    results: dict[str, str] = {}
    for env_key, plan_name, price, currency, interval in PLANS:
        print(f"\nPlan oluşturuluyor: {plan_name} ({currency} {price} / {interval})")
        try:
            res = await iyzico_client.create_pricing_plan(
                product_reference_code=product_ref,
                name=plan_name,
                price=float(price),
                currency_code=currency,
                payment_interval=interval,
                conversation_id=f"lexis-{env_key.lower()}",
            )
        except Exception as e:
            print(f"HATA: {plan_name} oluşturulamadı: {e}")
            continue
        if res.get("status") != "success":
            print(f"HATA: {plan_name} oluşturulamadı: {res}")
            continue
        ref = res["data"]["referenceCode"]
        print(f"  -> {ref}")
        results[env_key] = ref

    if not results:
        print("\nHiçbir plan oluşturulamadı, .env değiştirilmedi.")
        sys.exit(1)

    print("\nbackend/.env güncelleniyor...")
    for env_key, ref in results.items():
        _write_env_value(env_key, ref)
        print(f"  {env_key}={ref}")

    missing = [k for k, *_r in PLANS if k not in results]
    if missing:
        print("\nUYARI: Şu planlar oluşturulamadı, .env'de eski (boş/placeholder) haliyle kaldı:")
        for k in missing:
            print(f"  {k}")

    print(f"\nTamam. {len(results)}/6 plan oluşturuldu ve backend/.env'e yazıldı.")
    print("Backend'i (uvicorn) yeniden başlatmayı unutmayın — Settings sadece process başlarken .env'i okur.")


if __name__ == "__main__":
    asyncio.run(main())
