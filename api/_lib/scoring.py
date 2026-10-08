"""
scoring.py
Faithful Python port of src/utils/score.js — the server is the source of
truth for any score that gets persisted. The JS copy stays in the client for
live feedback (affordability meter, What-if card); when changing the rules,
update BOTH files together.

Five weighted factors (100 points):
  Affordability 35 · Employment 20 · Savings 20 · Rental history 15 ·
  References 10
Hard caps: rent > 50% of income caps at 40; savings < 4 weeks caps at 50.
"""
from __future__ import annotations

import math
from typing import Any

EMPLOYMENT_POINTS = {
    "full-time": 14,
    "part-time": 10,
    "self-employed": 8,
    "casual": 7,
    "student": 5,
    "not-working": 0,
}

TENURE_POINTS = {
    "over-12-months": 6,
    "3-12-months": 3,
    "under-3-months": 0,
}

HISTORY_POINTS = {
    "3-plus-years": 15,
    "1-3-years": 12,
    "under-1-year": 8,
    "first-time": 5,
}

HISTORY_DETAILS = {
    "3-plus-years": "3+ years of rental history",
    "1-3-years": "1 to 3 years of rental history",
    "under-1-year": "Under a year of rental history",
    "first-time": "First-time renter — no track record yet",
}

REFERENCE_POINTS = {
    "landlord-agent": 10,
    "employer": 6,
    "personal": 4,
    "none": 0,
}

REFERENCE_DETAILS = {
    "landlord-agent": "A previous landlord or agent reference",
    "employer": "An employer reference",
    "personal": "A personal reference only",
    "none": "No reference available yet",
}

# Human labels, mirroring optionLabel() from src/data/options.js.
EMPLOYMENT_LABELS = {
    "full-time": "Full-time",
    "part-time": "Part-time",
    "casual": "Casual",
    "self-employed": "Self-employed",
    "student": "Student",
    "not-working": "Not currently working",
}
JOB_TENURE_LABELS = {
    "under-3-months": "Under 3 months",
    "3-12-months": "3 to 12 months",
    "over-12-months": "Over 12 months",
}


def round1(value: float) -> float:
    """Matches JS Math.round(x * 10) / 10 — half-up, not banker's rounding."""
    return math.floor(value * 10 + 0.5) / 10


def _number(value: Any) -> float:
    """Matches JS Number(value) || 0 for the values this app produces."""
    try:
        result = float(value)
    except (TypeError, ValueError):
        return 0.0
    return result if result == result else 0.0  # NaN check


def js_number(value: float | None) -> int | float | None:
    """
    Render a number the way JavaScript does.

    JS has a single Number type, so `${rentSharePct}` in score.js prints "120"
    for a whole value and "33.3" for a decimal one. A Python float always keeps
    its trailing ".0", so the port used to emit "Rent is 120.0% of your weekly
    income" and serialise rentSharePct as 120.0 — visibly different from the
    client copy and different in the stored JSON. Returning an int for whole
    values fixes both; genuine decimals pass through untouched (33.3 -> 33.3)
    and None stays None.
    """
    if value is None:
        return None
    return int(value) if float(value).is_integer() else value


def score_affordability(weekly_income: float, weekly_rent: float) -> dict:
    if weekly_income <= 0 or weekly_rent <= 0:
        return {"points": 0, "rent_share_pct": None,
                "detail": "Weekly income not stated"}
    rent_share_pct = round1(weekly_rent / weekly_income * 100)
    if rent_share_pct <= 25:
        points = 35
    elif rent_share_pct <= 30:
        points = 30
    elif rent_share_pct <= 35:
        points = 20
    elif rent_share_pct <= 40:
        points = 12
    elif rent_share_pct <= 50:
        points = 5
    else:
        points = 0
    share = js_number(rent_share_pct)
    return {
        "points": points,
        "rent_share_pct": share,
        "detail": f"Rent is {share}% of your weekly income",
    }


def score_employment(assessment: dict) -> dict:
    status = assessment.get("employment_status")
    type_points = EMPLOYMENT_POINTS.get(status, 0)
    is_working = status != "not-working"
    tenure_points = TENURE_POINTS.get(assessment.get("job_tenure"), 0) if is_working else 0
    employment_label = EMPLOYMENT_LABELS.get(status) or "Employment not stated"
    tenure_label = JOB_TENURE_LABELS.get(assessment.get("job_tenure"), "") if is_working else ""
    detail = (
        f"{employment_label}, {tenure_label.lower()} in the job"
        if tenure_label
        else employment_label
    )
    return {"points": type_points + tenure_points, "detail": detail}


def score_history(rental_history: str | None) -> dict:
    return {
        "points": HISTORY_POINTS.get(rental_history, 0),
        "detail": HISTORY_DETAILS.get(rental_history, "Rental history not stated"),
    }


def score_references(reference: str | None) -> dict:
    return {
        "points": REFERENCE_POINTS.get(reference, 0),
        "detail": REFERENCE_DETAILS.get(reference, "Reference not stated"),
    }


def score_savings(savings: float, weekly_rent: float) -> dict:
    if weekly_rent <= 0:
        return {"points": 0, "weeks_covered": None, "detail": "Savings not scored yet"}
    weeks_covered = round1(savings / weekly_rent)
    if weeks_covered >= 12:
        points = 20
    elif weeks_covered >= 8:
        points = 14
    elif weeks_covered >= 4:
        points = 7
    else:
        points = 0
    weeks = js_number(weeks_covered)
    return {
        "points": points,
        "weeks_covered": weeks,
        "detail": f"Savings cover {weeks} weeks of rent",
    }


