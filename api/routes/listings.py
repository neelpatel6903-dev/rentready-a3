"""
routes/listings.py
The eight sample homes, served from Postgres (public.listings) instead of
src/data/listings.js. available_from is derived from available_in_weeks at
read time, so it always means "N weeks from today" exactly like the old
client-side computation — the data never goes stale.
"""
from __future__ import annotations

from datetime import timedelta

from fastapi import APIRouter, Depends

from .._lib import supabase
from .._lib.auth import get_session
from .._lib.validation import today

router = APIRouter(prefix="/api/listings", tags=["listings"])


def _to_api(row: dict) -> dict:
    return {
        "id": row["id"],
        "suburb": row["suburb"],
        "type": row["type"],
        "bedrooms": row["bedrooms"],
        "weeklyRent": row["weekly_rent"],
        "lat": row["lat"],
        "lng": row["lng"],
        "availableFrom": (today() + timedelta(weeks=row["available_in_weeks"])).isoformat(),
    }


@router.get("")
async def list_listings(session: dict = Depends(get_session)) -> dict:
    """All listings (RLS: readable by any authenticated user)."""
    response = await supabase.rest(
        "GET",
        "listings",
        token=session["token"],
        params={"select": "*"},
    )
    rows = response.json()
    return {"listings": [_to_api(row) for row in rows]}