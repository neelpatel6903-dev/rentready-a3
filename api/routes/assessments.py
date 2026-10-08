"""
routes/assessments.py
POST a completed check (server scores it and stores the snapshot), list the
user's history for the My checks screen, and delete individual checks.
"Delete all my data" lives in routes/account.py.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from .._lib import supabase
from .._lib.auth import get_session, user_id
from .._lib.scoring import calculate_likelihood
from .._lib.validation import validate_finance, validate_profile

router = APIRouter(prefix="/api/assessments", tags=["assessments"])


def _to_api(row: dict) -> dict:
    """DB row (snake_case) → the camelCase shape React already understands."""
    return {
        "id": row["id"],
        "listingId": row.get("listing_id"),
        "listing": row.get("listing"),
        "answers": row.get("answers"),
        "weeklyIncome": float(row["weekly_income"]),
        "savings": float(row["savings"]),
        "score": row["score"],
        "rawScore": row["raw_score"],
        "band": row["band"],
        "outcome": row["outcome"],
        "factors": row.get("factors") or [],
        "caps": row.get("caps") or [],
        "tips": row.get("tips") or [],
        "rentSharePct": row.get("rent_share_pct"),
        "weeksCovered": row.get("weeks_covered"),
        "createdAt": row.get("created_at"),
    }


@router.get("")
async def list_checks(session: dict = Depends(get_session)) -> dict:
    """History for My checks, newest first (RLS scopes to the caller)."""
    response = await supabase.rest(
        "GET",
        "assessments",
        token=session["token"],
        params={
            "select": "*",
            "user_id": f"eq.{user_id(session)}",
            "order": "created_at.desc",
        },
    )
    return {"checks": [_to_api(row) for row in response.json()]}


@router.post("", status_code=201)
async def create_check(payload: dict, session: dict = Depends(get_session)) -> dict:
    """
    Body: { about: {...}, finances: {weeklyIncome, savings}, listingId }.
    Validates, scores with the Python model, stores a snapshot, returns it.
    """
    about = payload.get("about") or {}
    finances = payload.get("finances") or {}
    listing_id = payload.get("listingId") or ""

    errors = validate_profile(about)
    income, income_error = validate_finance(finances.get("weeklyIncome"), allow_zero=False)
    if income_error:
        errors["weeklyIncome"] = income_error
    savings, savings_error = validate_finance(finances.get("savings"), allow_zero=True)
    if savings_error:
        errors["savings"] = savings_error
    if errors:
        raise HTTPException(status_code=422, detail=errors)

    listing_response = await supabase.rest(
        "GET",
        "listings",
        token=session["token"],
        params={"select": "*", "id": f"eq.{listing_id}", "limit": "1"},
    )
    listing_rows = listing_response.json()
    if not listing_rows:
        raise HTTPException(status_code=404, detail={"listingId": "That home is no longer available."})
    listing = listing_rows[0]

    # Re-derive availableFrom exactly as GET /api/listings does, so the
    # stored snapshot matches what the user saw when choosing.
    from datetime import timedelta
    from .._lib.validation import today as au_today

    listing_api = {
        "id": listing["id"],
        "suburb": listing["suburb"],
        "type": listing["type"],
        "bedrooms": listing["bedrooms"],
        "weeklyRent": listing["weekly_rent"],
        "lat": listing["lat"],
        "lng": listing["lng"],
        "availableFrom": (au_today() + timedelta(weeks=listing["available_in_weeks"])).isoformat(),
    }

    result = calculate_likelihood(
        {
            "weeklyIncome": income,
            "weeklyRent": listing["weekly_rent"],
            "savings": savings,
        },
        about,
    )

    answers = {
        "firstName": about.get("firstName"),
        "currentSuburb": about.get("currentSuburb"),
        "moveInDate": about.get("moveInDate"),
        "employmentStatus": about.get("employmentStatus"),
        "jobTenure": about.get("jobTenure") or "",
        "rentalHistory": about.get("rentalHistory"),
        "reference": about.get("reference"),
    }

    body = {
        "user_id": user_id(session),
        "listing_id": listing_api["id"],
        "listing": listing_api,
        "answers": answers,
        "weekly_income": income,
        "savings": savings,
        "score": result["score"],
        "raw_score": result["rawScore"],
        "band": result["band"],
        "outcome": result["outcome"],
        "factors": result["factors"],
        "caps": result["caps"],
        "tips": result["tips"],
        "rent_share_pct": result["rentSharePct"],
        "weeks_covered": result["weeksCovered"],
    }

    response = await supabase.rest(
        "POST",
        "assessments",
        token=session["token"],
        json=body,
        headers={"Prefer": "return=representation", "Content-Type": "application/json"},
    )
    rows = response.json()
    return _to_api(rows[0])


@router.delete("/{check_id}", status_code=204)
async def delete_check(check_id: str, session: dict = Depends(get_session)) -> None:
    """Delete one check. RLS scopes the delete to the caller's own rows."""
    response = await supabase.rest(
        "DELETE",
        "assessments",
        token=session["token"],
        params={"id": f"eq.{check_id}", "user_id": f"eq.{user_id(session)}"},
        headers={"Prefer": "return=representation"},
    )
    if not response.json():
        raise HTTPException(status_code=404, detail="That check no longer exists.")