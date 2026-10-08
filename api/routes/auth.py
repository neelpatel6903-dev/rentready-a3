"""
routes/auth.py
Signup, login, logout and session introspection. All calls go through
httpx to Supabase's Auth API; the browser only ever sees RentReady JSON and
receives an access token to keep in sessionStorage.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from .._lib import supabase
from .._lib.auth import get_session

router = APIRouter(prefix="/api/auth", tags=["auth"])


class Credentials(BaseModel):
    email: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=1, max_length=128)


def _session_payload(session: dict) -> dict:
    """Shape the GoTrue session down to what the client needs."""
    return {
        "accessToken": session.get("access_token"),
        "refreshToken": session.get("refresh_token"),
        "expiresIn": session.get("expires_in"),
        "user": _public_user(session.get("user") or {}),
    }


def _public_user(user: dict) -> dict:
    return {
        "id": user.get("id"),
        "email": user.get("email"),
        "createdAt": user.get("created_at"),
    }


@router.post("/signup")
async def signup(body: Credentials) -> dict:
    """
    Create an account. If Supabase has email confirmation enabled the
    response has no session — we tell the client to ask the user to check
    their inbox; if auto-confirm is on, tokens come back immediately.
    """
    from .._lib.validation import validate_signup

    errors = validate_signup(body.email, body.password)
    if errors:
        raise HTTPException(status_code=422, detail=errors)

    try:
        data = await supabase.signup(body.email.strip().lower(), body.password)
    except supabase.SupabaseError as error:
        raise _map_auth_error(error) from error

    if data.get("access_token"):
        return {**_session_payload(data), "needsConfirmation": False}

    # Confirmation required: no session yet.
    if data.get("user") and data["user"].get("identities") is not None \
            and len(data["user"]["identities"]) == 0:
        raise HTTPException(
            status_code=409,
            detail={"email": "An account with this email already exists — try signing in."},
        )
    return {
        "accessToken": None,
        "refreshToken": None,
        "user": _public_user(data.get("user") or {}),
        "needsConfirmation": True,
    }


@router.post("/login")
async def login(body: Credentials) -> dict:
    """Verify credentials → tokens for sessionStorage."""
    from .._lib.validation import validate_email, validate_password

    errors = {}
    if message := validate_email(body.email):
        errors["email"] = message
    if message := validate_password(body.password):
        errors["password"] = message
    if errors:
        raise HTTPException(status_code=422, detail=errors)

    try:
        data = await supabase.login(body.email.strip().lower(), body.password)
    except supabase.SupabaseError as error:
        raise _map_auth_error(error) from error
    return {**_session_payload(data), "needsConfirmation": False}


@router.post("/logout")
async def logout(session: dict = Depends(get_session)) -> dict:
    """Revoke the refresh token server-side; client clears sessionStorage."""
    try:
        await supabase.logout(session["token"])
    except supabase.SupabaseError:
        pass  # already expired — still a successful logout for the client
    return {"ok": True}


@router.get("/me")
async def me(session: dict = Depends(get_session)) -> dict:
    """Session bootstrap: GET /api/auth/me on every page load."""
    return {"user": _public_user(session["user"])}


def _map_auth_error(error: supabase.SupabaseError) -> HTTPException:
    """Turn GoTrue status codes into friendly, field-level client messages."""
    if error.status == 400:
        lowered = error.message.lower()
        if "invalid login credentials" in lowered or "invalid email or password" in lowered:
            return HTTPException(
                status_code=401,
                detail={"password": "Incorrect email or password. Try again."},
            )
        if "email not confirmed" in lowered:
            return HTTPException(
                status_code=403,
                detail={"email": "Confirm your email first — check your inbox."},
            )
        return HTTPException(status_code=400, detail={"email": error.message})
    if error.status == 422:
        # GoTrue's own password policy, e.g. "Password should be at least 6 characters"
        return HTTPException(status_code=422, detail={"password": error.message})
    if error.status == 429:
        return HTTPException(
            status_code=429,
            detail={"email": "Too many attempts — wait a minute and try again."},
        )
    return HTTPException(status_code=502, detail="Authentication service unavailable.")