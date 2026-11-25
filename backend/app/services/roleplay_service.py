"""
backend/app/services/roleplay_service.py

"Roleplay/diyalog botu" (ilk surum: 24 Eylul 2026; 25 Kasim 2026'da
dallanan-diyalog modeline GECIS -- kullanicinin istegi: serbest metin
yazmak yerine her adimda sunulan 3 hazir cevaptan birini isaretleyerek
konusma pratigi). Kullanici bir kategori, sonra o kategorideki bir
senaryo secer; senaryo bir "dallan ve tekrar birles" agacidir (bkz.
roleplay_data.py modul docstring'i).

ONEMLI FARK (eski surume gore): Icerik artik TAMAMEN statik --
roleplay_data.py icindeki CATEGORIES/SCENARIO_META/SCENARIO_TREES.
CANLI ANTHROPIC API CAGRISI YOK -- eski _call_model/_build_system_prompt/
_lang_name_en/_get_current_level kaldirildi, cunku botun her replik ve
tepkisi onceden yazilmis. Bu hem maliyeti/gecikmeyi sifirlar hem de
run_in_threadpool sarmalayicisina artik gerek birakmaz (routes/roleplay.py).

XP kurali: senaryo DOGAL SONUNA ulasildiginda (secilen secenegin
next=None oldugu an, choose_option icinde) otomatik olarak VE TEK SEFER
(xp_awarded DB'de kilit, eskisiyle ayni mantik) verilir. Erken "Bitir" ile
cikilirsa (finish_session) XP verilmez -- bu, eski "en az N mesaj"
esigi yerine gecen daha dogal bir olcut: rastgele bir sayi degil,
senaryoyu gercekten tamamlamis olmak.
"""

from __future__ import annotations

from datetime import UTC, datetime

from app.core.database import supabase_admin
from app.services.roleplay_data import CATEGORIES, SCENARIO_META, SCENARIO_TREES
from app.services.xp_service import award_xp


class RoleplayError(Exception):
    """Kullaniciya HTTP hatasi olarak yansitilacak beklenen hatalar icin."""


def list_categories() -> list[dict]:
    """Her kategoriyi, SADECE agaci yazilmis (SCENARIO_TREES icinde olan)
    senaryolarla birlikte doner -- henuz icerigi yazilmamis bir senaryo
    HICBIR ZAMAN secilebilir olarak gosterilmez (bkz. roleplay_data.py
    modul docstring'indeki "ILERLEME NOTU"). Bos kalan kategori (henuz hic
    senaryosu yazilmamis) listede hic gorunmez."""
    result: list[dict] = []
    for cat in CATEGORIES:
        scenarios = [
            {"slug": slug, "title_tr": meta["title_tr"], "title_en": meta["title_en"]}
            for slug, meta in SCENARIO_META.items()
            if meta["category_slug"] == cat["slug"] and slug in SCENARIO_TREES
        ]
        if not scenarios:
            continue
        result.append(
            {
                "slug": cat["slug"],
                "title_tr": cat["title_tr"],
                "title_en": cat["title_en"],
                "icon": cat["icon"],
                "scenarios": scenarios,
            }
        )
    return result


def _get_tree(scenario_slug: str) -> dict:
    tree = SCENARIO_TREES.get(scenario_slug)
    if not tree:
        raise RoleplayError("unknown_scenario")
    return tree


def _get_node(tree: dict, node_id: str) -> dict:
    node = tree["nodes"].get(node_id)
    if not node:
        raise RoleplayError("unknown_node")
    return node


def _public_options(node: dict) -> list[dict]:
    """Kullaniciya SADECE id+text gonderilir -- quality/reaction/next asla
    sizdirilmaz, yoksa "dogru" secenek onceden belli olurdu."""
    return [{"id": o["id"], "text": o["text"]} for o in node["options"]]


def _get_session(session_id: str, user_id: str) -> dict:
    rows = (
        supabase_admin.table("roleplay_sessions")
        .select("*")
        .eq("id", session_id)
        .eq("user_id", user_id)
        .limit(1)
        .execute()
        .data
    ) or []
    if not rows:
        raise RoleplayError("session_not_found")
    return rows[0]