def evaluate_caps(rent_share_pct: float | None, weeks_covered: float | None) -> list[dict]:
    """Agent-style hard limits; each carries the reason shown on the result."""
    caps = []
    if rent_share_pct is not None and rent_share_pct > 50:
        caps.append({
            "cap": 40,
            "reason": "Most agents decline applications where rent is more than half of income.",
        })
    if weeks_covered is not None and weeks_covered < 4:
        caps.append({
            "cap": 50,
            "reason": "Most agents want to see at least four weeks of rent in savings "
                      "for bond and upfront costs.",
        })
    return caps


def build_tips(factors: list[dict], assessment: dict,
               weeks_covered: float | None) -> list[str]:
    """Up to three personalised tips, weakest factors first (same as score.js)."""

    def tip_for(factor: dict) -> str:
        factor_id = factor["id"]
        if factor_id == "affordability":
            return (f"Looking at homes closer to 30% of your income could add up to "
                    f"{factor['max'] - factor['points']} points.")
        if factor_id == "employment":
            if assessment.get("employment_status") == "not-working":
                return ("Any regular income helps — even casual shifts count toward "
                        "affordability.")
            if assessment.get("job_tenure") == "under-3-months":
                return ("Payslips or a contract showing your role is ongoing can settle "
                        "concerns about a new job.")
            return "Longer time in the job and steadier work build this factor over time."
        if factor_id == "history":
            if assessment.get("rental_history") == "first-time":
                return ("As a first-time renter, a strong reference carries extra weight — "
                        "line one up before you apply.")
            return ("Ask a past property manager for a written reference — it strengthens "
                    "this factor.")
        if factor_id == "references":
            if assessment.get("reference") == "none":
                return ("Even one written reference — an employer or past landlord — "
                        "lifts this straight away.")
            if assessment.get("reference") == "personal":
                return ("A landlord or employer reference is worth more than a personal one "
                        "if you can get one.")
            return ("A reference from a previous landlord or agent would score higher if "
                    "you can arrange one.")
        # savings
        if weeks_covered is not None and weeks_covered < 4:
            return "Getting past four weeks of rent in savings also removes the savings cap."
        return "Eight or more weeks of rent in savings strengthens your buffer."

    weakest = sorted(
        (factor for factor in factors if factor["points"] < factor["max"]),
        key=lambda factor: factor["points"] / factor["max"],
    )[:3]
    return [tip_for(factor) for factor in weakest]


def calculate_likelihood(
    finances: dict,
    assessment: dict | None = None,
    extras: dict | None = None,
) -> dict:
    """
    Port of score.js calculateLikelihood().

    finances:  {"weeklyIncome": ..., "weeklyRent": ..., "savings": ...} (str|int ok)
    assessment: {"employmentStatus", "jobTenure", "rentalHistory", "reference"}
    extras:    {"extraSavings", "extraIncome"} — what-if overrides, never persisted

    Returns the same dict shape as the JS version (camelCase keys) so the
    Result screen and stored JSON need no translation.
    """
    assessment = assessment or {}
    extras = extras or {}

    weekly_income = _number(finances.get("weeklyIncome")) + _number(extras.get("extraIncome"))
    weekly_rent = _number(finances.get("weeklyRent"))
    savings = _number(finances.get("savings")) + _number(extras.get("extraSavings"))

    # Internally the sub-scorers read snake_case answers; the API layer keeps
    # camelCase at the edges, so normalise once here.
    snake_assessment = {
        "employment_status": assessment.get("employmentStatus") or assessment.get("employment_status"),
        "job_tenure": assessment.get("jobTenure") or assessment.get("job_tenure"),
        "rental_history": assessment.get("rentalHistory") or assessment.get("rental_history"),
        "reference": assessment.get("reference"),
    }

    affordability = score_affordability(weekly_income, weekly_rent)
    employment = score_employment(snake_assessment)
    history = score_history(snake_assessment["rental_history"])
    references = score_references(snake_assessment["reference"])
    savings_factor = score_savings(savings, weekly_rent)

    factors = [
        {"id": "affordability", "label": "Affordability", "max": 35,
         "points": affordability["points"], "detail": affordability["detail"]},
        {"id": "employment", "label": "Employment", "max": 20,
         "points": employment["points"], "detail": employment["detail"]},
        {"id": "history", "label": "Rental history", "max": 15,
         "points": history["points"], "detail": history["detail"]},
        {"id": "references", "label": "References", "max": 10,
         "points": references["points"], "detail": references["detail"]},
        {"id": "savings", "label": "Savings", "max": 20,
         "points": savings_factor["points"], "detail": savings_factor["detail"]},
    ]

    raw_score = math.floor(sum(f["points"] for f in factors) + 0.5)  # JS Math.round
    caps = evaluate_caps(affordability["rent_share_pct"], savings_factor["weeks_covered"])
    cap_limit = min(cap["cap"] for cap in caps) if caps else 100
    score = min(raw_score, cap_limit)

    if score >= 80:
        band = "High likelihood"
    elif score >= 60:
        band = "Moderate likelihood"
    elif score >= 40:
        band = "Fair likelihood"
    else:
        band = "Lower likelihood"

    return {
        "score": score,
        "rawScore": raw_score,
        "band": band,
        "outcome": "ready" if score >= 60 else "not-ready",
        "factors": factors,
        "caps": caps,
        "tips": build_tips(factors, snake_assessment, savings_factor["weeks_covered"]),
        "rentSharePct": affordability["rent_share_pct"],
        "weeksCovered": savings_factor["weeks_covered"],
    }
