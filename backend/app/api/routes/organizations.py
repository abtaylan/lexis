"""
backend/app/api/routes/organizations.py

V2 Yol Haritası §6.3 (Faz 3d) — B2B / kurumsal ligler, EN SON öncelik
(bkz. plan'ın kendi sıralaması: "3d, en son").

NOT (plan'ın kendi uyarısı): Bu, düello ÖZELLİĞİNİN B2B versiyonu —
§1.5'teki "Kurumsal/Dershane B2B Paketi" (toplu lisans SATIŞI) ile
KARIŞTIRILMAMALI, ayrı bir özellik.

KAPSAM (bilinçli sınır): kurum oluştur/üye davet-yönet/kurum-içi
liderlik tablosu burada VAR. Kurum-scope'lu LİG oluşturma (leagues.
organization_id'yi kullanan bir uç — "bu kurumun kendi düello ligi")
BİLİNÇLİ OLARAK YOK; migration 041/043 kolonu hazırladı ama routes/
leagues.py hiçbir yerde organization_id'yi okumuyor/yazmıyor — ayrı bir
alt-adım (kurum liglerinin genel liglerle nasıl bir arada matchmaking
yapacağı netleşmeden eklenmedi).

Kullanıcı davet etme, e-postayla arama gerektiriyor ama profiles.email
YOK (e-posta sadece Supabase auth.users'ta) — app.services.auth_users.
list_all_auth_users() ortak yardımcısı kullanılıyor (10 Eylül 2026'da
admin.py'de bulunan sayfalama bug'ı — tek sayfa/50 kullanıcı sınırı —
yüzünden tüm çağrı yerleri buraya taşındı). NOT: bu yine de O(kullanıcı
sayısı) bir tarama — şu anki (küçük) kullanıcı tabanında sorun değil,
kullanıcı sayısı büyürse gerçek bir "e-postaya göre tek kullanıcı getir"
admin API çağrısına geçilmeli (bkz. Supabase GoTrue admin API'sinin daha
yeni sürümlerinde email filtresi olabilir, kontrol edilmedi).
"""

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response

from app.core.auth import get_current_admin, get_current_admin_full, get_current_user
from app.core.database import supabase_admin
from app.schemas.organizations import (
    AdminOrganizationItem,
    AdminOrganizationListResponse,
    OrganizationAdminUpdate,
    OrganizationConsentRequest,
    OrganizationConsentResponse,
    OrganizationCreate,
    OrganizationInviteRequest,
    OrganizationItem,
    OrganizationListResponse,
    OrganizationMemberItem,
    OrganizationMembersResponse,
)
from app.services.auth_users import list_all_auth_users
from app.services.organization_report_service import get_organization_report
from app.services.report_export_service import build_org_report_document, render, SUPPORTED_FORMATS
from app.services.email_service import send_report_export_email

router = APIRouter()

MANAGE_ROLES = {"owner", "admin"}


def _get_membership_or_403(org_id: str, user_id: str) -> dict:
    row = (
        supabase_admin.table("organization_members")
        .select("*")
        .eq("org_id", org_id)
        .eq("user_id", user_id)
        .execute()
        .data
    )
    if not row:
        raise HTTPException(status_code=403, detail="Bu kurumun üyesi değilsiniz.")
    return row[0]


def _require_manage_role(org_id: str, user_id: str) -> None:
    membership = _get_membership_or_403(org_id, user_id)
    if membership["role"] not in MANAGE_ROLES:
        raise HTTPException(status_code=403, detail="Bu işlem için yönetici yetkisi gerekiyor.")


def _find_user_id_by_email(email: str) -> str | None:
    try:
        users = list_all_auth_users()
        for u in users:
            if (u.email or "").lower() == email.lower():
                return u.id
    except Exception as e:
        print(f"ORGANIZATIONS email lookup warning: {e}")
    return None


def _is_expired(expires_at_raw: str | None) -> bool:
    """Öncelik #9 (B2B Satış Paketi) — tek bir yerden hesaplanıyor, hem
    admin hem üye uçları (OrganizationItem/AdminOrganizationItem) aynı
    mantığı kullansın diye. Frontend'de KASITLI OLARAK Date.now() ile
    tekrar hesaplanmıyor (React purity kuralı, bkz. [orgId]/page.tsx)."""
    if not expires_at_raw:
        return False
    expires_at = datetime.fromisoformat(str(expires_at_raw).replace("Z", "+00:00"))
    return expires_at < datetime.now(timezone.utc)


