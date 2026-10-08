"""
_routes/profile.py
GET/PUT the signed-in user's About-you profile (public.profiles, RLS-protected).
Prefills the AboutYou screen on return visits.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from .._lib import supabase
from .._lib.auth import get_session, user_id
from .._lib.validation import validate_profile

router = APIRouter(prefix="/api/profile", tags=["profile"])

_COLUMNS = "id,first_name,current_suburb,move_in_date,employment_status,job_tenure,rental_history,reference,created_at,updated_at"


def _to_camel(row: dict) -> dict:
    return {
        "id": row.get("id"),
        "firstName": row.get("first_name"),
        "currentSuburb": row.get("current_suburb"),
        "moveInDate": row.get("move_in_date"),
        "employmentStatus": row.get("employment_status"),
        "jobTenure": row.get("job_tenure") or "",
        "rentalHistory": row.get("rental_history"),
        "reference": row.get("reference"),
        "updatedAt": row.get("updated_at"),
    }


@router.get("")
async def get_profile(session: dict = Depends(get_session)) -> dict:
    """Returns {"profile": ...} or {"profile": null} — never 404s."""
    response = await supabase.rest(
        "GET",
        "profiles",
        token=session["token"],
        params={"select": _COLUMNS, "id": f"eq.{user_id(session)}", "limit": "1"},
    )
    rows = response.json()
    return {"profile": _to_camel(rows[0]) if rows else None}


@router.put("")
async def upsert_profile(payload: dict, session: dict = Depends(get_session)) -> dict:
    errors = validate_profile(payload)
    if errors:
        raise HTTPException(status_code=422, detail=errors)

    body = {
        "id": user_id(session),
        "first_name": payload["firstName"].strip(),
        "current_suburb": payload["currentSuburb"].strip(),
        "move_in_date": payload["moveInDate"],
        "employment_status": payload["employmentStatus"],
        "job_tenure": payload.get("jobTenure") or None,
        "rental_history": payload["rentalHistory"],
        "reference": payload["reference"],
    }
    response = await supabase.rest(
        "POST",
        "profiles",
        token=session["token"],
        json=body,
        params={"on_conflict": "id"},
        headers={
            "Prefer": "resolution=merge-duplicates,return=representation",
            "Content-Type": "application/json",
        },
    )
    rows = response.json()
    return {"profile": _to_camel(rows[0]) if rows else None}