def start_session(user_id: str, scenario_slug: str, learning_lang: str, native_lang: str) -> dict:
    meta = SCENARIO_META.get(scenario_slug)
    tree = _get_tree(scenario_slug)
    if not meta:
        raise RoleplayError("unknown_scenario")
    node = _get_node(tree, tree["start"])

    inserted = (
        supabase_admin.table("roleplay_sessions")
        .insert(
            {
                "user_id": user_id,
                "scenario_slug": scenario_slug,
                "learning_lang": learning_lang,
                "native_lang": native_lang,
                "current_node_id": tree["start"],
            }
        )
        .execute()
        .data
    )
    session = inserted[0]

    supabase_admin.table("roleplay_messages").insert(
        {"session_id": session["id"], "role": "assistant", "content": node["bot"]}
    ).execute()

    return {
        "id": session["id"],
        "scenario_slug": scenario_slug,
        "category_slug": meta["category_slug"],
        "learning_lang": learning_lang,
        "status": "active",
        "bot_line": node["bot"],
        "options": _public_options(node),
    }


async def choose_option(user_id: str, session_id: str, option_id: str) -> dict:
    session = _get_session(session_id, user_id)
    if session["status"] != "active":
        raise RoleplayError("session_completed")

    tree = _get_tree(session["scenario_slug"])
    node = _get_node(tree, session["current_node_id"])
    option = next((o for o in node["options"] if o["id"] == option_id), None)
    if option is None:
        raise RoleplayError("invalid_option")

    supabase_admin.table("roleplay_messages").insert(
        {"session_id": session_id, "role": "user", "content": option["text"]}
    ).execute()
    supabase_admin.table("roleplay_messages").insert(
        {"session_id": session_id, "role": "assistant", "content": option["reaction"]}
    ).execute()

    new_step_count = session["turn_count"] + 1
    new_good_count = session["good_choices"] + (1 if option["quality"] == "good" else 0)
    next_node_id = option["next"]

    if next_node_id is None:
        # Senaryo dogal sonuna ulasti -- oturum burada tamamlanir, XP bu anda verilir.
        update_payload: dict = {
            "status": "completed",
            "turn_count": new_step_count,
            "good_choices": new_good_count,
            "completed_at": datetime.now(UTC).isoformat(),
        }
        xp_awarded = 0
        if not session["xp_awarded"]:
            result = await award_xp(user_id=user_id, source_type="roleplay_session")
            xp_awarded = result.amount_awarded
            update_payload["xp_awarded"] = True
        supabase_admin.table("roleplay_sessions").update(update_payload).eq("id", session_id).execute()

        return {
            "reaction": option["reaction"],
            "quality": option["quality"],
            "next_bot_line": None,
            "options": None,
            "status": "completed",
            "xp_awarded": xp_awarded,
        }

    next_node = _get_node(tree, next_node_id)
    supabase_admin.table("roleplay_messages").insert(
        {"session_id": session_id, "role": "assistant", "content": next_node["bot"]}
    ).execute()
    supabase_admin.table("roleplay_sessions").update(
        {
            "turn_count": new_step_count,
            "good_choices": new_good_count,
            "current_node_id": next_node_id,
        }
    ).eq("id", session_id).execute()

    return {
        "reaction": option["reaction"],
        "quality": option["quality"],
        "next_bot_line": next_node["bot"],
        "options": _public_options(next_node),
        "status": "active",
        "xp_awarded": 0,
    }


async def finish_session(user_id: str, session_id: str) -> dict:
    """Kullanici senaryoyu bitirmeden erken "Bitir" ile cikarsa cagrilir --
    XP verilmez (senaryo sonuna dogal olarak ulasilmadi), oturum sadece
    'completed' olarak isaretlenir. Zaten (choose_option'daki dogal
    bitisten) tamamlanmissa idempotent sekilde ayni sonucu doner."""
    session = _get_session(session_id, user_id)
    if session["status"] == "completed":
        return {"status": "completed", "xp_awarded": 0}

    supabase_admin.table("roleplay_sessions").update(
        {"status": "completed", "completed_at": datetime.now(UTC).isoformat()}
    ).eq("id", session_id).execute()

    return {"status": "completed", "xp_awarded": 0}