@router.post("", response_model=OrganizationItem, status_code=201)
async def create_organization(
    org_in: OrganizationCreate,
    current_user=Depends(get_current_admin_full),
):
    """
    Yeni kurum aç — SADECE ADMİN (13 Eylül 2026, madde 9 B2B satış paketi
    kapsamı netleşirken kapatıldı: self-serve oluşturma her tüketici
    kullanıcıya açık kalmıştı, bkz. modül docstring'i). Kurumu, B2B
    paketini satın alan müşterinin kendi Lexis hesabı (owner_email)
    'owner' yapılarak admin açar — admin kendisi kurumun üyesi OLMAZ,
    sadece created_by ile denetim izinde kalır.
    """
    owner_user_id = _find_user_id_by_email(org_in.owner_email)
    if not owner_user_id:
        raise HTTPException(
            status_code=404,
            detail="Bu e-posta ile kayıtlı bir Lexis kullanıcısı bulunamadı.",
        )

    result = (
        supabase_admin.table("organizations")
        .insert({
            "name": org_in.name,
            "created_by": current_user.id,
            "plan": org_in.plan,
            "member_limit": org_in.member_limit,
            "expires_at": org_in.expires_at.isoformat() if org_in.expires_at else None,
            "notes": org_in.notes,
        })
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=500, detail="Kurum oluşturulamadı.")
    org = result.data[0]

    supabase_admin.table("organization_members").insert(
        {"org_id": org["id"], "user_id": owner_user_id, "role": "owner"}
    ).execute()

    return OrganizationItem(
        id=org["id"],
        name=org["name"],
        plan=org["plan"],
        created_at=org["created_at"],
        my_role="owner",
        member_limit=org.get("member_limit"),
        expires_at=org.get("expires_at"),
        is_expired=_is_expired(org.get("expires_at")),
    )


# ── Admin paneli — TÜM kurumların listesi (13 Eylül 2026) ──────────────
# list_my_organizations (aşağısı) sadece isteği yapanın ÜYE olduğu
# kurumları döner — admin artık oluşturduğu kurumların üyesi olmadığı
# için (yukarısına bkz.) admin panelin göreceği ayrı bir uç gerekiyor.
# Salt-okunur admin de görebilir (mutasyon değil, get_current_admin).
@router.get("/admin", response_model=AdminOrganizationListResponse)
async def list_all_organizations_admin(current_user=Depends(get_current_admin)):
    org_rows = (
        supabase_admin.table("organizations")
        .select("*")
        .order("created_at", desc=True)
        .execute()
        .data
    ) or []
    if not org_rows:
        return AdminOrganizationListResponse(items=[])

    org_ids = [o["id"] for o in org_rows]
    member_rows = (
        supabase_admin.table("organization_members")
        .select("org_id, user_id, role")
        .in_("org_id", org_ids)
        .execute()
        .data
    ) or []

    member_count_by_org: dict[str, int] = {}
    owner_user_id_by_org: dict[str, str] = {}
    for m in member_rows:
        member_count_by_org[m["org_id"]] = member_count_by_org.get(m["org_id"], 0) + 1
        if m["role"] == "owner":
            owner_user_id_by_org[m["org_id"]] = m["user_id"]

    owner_ids = list(set(owner_user_id_by_org.values()))
    username_by_user_id: dict[str, str] = {}
    if owner_ids:
        profile_rows = (
            supabase_admin.table("profiles")
            .select("id, username")
            .in_("id", owner_ids)
            .execute()
            .data
        ) or []
        username_by_user_id = {p["id"]: p["username"] for p in profile_rows}

    email_by_user_id: dict[str, str] = {}
    if owner_ids:
        try:
            users = list_all_auth_users()
            for u in users:
                if u.id in owner_ids:
                    email_by_user_id[u.id] = u.email
        except Exception as e:
            print(f"ORGANIZATIONS admin list email warning: {e}")

    items = [
        AdminOrganizationItem(
            id=o["id"],
            name=o["name"],
            plan=o["plan"],
            created_at=o["created_at"],
            member_count=member_count_by_org.get(o["id"], 0),
            owner_email=email_by_user_id.get(owner_user_id_by_org.get(o["id"], "")),
            owner_username=username_by_user_id.get(owner_user_id_by_org.get(o["id"], "")),
            member_limit=o.get("member_limit"),
            expires_at=o.get("expires_at"),
            is_expired=_is_expired(o.get("expires_at")),
            notes=o.get("notes"),
        )
        for o in org_rows
    ]
    return AdminOrganizationListResponse(items=items)


