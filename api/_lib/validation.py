"""
validation.py
Server-side port of src/utils/validation.js. Every payload that writes to
the database is re-validated here — the browser's checks are UX only.

Each validator returns None when acceptable or a plain-language message.
validate_profile / validate_assessment collect them into one dict so routes
can answer 422 with every problem at once.
"""
from __future__ import annotations

import re
from datetime import date, timedelta

# Mirror of src/utils/dates.js: window runs from "today" (Melbourne time —
# the app is Melbourne-only) to six months out.
def today() -> date:
    try:
        from zoneinfo import ZoneInfo

        return date.today().astimezone(ZoneInfo("Australia/Melbourne")).date()
    except Exception:  # tzdata missing on some Windows setups
        return date.today()


def move_in_window() -> tuple[date, date]:
    """(today, six months out) with the same month-end clamping as dates.js."""
    minimum = today()
    anchor = minimum.replace(day=1)
    month_index = anchor.month + 6
    year = anchor.year + (month_index - 1) // 12
    month = (month_index - 1) % 12 + 1
    try:
        maximum = date(year, month, minimum.day)
    except ValueError:
        # e.g. 31 Jan + 6 months → 30 Jul: clamp to the target month's last day.
        last_day = (date(year + (month == 12), month % 12 + 1, 1) - timedelta(days=1)).day
        maximum = date(year, month, last_day)
    return minimum, maximum


EMAIL_RE = re.compile(r"^\S+@\S+\.\S+$")

EMPLOYMENT_VALUES = {"full-time", "part-time", "casual", "self-employed", "student", "not-working"}
JOB_TENURE_VALUES = {"under-3-months", "3-12-months", "over-12-months"}
RENTAL_HISTORY_VALUES = {"first-time", "under-1-year", "1-3-years", "3-plus-years"}
REFERENCE_VALUES = {"landlord-agent", "employer", "personal", "none"}


def validate_email(value: str) -> str | None:
    value = (value or "").strip()
    if not value:
        return "Enter your email address."
    return None if EMAIL_RE.match(value) else "Enter a valid email address like name@example.com."


def validate_password(value: str) -> str | None:
    return None if (value or "").strip() else "Enter your password."


def validate_signup(email: str, password: str) -> dict[str, str]:
    errors: dict[str, str] = {}
    if message := validate_email(email):
        errors["email"] = message
    if message := validate_password(password):
        errors["password"] = message
    elif len(password) < 6:
        # Supabase's own minimum — checked here for a friendlier message.
        errors["password"] = "Use at least 6 characters for your password."
    return errors


def _parse_iso(value: str) -> date | None:
    try:
        return date.fromisoformat(value)
    except (TypeError, ValueError):
        return None


def validate_profile(payload: dict) -> dict[str, str]:
    """Validate the About-you answers (camelCase keys, as sent by React)."""
    errors: dict[str, str] = {}

    if not (payload.get("firstName") or "").strip():
        errors["firstName"] = "Enter your first name."
    if not (payload.get("currentSuburb") or "").strip():
        errors["currentSuburb"] = "Select the suburb you live in now."

    move_in = payload.get("moveInDate") or ""
    minimum, maximum = move_in_window()
    parsed = _parse_iso(move_in)
    if not move_in:
        errors["moveInDate"] = "Choose your preferred move-in date."
    elif parsed is None:
        errors["moveInDate"] = "Choose a valid date."
    elif parsed < minimum:
        errors["moveInDate"] = "Choose a date from today onwards"
    elif parsed > maximum:
        errors["moveInDate"] = "Choose a date within the next six months."

    status = payload.get("employmentStatus") or ""
    if status not in EMPLOYMENT_VALUES:
        errors["employmentStatus"] = "Select your employment status."
    elif status != "not-working" and not (payload.get("jobTenure") or "").strip():
        errors["jobTenure"] = "Tell us how long you've been in your current job."

    if payload.get("rentalHistory") not in RENTAL_HISTORY_VALUES:
        errors["rentalHistory"] = "Select how long you've been renting."
    if payload.get("reference") not in REFERENCE_VALUES:
        errors["reference"] = "Select the best reference you can provide."
    return errors


def validate_finance(value, *, allow_zero: bool) -> tuple[float | None, str | None]:
    """Shared numeric check; returns (parsed_value, error_message)."""
    try:
        amount = float(value)
    except (TypeError, ValueError):
        amount = float("nan")
    if amount != amount:  # NaN
        return None, "Enter a number (digits only)."
    if amount < 0 or (amount <= 0 and not allow_zero):
        return None, "Enter your savings — 0 is fine." if allow_zero else \
            "Enter your weekly household income (numbers only)."
    return amount, None
