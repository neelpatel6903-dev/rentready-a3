"""
auth.py
FastAPI dependencies that turn the browser's `Authorization: Bearer <token>`
header into a verified Supabase user — no cookies anywhere.

The token is the Supabase access token stored by React in sessionStorage;
verification is a call to /auth/v1/user with the anon key, so an expired or
forged token fails with 401 before any route body runs.
"""
from __future__ import annotations

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from . import supabase

_bearer = HTTPBearer(auto_error=False)


async def get_session(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> dict:
    """
    Resolve the request's bearer token into {"token": str, "user": dict}.

    Raises 401 with a plain message when the header is missing, malformed,
    or rejected by Supabase (expired/invalid token).
    """
    if credentials is None or not credentials.credentials:
        raise HTTPException(
            status_code=401, detail="You need to sign in to do that."
        )
    token = credentials.credentials
    try:
        user = await supabase.get_user(token)
    except supabase.SupabaseError as error:
        raise HTTPException(
            status_code=401,
            detail="Your session has expired. Please sign in again.",
        ) from error
    return {"token": token, "user": user}


def user_id(session: dict) -> str:
    """The auth.users id of the signed-in caller (used in every DB write)."""
    return session["user"]["id"]