# ── Admin paneli — kurumun paket bilgilerini güncelle (13 Eylül 2026) ──
# Öncelik #9 (B2B Satış Paketi): plan adı/üye limiti/bitiş tarihi/not
# güncelleme. Sadece gönderilen alanlar değişir (exclude_unset) — admin
# tek bir alanı (ör. sadece expires_at'i uzatmak) değiştirebilsin diye.
@router.patch("/{org_id}/admin", response_model=AdminOrganizationItem)
async def update_organization_admin(
    org_id: str,
    body: OrganizationAdminUpdate,
    current_user=Depends(get_current_admin_full),
):
    updates = body.model_dump(exclude_unset=True)
    if "expires_at" in updates and updates["expires_at"] is not None:
        updates["expires_at"] = updates["expires_at"].isoformat()
    if updates:
        result = (
            supabase_admin.table("organizations")
            .update(updates)
            .eq("id", org_id)
            .execute()
        )
        if not result.data:
            raise HTTPException(status_code=404, detail="Kurum bulunamadı.")
        org = result.data[0]
    else:
        org_rows = supabase_admin.table("organizations").select("*").eq("id", org_id).execute().data
        if not org_rows:
            raise HTTPException(status_code=404, detail="Kurum bulunamadı.")
        org = org_rows[0]

    member_count = (
        supabase_admin.table("organization_members")
        .select("user_id", count="exact")
        .eq("org_id", org_id)
        .execute()
        .count
        or 0
    )
    owner_row = (
        supabase_admin.table("organization_members")
        .select("user_id")
        .eq("org_id", org_id)
        .eq("role", "owner")
        .execute()
        .data
    ) or []
    owner_email = owner_username = None
    if owner_row:
        owner_user_id = owner_row[0]["user_id"]
        profile = (
            supabase_admin.table("profiles").select("username").eq("id", owner_user_id).execute().data
        ) or []
        owner_username = profile[0]["username"] if profile else None
        try:
            users = list_all_auth_users()
            owner_email = next((u.email for u in users if u.id == owner_user_id), None)
        except Exception as e:
            print(f"ORGANIZATIONS admin update email warning: {e}")

    return AdminOrganizationItem(
        id=org["id"],
        name=org["name"],
        plan=org["plan"],
        created_at=org["created_at"],
        member_count=member_count,
        owner_email=owner_email,
        owner_username=owner_username,
        member_limit=org.get("member_limit"),
        expires_at=org.get("expires_at"),
        is_expired=_is_expired(org.get("expires_at")),
        notes=org.get("notes"),
    )


@router.get("", response_model=OrganizationListResponse)
async def list_my_organizations(current_user=Depends(get_current_user)):
    membership_rows = (
        supabase_admin.table("organization_members")
        .select("org_id, role")
        .eq("user_id", current_user.id)
        .execute()
        .data
    ) or []
    if not membership_rows:
        return OrganizationListResponse(items=[])

    role_by_org = {m["org_id"]: m["role"] for m in membership_rows}
    org_rows = (
        supabase_admin.table("organizations")
        .select("*")
        .in_("id", list(role_by_org.keys()))
        .execute()
        .data
    ) or []

    items = [
        OrganizationItem(
            id=o["id"],
            name=o["name"],
            plan=o["plan"],
            created_at=o["created_at"],
            my_role=role_by_org.get(o["id"], "member"),
            member_limit=o.get("member_limit"),
            expires_at=o.get("expires_at"),
            is_expired=_is_expired(o.get("expires_at")),
        )
        for o in org_rows
    ]
    return OrganizationListResponse(items=items)


