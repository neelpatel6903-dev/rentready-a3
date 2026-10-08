"""
routes/account.py
"Delete all my data" — removes the user's profile, every saved check, and
finally the Supabase auth account itself. Order matters: app data first (it
cascades off auth.users anyway, but explicit deletion works even if account
deletion is disabled in Supabase), then the account.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends

from .._lib import supabase
from .._lib.auth import get_session, user_id

router = APIRouter(prefix="/api/account", tags=["account"])


@router.delete("/data")
async def delete_all_data(session: dict = Depends(get_session)) -> dict:
    """
    Delete profile + all assessments, then the auth user.
    Returns which parts succeeded so the client can report honestly.
    """
    uid = user_id(session)
    deleted = {"profile": False, "checks": 0, "account": False}

    profile_response = await supabase.rest(
        "DELETE",
        "profiles",
        token=session["token"],
        params={"id": f"eq.{uid}"},
        headers={"Prefer": "return=representation"},
    )
    deleted["profile"] = bool(profile_response.json())

    checks_response = await supabase.rest(
        "DELETE",
        "assessments",
        token=session["token"],
        params={"user_id": f"eq.{uid}"},
        headers={"Prefer": "return=representation"},
    )
    deleted["checks"] = len(checks_response.json())

    # Finally remove the auth account itself (Supabase supports self-delete
    # with the user's own token). If the project has this disabled we still
    # wiped the app data — report that rather than failing the request.
    try:
        await supabase.delete_user(session["token"])
        deleted["account"] = True
    except supabase.SupabaseError:
        pass

    return deleted