"""
index.py
RentReady FastAPI app — the single Vercel serverless function.

Vercel's Python runtime detects FastAPI from requirements.txt and loads the
`app` from api/index.py; every /api/... route below is served by this one
function. The React build (dist/) is served separately from the CDN, so the
browser always calls same-origin /api routes — no CORS in production, and no
Supabase keys anywhere in the frontend.
"""
from __future__ import annotations

import sys
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# Vercel may load this file either as `api.index` (a package submodule) or as a
# top-level `index` module, and relative imports only resolve in the first
# case. Putting the project root on sys.path and importing `api.*` absolutely
# makes the module load identically however Vercel picks it up — and under
# local uvicorn, which is started as `uvicorn api.index:app` from the root.
PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

# Underscore-prefixed on purpose: Vercel turns every plain .py file under api/
# into its own serverless function, so `_lib` and `_routes` stay out of the
# build and only api/index.py is deployed as the single FastAPI function.
from api._lib.config import settings  # noqa: E402
from api._lib.supabase import SupabaseError  # noqa: E402
from api._routes import account, assessments, auth, listings, profile  # noqa: E402

app = FastAPI(
    title="RentReady API",
    description="Auth, listings and rental-readiness checks for RentReady.",
    version="1.0.0",
)

# Development only: Vite runs on :5173 while uvicorn runs on :8000, so the
# dev server needs CORS. In production both come from the same origin and
# this middleware never matches.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(SupabaseError)
async def supabase_error_handler(_request: Request, error: SupabaseError) -> JSONResponse:
    """Any unhandled Supabase failure becomes a clean JSON error, not a 500."""
    status = error.status if 400 <= error.status < 500 else 502
    return JSONResponse(status_code=status, content={"detail": error.message})


@app.get("/api/health", tags=["health"])
async def health() -> dict:
    """Liveness probe for deploys and smoke tests — no auth, no secrets."""
    return {"ok": True, "service": "rentready-api"}


app.include_router(auth.router)
app.include_router(profile.router)
app.include_router(listings.router)
app.include_router(assessments.router)
app.include_router(account.router)