@router.get("/{org_id}/members", response_model=OrganizationMembersResponse)
async def list_organization_members(org_id: str, current_user=Depends(get_current_user)):
    """Kurum-içi liderlik tablosu da bu uçtan türetilir — üyeler
    total_xp'ye göre azalan sıralı döner (frontend istersen sıralamayı
    değiştirebilir, ham veri her hâlükârda geliyor)."""
    _get_membership_or_403(org_id, current_user.id)

    member_rows = (
        supabase_admin.table("organization_members")
        .select("user_id, role, joined_at, report_consent_at")
        .eq("org_id", org_id)
        .execute()
        .data
    ) or []
    user_ids = [m["user_id"] for m in member_rows]

    profiles_by_id: dict[str, dict] = {}
    if user_ids:
        profile_rows = (
            supabase_admin.table("profiles")
            .select("id, username, total_xp")
            .in_("id", user_ids)
            .execute()
            .data
        ) or []
        profiles_by_id = {p["id"]: p for p in profile_rows}

    email_by_id: dict[str, str] = {}
    try:
        users = list_all_auth_users()
        for u in users:
            if u.id in profiles_by_id:
                email_by_id[u.id] = u.email
    except Exception as e:
        print(f"ORGANIZATIONS member email warning: {e}")

    items = sorted(
        (
            OrganizationMemberItem(
                user_id=m["user_id"],
                username=profiles_by_id.get(m["user_id"], {}).get("username"),
                email=email_by_id.get(m["user_id"]),
                role=m["role"],
                joined_at=m["joined_at"],
                total_xp=profiles_by_id.get(m["user_id"], {}).get("total_xp", 0),
                consent_given=bool(m.get("report_consent_at")),
            )
            for m in member_rows
        ),
        key=lambda m: m.total_xp,
        reverse=True,
    )
    return OrganizationMembersResponse(items=items)


@router.post("/{org_id}/members", response_model=OrganizationMemberItem, status_code=201)
async def invite_member(
    org_id: str,
    invite_in: OrganizationInviteRequest,
    current_user=Depends(get_current_user),
):
    _require_manage_role(org_id, current_user.id)
    if invite_in.role not in ("admin", "member"):
        raise HTTPException(status_code=400, detail="Geçersiz rol (admin veya member olmalı).")

    # Öncelik #9 (B2B Satış Paketi) — süresi dolmuş ya da üye limiti
    # dolu bir kuruma yeni üye eklenemez. Mevcut üyelerin erişimi
    # BİLİNÇLİ OLARAK kesilmiyor, sadece büyüme durduruluyor.
    org_row = (
        supabase_admin.table("organizations")
        .select("member_limit, expires_at")
        .eq("id", org_id)
        .single()
        .execute()
        .data
    ) or {}
    if _is_expired(org_row.get("expires_at")):
        raise HTTPException(
            status_code=403,
            detail="Bu kurumun aboneliği sona erdi, yeni üye eklenemez. Yenilemek için Lexis ekibiyle iletişime geçin.",
        )
    member_limit = org_row.get("member_limit")
    if member_limit is not None:
        current_count = (
            supabase_admin.table("organization_members")
            .select("user_id", count="exact")
            .eq("org_id", org_id)
            .execute()
            .count
            or 0
        )
        if current_count >= member_limit:
            raise HTTPException(
                status_code=400,
                detail=f"Kurumun üye limitine ({member_limit}) ulaşıldı. Yükseltmek için Lexis ekibiyle iletişime geçin.",
            )

    target_user_id = _find_user_id_by_email(invite_in.email)
    if not target_user_id:
        raise HTTPException(
            status_code=404,
            detail="Bu e-posta ile kayıtlı bir Lexis kullanıcısı bulunamadı.",
        )

    existing = (
        supabase_admin.table("organization_members")
        .select("user_id")
        .eq("org_id", org_id)
        .eq("user_id", target_user_id)
        .execute()
        .data
    )
    if existing:
        raise HTTPException(status_code=400, detail="Bu kullanıcı zaten kurumun üyesi.")

    result = (
        supabase_admin.table("organization_members")
        .insert({"org_id": org_id, "user_id": target_user_id, "role": invite_in.role})
        .execute()
    )
    membership = result.data[0]
    profile = (
        supabase_admin.table("profiles")
        .select("username, total_xp")
        .eq("id", target_user_id)
        .single()
        .execute()
    )
    return OrganizationMemberItem(
        user_id=target_user_id,
        username=(profile.data or {}).get("username"),
        email=invite_in.email,
        role=membership["role"],
        joined_at=membership["joined_at"],
        total_xp=(profile.data or {}).get("total_xp", 0),
        consent_given=bool(membership.get("report_consent_at")),  # her zaman False — yeni üye opt-in bekliyor
    )


