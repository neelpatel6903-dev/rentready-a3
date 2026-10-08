"""
tests/test_scoring.py
Parity tests: the Python scoring port must produce byte-identical results
to src/utils/score.js for the shared fixture cases.

Run: node scripts/score_fixture.js > scripts/score_fixture.json   (once)
     .venv/Scripts/python.exe -m pytest tests/ -q
"""
import json
import pathlib
import sys

import pytest

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from api._lib.scoring import calculate_likelihood  # noqa: E402

FIXTURE_JSON = ROOT / "scripts" / "score_fixture.json"

# Fixture definitions mirror scripts/score_fixture.js — keep in sync.
FINANCES_AND_ASSESSMENTS = [
    (
        {"weeklyIncome": 900, "weeklyRent": 420, "savings": 6000},
        {"employmentStatus": "full-time", "jobTenure": "over-12-months",
         "rentalHistory": "3-plus-years", "reference": "landlord-agent"},
    ),
    (
        {"weeklyIncome": 400, "weeklyRent": 480, "savings": 800},
        {"employmentStatus": "casual", "jobTenure": "under-3-months",
         "rentalHistory": "first-time", "reference": "none"},
    ),
    (
        {"weeklyIncome": 550, "weeklyRent": 350, "savings": 2000},
        {"employmentStatus": "student", "jobTenure": "",
         "rentalHistory": "1-3-years", "reference": "personal"},
    ),
    (
        {"weeklyIncome": 300, "weeklyRent": 310, "savings": 10000},
        {"employmentStatus": "not-working", "jobTenure": "",
         "rentalHistory": "under-1-year", "reference": "employer"},
    ),
    (
        {"weeklyIncome": 1000, "weeklyRent": 400, "savings": 1600},
        {"employmentStatus": "part-time", "jobTenure": "3-12-months",
         "rentalHistory": "under-1-year", "reference": "personal"},
    ),
]


def test_python_matches_javascript_fixtures():
    if not FIXTURE_JSON.exists():
        pytest.skip("run: node scripts/score_fixture.js > scripts/score_fixture.json")
    expected = json.loads(FIXTURE_JSON.read_text(encoding="utf-8"))
    for case, (finances, assessment) in zip(expected, FINANCES_AND_ASSESSMENTS):
        actual = calculate_likelihood(finances, assessment)
        assert actual == case["result"], (
            f"fixture '{case['name']}' diverged:\n  js: {case['result']}\n  py: {actual}"
        )


def test_round1_is_half_up_not_bankers():
    from api._lib.scoring import round1

    assert round1(2.25) == 2.3  # Python's round() would give 2.2
    assert round1(0.05) == 0.1
    assert round1(41.64999) == 41.6


def test_caps_apply():
    # Rent > 50% of income → cap 40 even though raw score is higher.
    result = calculate_likelihood(
        {"weeklyIncome": 400, "weeklyRent": 480, "savings": 6000},
        {"employmentStatus": "full-time", "jobTenure": "over-12-months",
         "rentalHistory": "3-plus-years", "reference": "landlord-agent"},
    )
    assert result["rawScore"] > 40
    assert result["score"] == 40
    assert any(cap["cap"] == 40 for cap in result["caps"])


def test_savings_cap():
    # Savings < 4 weeks of rent → cap 50.
    result = calculate_likelihood(
        {"weeklyIncome": 2000, "weeklyRent": 400, "savings": 500},
        {"employmentStatus": "full-time", "jobTenure": "over-12-months",
         "rentalHistory": "3-plus-years", "reference": "landlord-agent"},
    )
    assert result["score"] == 50
    assert any(cap["cap"] == 50 for cap in result["caps"])


def test_band_thresholds():
    def band_for(income, rent, savings):
        return calculate_likelihood(
            {"weeklyIncome": income, "weeklyRent": rent, "savings": savings},
            {"employmentStatus": "full-time", "jobTenure": "over-12-months",
             "rentalHistory": "3-plus-years", "reference": "landlord-agent"},
        )["band"]

    assert band_for(1680, 420, 10000) == "High likelihood"
    assert band_for(400, 420, 10000) == "Lower likelihood"