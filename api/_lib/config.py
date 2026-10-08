"""
config.py
Environment-driven settings for the RentReady API.

SUPABASE_URL and SUPABASE_ANON_KEY are read here and nowhere else — never
from VITE_-prefixed variables, never in the browser bundle. On Vercel they
come from the project's Environment Variables; locally from .env.local or
the shell. Failing fast at import time means a broken deploy is loud.
"""
import os


class SettingsError(RuntimeError):
    """Raised when required server-side configuration is missing."""


def _require(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if not value:
        raise SettingsError(
            f"Missing required environment variable {name}. "
            "Set it in .env.local for development or in Vercel → Settings → "
            "Environment Variables for deployment."
        )
    return value


class Settings:
    """Lazy accessor so importing the module never crashes before env is read."""

    @property
    def supabase_url(self) -> str:
        return _require("SUPABASE_URL").rstrip("/")

    @property
    def supabase_anon_key(self) -> str:
        return _require("SUPABASE_ANON_KEY")

    @property
    def origin(self) -> str:
        """Frontend origin allowed in CORS during local development."""
        return os.environ.get("APP_ORIGIN", "http://localhost:5173")


settings = Settings()