@router.delete("/{org_id}/members/{user_id}", status_code=204)
async def remove_member(org_id: str, user_id: str, current_user=Depends(get_current_user)):
    _require_manage_role(org_id, current_user.id)

    target = (
        supabase_admin.table("organization_members")
        .select("role")
        .eq("org_id", org_id)
        .eq("user_id", user_id)
        .execute()
        .data
    )
    if not target:
        raise HTTPException(status_code=404, detail="Kullanıcı bu kurumun üyesi değil.")

    if target[0]["role"] == "owner":
        owner_count = (
            supabase_admin.table("organization_members")
            .select("user_id", count="exact")
            .eq("org_id", org_id)
            .eq("role", "owner")
            .execute()
            .count
            or 0
        )
        if owner_count <= 1:
            raise HTTPException(
                status_code=400, detail="Kurumun son sahibi (owner) çıkarılamaz."
            )

    supabase_admin.table("organization_members").delete().eq("org_id", org_id).eq(
        "user_id", user_id
    ).execute()


# ── Rapor Paylaşımı Onayı — İstatistik & Raporlama V2 öncelik #3, madde G
# ("KVKK onay mekanizması") ── Kurum raporu (madde B) "top_learners"
# bölümü + PDF/CSV/Excel export'u (madde F) üyeleri İSİMLİ gösteriyor —
# bu, üyenin kendi rızasıyla (opt-in, varsayılan KAPALI) vermesi gereken
# bir onay. SADECE kendi üyeliği için, kendi adına set edilebilir — bir
# admin başka bir üye adına onay VEREMEZ (KVKK'nin "açık rıza" ilkesiyle
# tutarlı olması için _get_membership_or_403 current_user.id ile
# eşleştiriyor, org_id + hedef user_id'yi request'ten almıyoruz).
@router.get("/{org_id}/consent", response_model=OrganizationConsentResponse)
async def get_report_consent(org_id: str, current_user=Depends(get_current_user)):
    membership = _get_membership_or_403(org_id, current_user.id)
    consented_at = membership.get("report_consent_at")
    return OrganizationConsentResponse(consent_given=bool(consented_at), consented_at=consented_at)


@router.put("/{org_id}/consent", response_model=OrganizationConsentResponse)
async def set_report_consent(
    org_id: str,
    body: OrganizationConsentRequest,
    current_user=Depends(get_current_user),
):
    _get_membership_or_403(org_id, current_user.id)  # üye mi kontrolü — rol şartı yok, herkes kendi onayını yönetir
    new_value = datetime.now(timezone.utc).isoformat() if body.consent else None
    result = (
        supabase_admin.table("organization_members")
        .update({"report_consent_at": new_value})
        .eq("org_id", org_id)
        .eq("user_id", current_user.id)
        .execute()
    )
    updated = result.data[0] if result.data else {"report_consent_at": new_value}
    consented_at = updated.get("report_consent_at")
    return OrganizationConsentResponse(consent_given=bool(consented_at), consented_at=consented_at)


# ── Kurum Raporu — İstatistik & Raporlama V2 öncelik #3, madde B ──────
# Dönemsel (bu hafta/ay) kurum GENELİNDE bir özet: çalışma süresi, doğruluk,
# en aktif üyeler, zayıf konular, kazanılan rozetler. Sadece owner/admin
# görebilir (bkz. _require_manage_role) — normal bir üyenin kurum-içi
# liderlik tablosunu (yukarıdaki /members) görmesi ile bu raporu görmesi
# FARKLI yetki seviyeleri: rapor yönetimsel bir görünüm, tüm üyelere açık
# değil.
@router.get("/{org_id}/report")
async def get_organization_report_route(
    org_id: str,
    period: str = "week",
    current_user=Depends(get_current_user),
):
    _require_manage_role(org_id, current_user.id)
    if period not in ("week", "month"):
        raise HTTPException(
            status_code=400, detail="Geçersiz period. 'week' veya 'month' olmalı."
        )
    return await get_organization_report(org_id, period)  # type: ignore[arg-type]

