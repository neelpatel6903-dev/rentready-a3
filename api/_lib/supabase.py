"""
supabase.py
Thin async client for the two Supabase HTTP APIs the backend talks to,
built on httpx — the official supabase-py package is deliberately not used.

  Auth API  {{SUPABASE_URL}}/auth/v1/...   signup, login, logout, user lookup
  REST API  {{SUPABASE_URL}}/rest/v1/...   PostgREST reads/writes

Every REST call forwards the *caller's* access token alongside the anon key,
so Supabase applies Row Level Security as that user. The anon key never
leaves the server.
"""
from __future__ import annotations

import httpx

from .config import settings

TIMEOUT = httpx.Timeout(10.0, connect=5.0)


class SupabaseError(RuntimeError):
    """A Supabase HTTP call failed; carries a user-safe message and status."""

    def __init__(self, status: int, message: str):
        super().__init__(message)
        self.status = status
        self.message = message


def _safe_message(response: httpx.Response) -> str:
    """Pull a human-readable message out of a Supabase error body."""
    try:
        body = response.json()
        if isinstance(body, dict):
            # Auth API: {"msg": "..."} / {"error_description": "..."}; REST: {"message": "..."}
            for key in ("msg", "error_description", "message", "error", "details"):
                if body.get(key):
                    return str(body[key])
        return str(body)
    except ValueError:
        return response.text or f"Supabase returned HTTP {response.status_code}"


async def _request(
    method: str,
    url: str,
    *,
    token: str | None = None,
    json: dict | list | None = None,
    params: dict | None = None,
    headers: dict | None = None,
) -> httpx.Response:
    """Perform a Supabase request and raise SupabaseError on any 4xx/5xx."""
    all_headers = {"apikey": settings.supabase_anon_key}
    if token:
        all_headers["Authorization"] = f"Bearer {token}"
    if headers:
        all_headers.update(headers)

    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        response = await client.request(
            method, url, json=json, params=params, headers=all_headers
        )

    if response.status_code >= 400:
        raise SupabaseError(response.status_code, _safe_message(response))
    return response


# --- Auth API ---------------------------------------------------------------

async def signup(email: str, password: str) -> dict:
    """POST /auth/v1/signup — returns the GoTrue JSON (session and/or user)."""
    response = await _request(
        "POST",
        f"{settings.supabase_url}/auth/v1/signup",
        json={"email": email, "password": password},
    )
    return response.json()


async def login(email: str, password: str) -> dict:
    """POST /auth/v1/token?grant_type=password — returns session + user."""
    response = await _request(
        "POST",
        f"{settings.supabase_url}/auth/v1/token",
        params={"grant_type": "password"},
        json={"email": email, "password": password},
    )
    return response.json()


async def logout(access_token: str) -> None:
    """POST /auth/v1/logout — revokes the refresh token for this session."""
    await _request("POST", f"{settings.supabase_url}/auth/v1/logout", token=access_token)


async def get_user(access_token: str) -> dict:
    """GET /auth/v1/user — validates the bearer token and returns its user."""
    response = await _request(
        "GET", f"{settings.supabase_url}/auth/v1/user", token=access_token
    )
    return response.json()


async def delete_user(access_token: str) -> None:
    """DELETE /auth/v1/user — deletes the *authenticated* user's own account."""
    await _request("DELETE", f"{settings.supabase_url}/auth/v1/user", token=access_token)


# --- REST API (PostgREST) ---------------------------------------------------

async def rest(
    method: str,
    path: str,
    *,
    token: str,
    json: dict | list | None = None,
    params: dict | None = None,
    headers: dict | None = None,
) -> httpx.Response:
    """
    Call {{SUPABASE_URL}}/rest/v1/{path} with the user's token so RLS applies.
    Returns the response on 2xx; raises SupabaseError otherwise. Callers read
    .json() themselves (rows are a list; prefer=representation returns them).
    """
    return await _request(
        method,
        f"{settings.supabase_url}/rest/v1/{path.lstrip('/')}",
        token=token,
        json=json,
        params=params,
        headers=headers,
    )