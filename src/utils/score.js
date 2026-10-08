/**
 * score.js
 * The single, pure scoring model used by the Result screen and the What-if
 * card. Turns the renter's answers into a score out of 100, the five factor
 * contributions, any agent-style caps that applied, and personalised tips.
 * No React, DOM or storage involved, so it stays unit-testable.
 *
 * Five weighted factors (100 points):
 *  - Affordability  (35) - rent as a share of weekly income
 *  - Employment     (20) - type of work + time in the current job
 *  - Rental history (15) - length of renting track record
 *  - References     (10) - quality of the best available reference
 *  - Savings        (20) - weeks of rent covered
 *
 * Hard limits mirror real agents: rent over 50% of income caps the score at
 * 40; savings under four weeks of rent caps it at 50.
 */
import { EMPLOYMENT_OPTIONS, JOB_TENURE_OPTIONS, optionLabel } from '../data/options';

const EMPLOYMENT_POINTS = {
  'full-time': 14,
  'part-time': 10,
  'self-employed': 8,
  casual: 7,
  student: 5,
  'not-working': 0,
};

const TENURE_POINTS = {
  'over-12-months': 6,
  '3-12-months': 3,
  'under-3-months': 0,
};

const HISTORY_POINTS = {
  '3-plus-years': 15,
  '1-3-years': 12,
  'under-1-year': 8,
  'first-time': 5,
};

const HISTORY_DETAILS = {
  '3-plus-years': '3+ years of rental history',
  '1-3-years': '1 to 3 years of rental history',
  'under-1-year': 'Under a year of rental history',
  'first-time': 'First-time renter — no track record yet',
};

const REFERENCE_POINTS = {
  'landlord-agent': 10,
  employer: 6,
  personal: 4,
  none: 0,
};

const REFERENCE_DETAILS = {
  'landlord-agent': 'A previous landlord or agent reference',
  employer: 'An employer reference',
  personal: 'A personal reference only',
  none: 'No reference available yet',
};

/** Rounds to one decimal place so tier boundaries behave predictably. */
function round1(value) {
  return Math.round(value * 10) / 10;
}

function scoreAffordability(weeklyIncome, weeklyRent) {
  if (!weeklyIncome || weeklyIncome <= 0 || !weeklyRent || weeklyRent <= 0) {
    return { points: 0, rentSharePct: null, detail: 'Weekly income not stated' };
  }
  const rentSharePct = round1((weeklyRent / weeklyIncome) * 100);
  let points;
  if (rentSharePct <= 25) points = 35;
  else if (rentSharePct <= 30) points = 30;
  else if (rentSharePct <= 35) points = 20;
  else if (rentSharePct <= 40) points = 12;
  else if (rentSharePct <= 50) points = 5;
  else points = 0;
  return {
    points,
    rentSharePct,
    detail: `Rent is ${rentSharePct}% of your weekly income`,
  };
}

function scoreEmployment(assessment) {
  const typePoints = EMPLOYMENT_POINTS[assessment.employmentStatus] ?? 0;
  const isWorking = assessment.employmentStatus !== 'not-working';
  const tenurePoints = isWorking ? TENURE_POINTS[assessment.jobTenure] ?? 0 : 0;
  const employmentLabel =
    optionLabel(EMPLOYMENT_OPTIONS, assessment.employmentStatus) || 'Employment not stated';
  const tenureLabel = isWorking
    ? optionLabel(JOB_TENURE_OPTIONS, assessment.jobTenure)
    : '';
  return {
    points: typePoints + tenurePoints,
    detail: tenureLabel
      ? `${employmentLabel}, ${tenureLabel.toLowerCase()} in the job`
      : employmentLabel,
  };
}

function scoreHistory(rentalHistory) {
  return {
    points: HISTORY_POINTS[rentalHistory] ?? 0,
    detail: HISTORY_DETAILS[rentalHistory] ?? 'Rental history not stated',
  };
}

function scoreReferences(reference) {
  return {
    points: REFERENCE_POINTS[reference] ?? 0,
    detail: REFERENCE_DETAILS[reference] ?? 'Reference not stated',
  };
}

function scoreSavings(savings, weeklyRent) {
  if (!weeklyRent || weeklyRent <= 0) {
    return { points: 0, weeksCovered: null, detail: 'Savings not scored yet' };
  }
  const weeksCovered = round1(savings / weeklyRent);
  let points;
  if (weeksCovered >= 12) points = 20;
  else if (weeksCovered >= 8) points = 14;
  else if (weeksCovered >= 4) points = 7;
  else points = 0;
  return { points, weeksCovered, detail: `Savings cover ${weeksCovered} weeks of rent` };
}

/** Agent-style hard limits; each carries the reason shown on the result. */
function evaluateCaps(rentSharePct, weeksCovered) {
  const caps = [];
  if (rentSharePct !== null && rentSharePct > 50) {
    caps.push({
      cap: 40,
      reason: 'Most agents decline applications where rent is more than half of income.',
    });
  }
  if (weeksCovered !== null && weeksCovered < 4) {
    caps.push({
      cap: 50,
      reason:
        'Most agents want to see at least four weeks of rent in savings for bond and upfront costs.',
    });
  }
  return caps;
}