# ── Kurum Raporu Export — İstatistik & Raporlama V2 öncelik #3, madde F ──
# CSV/XLSX/PDF indirme, sadece owner/admin (aynı yetki, _require_manage_role).
@router.get("/{org_id}/report/export")
async def export_organization_report_route(
    org_id: str,
    period: str = "week",
    format: str = "pdf",
    current_user=Depends(get_current_user),
):
    _require_manage_role(org_id, current_user.id)
    if period not in ("week", "month"):
        raise HTTPException(status_code=400, detail="Geçersiz period. 'week' veya 'month' olmalı.")
    if format not in SUPPORTED_FORMATS:
        raise HTTPException(status_code=400, detail=f"Geçersiz format. Şunlardan biri olmalı: {', '.join(SUPPORTED_FORMATS)}")

    report = await get_organization_report(org_id, period)  # type: ignore[arg-type]
    profile = (
        supabase_admin.table("profiles")
        .select("native_lang")
        .eq("id", current_user.id)
        .single()
        .execute()
    ).data or {}
    lang = profile.get("native_lang") or "tr"
    generated_at = (datetime.now(timezone.utc) + timedelta(hours=3)).strftime("%d.%m.%Y %H:%M")
    doc = build_org_report_document(report, generated_at=generated_at, lang=lang)
    body, media_type = render(doc, format, lang=lang)
    filename = f"lexis-kurum-rapor-{period}.{format}"
    return Response(
        content=body,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ── Kurum Raporu — E-posta ile Gönder (isteğe bağlı/on-demand) ──
# Kendi (isteği yapan owner/admin'in) e-postasına gönderir — kurumun genel
# bir "iletişim e-postası" alanı yok, bkz. organizations tablosu.
@router.post("/{org_id}/report/send-email")
async def send_organization_report_email_route(
    org_id: str,
    period: str = "week",
    format: str = "pdf",
    current_user=Depends(get_current_user),
):
    _require_manage_role(org_id, current_user.id)
    if period not in ("week", "month"):
        raise HTTPException(status_code=400, detail="Geçersiz period. 'week' veya 'month' olmalı.")
    if format not in SUPPORTED_FORMATS:
        raise HTTPException(status_code=400, detail=f"Geçersiz format. Şunlardan biri olmalı: {', '.join(SUPPORTED_FORMATS)}")
    if not current_user.email:
        raise HTTPException(status_code=400, detail="Hesabında kayıtlı bir e-posta adresi yok.")

    report = await get_organization_report(org_id, period)  # type: ignore[arg-type]
    profile = (
        supabase_admin.table("profiles")
        .select("native_lang")
        .eq("id", current_user.id)
        .single()
        .execute()
    ).data or {}
    lang = profile.get("native_lang") or "tr"
    generated_at = (datetime.now(timezone.utc) + timedelta(hours=3)).strftime("%d.%m.%Y %H:%M")
    doc = build_org_report_document(report, generated_at=generated_at, lang=lang)
    body, media_type = render(doc, format, lang=lang)
    filename = f"lexis-kurum-rapor-{period}.{format}"
    period_label = "Haftalık" if period == "week" else "Aylık"
    org_name = report.get("org", {}).get("name") or "kurumun"

    sent = send_report_export_email(
        current_user.email,
        subject=f"Lexis {period_label} Kurum Raporu — {org_name}",
        intro_html=f'<p style="color:#334155; font-size:15px;">{org_name} için {period_label.lower()} kurum raporu ekte.</p>',
        attachment_filename=filename,
        attachment_bytes=body,
        attachment_content_type=media_type,
    )
    if not sent:
        raise HTTPException(status_code=502, detail="Rapor e-postayla gönderilemedi. Lütfen daha sonra tekrar dene.")
    return {"sent": True, "to": current_user.email}

