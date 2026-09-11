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

from fastapi import APIRouter, Depends, HTTPException

from app.core.auth import get_current_user
from app.core.database import supabase_admin
from app.schemas.organizations import (
    OrganizationCreate,
    OrganizationInviteRequest,
    OrganizationItem,
    OrganizationListResponse,
    OrganizationMemberItem,
    OrganizationMembersResponse,
)
from app.services.auth_users import list_all_auth_users

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


@router.post("", response_model=OrganizationItem, status_code=201)
async def create_organization(
    org_in: OrganizationCreate,
    current_user=Depends(get_current_user),
):
    """Yeni kurum aç. Oluşturan kullanıcı otomatik 'owner' olur."""
    result = (
        supabase_admin.table("organizations")
        .insert({"name": org_in.name, "created_by": current_user.id})
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=500, detail="Kurum oluşturulamadı.")
    org = result.data[0]

    supabase_admin.table("organization_members").insert(
        {"org_id": org["id"], "user_id": current_user.id, "role": "owner"}
    ).execute()

    return OrganizationItem(
        id=org["id"], name=org["name"], plan=org["plan"], created_at=org["created_at"], my_role="owner"
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
        .select("user_id, role, joined_at")
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