/** Up to three personalised tips, weakest factors first. */
function buildTips(factors, assessment, { weeksCovered }) {
  const tipsByFactor = {
    affordability: (factor) =>
      `Looking at homes closer to 30% of your income could add up to ${factor.max - factor.points} points.`,
    employment: () => {
      if (assessment.employmentStatus === 'not-working') {
        return 'Any regular income helps — even casual shifts count toward affordability.';
      }
      if (assessment.jobTenure === 'under-3-months') {
        return 'Payslips or a contract showing your role is ongoing can settle concerns about a new job.';
      }
      return 'Longer time in the job and steadier work build this factor over time.';
    },
    history: () =>
      assessment.rentalHistory === 'first-time'
        ? 'As a first-time renter, a strong reference carries extra weight — line one up before you apply.'
        : 'Ask a past property manager for a written reference — it strengthens this factor.',
    references: () => {
      if (assessment.reference === 'none') {
        return 'Even one written reference — an employer or past landlord — lifts this straight away.';
      }
      if (assessment.reference === 'personal') {
        return 'A landlord or employer reference is worth more than a personal one if you can get one.';
      }
      return 'A reference from a previous landlord or agent would score higher if you can arrange one.';
    },
    savings: () =>
      weeksCovered !== null && weeksCovered < 4
        ? 'Getting past four weeks of rent in savings also removes the savings cap.'
        : 'Eight or more weeks of rent in savings strengthens your buffer.',
  };

  const weakest = [...factors]
    .filter((factor) => factor.points < factor.max)
    .sort((a, b) => a.points / a.max - b.points / b.max)
    .slice(0, 3);

  return weakest.map((factor) => tipsByFactor[factor.id](factor));
}

/**
 * Calculates the approval likelihood.
 *
 * @param {{ weeklyIncome: string|number, weeklyRent: string|number, savings: string|number }} finances
 *        Weekly rent comes from the chosen sample home.
 * @param {{ employmentStatus: string, jobTenure: string, rentalHistory: string, reference: string }} [assessment]
 *        The About-you answers that feed the scored factors.
 * @param {{ extraSavings?: number, extraIncome?: number }} [extras]
 *        What-if overrides — added on top before scoring, never persisted.
 * @returns {{ score: number, rawScore: number, band: string,
 *             outcome: 'ready'|'not-ready',
 *             factors: {id: string, label: string, max: number, points: number, detail: string}[],
 *             caps: {cap: number, reason: string}[], tips: string[],
 *             rentSharePct: number|null, weeksCovered: number|null }}
 */
export function calculateLikelihood(finances, assessment = {}, extras = {}) {
  const weeklyIncome = (Number(finances.weeklyIncome) || 0) + (Number(extras.extraIncome) || 0);
  const weeklyRent = Number(finances.weeklyRent) || 0;
  const savings = (Number(finances.savings) || 0) + (Number(extras.extraSavings) || 0);

  const affordability = scoreAffordability(weeklyIncome, weeklyRent);
  const employment = scoreEmployment(assessment);
  const history = scoreHistory(assessment.rentalHistory);
  const references = scoreReferences(assessment.reference);
  const savingsFactor = scoreSavings(savings, weeklyRent);

  const factors = [
    { id: 'affordability', label: 'Affordability', max: 35, points: affordability.points, detail: affordability.detail },
    { id: 'employment', label: 'Employment', max: 20, points: employment.points, detail: employment.detail },
    { id: 'history', label: 'Rental history', max: 15, points: history.points, detail: history.detail },
    { id: 'references', label: 'References', max: 10, points: references.points, detail: references.detail },
    { id: 'savings', label: 'Savings', max: 20, points: savingsFactor.points, detail: savingsFactor.detail },
  ];

  const rawScore = Math.round(factors.reduce((total, factor) => total + factor.points, 0));
  const caps = evaluateCaps(affordability.rentSharePct, savingsFactor.weeksCovered);
  const capLimit = caps.length > 0 ? Math.min(...caps.map((cap) => cap.cap)) : 100;
  const score = Math.min(rawScore, capLimit);

  const band =
    score >= 80
      ? 'High likelihood'
      : score >= 60
        ? 'Moderate likelihood'
        : score >= 40
          ? 'Fair likelihood'
          : 'Lower likelihood';
  const outcome = score >= 60 ? 'ready' : 'not-ready';

  return {
    score,
    rawScore,
    band,
    outcome,
    factors,
    caps,
    tips: buildTips(factors, assessment, {
      rentSharePct: affordability.rentSharePct,
      weeksCovered: savingsFactor.weeksCovered,
    }),
    rentSharePct: affordability.rentSharePct,
    weeksCovered: savingsFactor.weeksCovered,
  };
}