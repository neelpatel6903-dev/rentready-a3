import { useEffect, useState } from 'react';
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Home,
  Lightbulb,
  TrendingUp,
} from 'lucide-react';
import { calculateLikelihood } from '../utils/score';
import Button from '../components/Button';
import FormSection from '../components/FormSection';
import ScreenShell from '../components/ScreenShell';
import WhatIfCard from '../components/WhatIfCard';
import { formatAU, parseISODate } from '../utils/dates';
import { optionLabel, EMPLOYMENT_OPTIONS, JOB_TENURE_OPTIONS, RENTAL_HISTORY_OPTIONS, REFERENCE_OPTIONS } from '../data/options';

// Accent styling per likelihood band. Full class names are written out as
// literals so Tailwind can see and generate every one of them.
const BAND_ACCENT = {
  'High likelihood': {
    fill: 'bg-emerald-500',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  'Moderate likelihood': {
    fill: 'bg-teal-500',
    badge: 'bg-teal-50 text-teal-700 border-teal-200',
  },
  'Fair likelihood': {
    fill: 'bg-amber-500',
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  'Lower likelihood': {
    fill: 'bg-orange-500',
    badge: 'bg-orange-50 text-orange-700 border-orange-200',
  },
};

const CHECKLIST_ITEMS = [
  { id: 'id', label: '100 points of ID' },
  { id: 'payslips', label: 'Your last three payslips' },
  { id: 'ledger', label: 'Rental ledger or previous lease' },
  { id: 'references', label: 'Two references' },
];

const GAUGE_SIZE = 168;
const GAUGE_RADIUS = 68;
const GAUGE_CIRCUMFERENCE = 2 * Math.PI * GAUGE_RADIUS;

function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/** Counts up to the target with an ease-out; static under reduced motion. */
function useAnimatedNumber(target, duration = 700) {
  const [animated, setAnimated] = useState(0);

  useEffect(() => {
    if (prefersReducedMotion()) return; // render path shows target directly
    let frame;
    const start = performance.now();
    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimated(Math.round(target * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  // Under reduced motion the value is derived during render, so the effect
  // never needs to set state.
  return prefersReducedMotion() ? target : animated;
}

/** Formats a stored string value as Australian dollars for the summary. */
function formatCurrency(value) {
  const amount = Number(value);
  return Number.isFinite(amount) ? `$${amount.toLocaleString('en-AU')}` : '—';
}

/**
 * Result
 * Screen 5 — the outcome. Shows the score in an animated circular gauge,
 * how each of the five factors contributed (with its working), any
 * agent-style caps that applied, up to three personalised tips, the
 * move-in cost plan, and a read-only summary of everything entered. The
 * What-if card reuses the exact same scoring function to explore changes.
 *
 * Props:
 * @param {{ firstName: string, currentSuburb: string, moveInDate: string,
 *           employmentStatus: string, jobTenure: string,
 *           rentalHistory: string, reference: string }} about - About-you answers.
 * @param {{ weeklyIncome: string, savings: string }} finances - Finance answers.
 * @param {{ suburb: string, type: string, bedrooms: number, weeklyRent: number,
 *           availableFrom: string }|null} selectedHome - The chosen sample home.
 * @param {object|null} savedCheck - The server's saved result (POST
 *        /api/assessments response); preferred over local calculation so
 *        the gauge shows exactly what was stored. Falls back to the
 *        client-side model when absent.
 * @param {() => void} onApplyAnotherHome - Returns to Choose a home keeping
 *        everything already entered.
 * @param {() => void} onEditAbout - Returns to About you when something the
 *        result needs (e.g. the move-in date) is missing.
 * @param {() => void} onOpenChecks - Opens the My checks history screen.
 * @param {() => void} onRestart - Wipes local answers and returns to the
 *        start of the flow (the account and its saved checks stay).
 */
export default function Result({
  about,
  finances,
  selectedHome,
  savedCheck,
  onApplyAnotherHome,
  onEditAbout,
  onOpenChecks,
  onRestart,
}) {
  const assessment = {
    employmentStatus: about.employmentStatus,
    jobTenure: about.jobTenure,
    rentalHistory: about.rentalHistory,
    reference: about.reference,
  };
  const localResult = calculateLikelihood(
    {
      weeklyIncome: finances.weeklyIncome,
      weeklyRent: selectedHome ? selectedHome.weeklyRent : 0,
      savings: finances.savings,
    },
    assessment
  );
  // The server's stored score wins; the local model (parity-tested against
  // the Python port) is the fallback and feeds the What-if card below.
  const result = savedCheck
    ? {
        score: savedCheck.score,
        rawScore: savedCheck.rawScore,
        band: savedCheck.band,
        outcome: savedCheck.outcome,
        factors: savedCheck.factors,
        caps: savedCheck.caps,
        tips: savedCheck.tips,
      }
    : localResult;
  const { score, rawScore, band, outcome, factors, caps, tips } = result;
  const accent = BAND_ACCENT[band];
  const isReady = outcome === 'ready';

  const firstName = about.firstName?.trim() || 'there';
  const moveInDate = about.moveInDate ? parseISODate(about.moveInDate) : null;

  // Bond (4 weeks) plus first month's rent (~4.3 weeks) for the chosen home.
  const moveInCost = selectedHome ? Math.round((selectedHome.weeklyRent * 8.3) / 50) * 50 : 0;
  const animatedScore = useAnimatedNumber(score);
  const [tickedItems, setTickedItems] = useState({});

  // Safety net: the result screen never crashes on missing data. If a
  // required value is absent (e.g. the user lost their chosen home or the
  // move-in date), show a friendly message with a button back to the step
  // that needs fixing. Hooks above always run, so this stays hook-safe.
  const missingHome = !selectedHome;
  const missingMoveInDate = !about.moveInDate;

  if (missingHome || missingMoveInDate) {
    return (
      <ScreenShell
        progress={null}
        footer="This is an estimate, not a guarantee — the agent makes the final decision."
      >
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-600 ring-8 ring-amber-50">
            <AlertCircle className="h-7 w-7" aria-hidden="true" />
          </span>
          <h1 className="mt-4 text-xl font-bold tracking-tight text-slate-900">
            We're missing a detail or two
          </h1>
          <p className="mt-1.5 max-w-[42ch] text-sm leading-relaxed text-slate-500">
            {missingMoveInDate && missingHome
              ? 'Your move-in date is missing and no home is selected yet — both are quick to fix.'
              : missingMoveInDate
                ? 'Your move-in date is missing — add it and we can show availability and costs.'
                : 'No home is selected yet — pick one and we can calculate availability and costs.'}
          </p>
        </div>
        <Button
          label={missingMoveInDate ? 'Add your move-in date' : 'Choose a home'}
          onClick={missingMoveInDate ? onEditAbout : onApplyAnotherHome}
          variant="primary"
        />
      </ScreenShell>
    );
  }

  const summaryRows = [
    ['First name', firstName],
    ['Current suburb', about.currentSuburb || '—'],
    ['Move-in date', moveInDate ? formatAU(moveInDate) : '—'],
    [
      'Chosen home',
      selectedHome
        ? `${selectedHome.suburb} · ${selectedHome.type} · ${selectedHome.bedrooms} bed · $${selectedHome.weeklyRent}/wk`
        : '—',
    ],
    [
      'Employment',
      `${optionLabel(EMPLOYMENT_OPTIONS, about.employmentStatus) || '—'}${
        about.jobTenure
          ? ` · ${optionLabel(JOB_TENURE_OPTIONS, about.jobTenure).toLowerCase()} in job`
          : ''
      }`,
    ],
    ['Rental history', optionLabel(RENTAL_HISTORY_OPTIONS, about.rentalHistory) || '—'],
    ['Best reference', optionLabel(REFERENCE_OPTIONS, about.reference) || '—'],
    ['Weekly income', formatCurrency(finances.weeklyIncome)],
    ['Total savings', formatCurrency(finances.savings)],
  ];

  const renderSummaryRows = (rows) =>
    rows.map(([label, value]) => (
      <div key={label} className="flex items-baseline justify-between gap-4 py-2">
        <dt className="text-sm text-slate-500">{label}</dt>
        <dd className="text-right text-sm font-medium text-slate-900">{value}</dd>
      </div>
    ));

  return (
    <ScreenShell
      progress={null}
      footer="This is an estimate, not a guarantee — the agent makes the final decision."
    >
      {/* Outcome header */}
      <div className="mb-6 flex flex-col items-center text-center">
        <span
          className={`flex h-14 w-14 items-center justify-center rounded-full ring-8 ${
            isReady
              ? 'bg-emerald-100 text-emerald-600 ring-emerald-50'
              : 'bg-amber-100 text-amber-600 ring-amber-50'
          }`}
        >
          {isReady ? (
            <CheckCircle2 className="h-7 w-7" aria-hidden="true" />
          ) : (
            <Home className="h-7 w-7" aria-hidden="true" />
          )}
        </span>
        <h1 className="mt-4 text-xl font-bold tracking-tight text-slate-900">
          {isReady
            ? `You're application-ready, ${firstName}!`
            : `Not quite ready yet, ${firstName}`}
        </h1>
        <p className="mt-1.5 max-w-[42ch] text-sm leading-relaxed text-slate-500">
          {isReady
            ? 'Based on your details, agents would look favourably on this application.'
            : "Here's exactly what would strengthen your application."}
        </p>
      </div>

      {/* Score gauge */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
          Approval likelihood
        </p>
        <div
          className="relative mx-auto mt-3"
          style={{ width: GAUGE_SIZE, height: GAUGE_SIZE }}
        >
          <svg
            width={GAUGE_SIZE}
            height={GAUGE_SIZE}
            viewBox={`0 0 ${GAUGE_SIZE} ${GAUGE_SIZE}`}
            role="img"
            aria-label={`Score ${score} out of 100`}
          >
            <circle
              cx={GAUGE_SIZE / 2}
              cy={GAUGE_SIZE / 2}
              r={GAUGE_RADIUS}
              fill="none"
              stroke="#f1f5f9"
              strokeWidth="12"
            />
            <circle
              cx={GAUGE_SIZE / 2}
              cy={GAUGE_SIZE / 2}
              r={GAUGE_RADIUS}
              fill="none"
              stroke={isReady ? '#10b981' : '#f59e0b'}
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={GAUGE_CIRCUMFERENCE}
              strokeDashoffset={GAUGE_CIRCUMFERENCE * (1 - animatedScore / 100)}
              transform={`rotate(-90 ${GAUGE_SIZE / 2} ${GAUGE_SIZE / 2})`}
              style={{ transition: 'stroke-dashoffset 120ms linear' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-5xl font-extrabold tracking-tight text-slate-900">
              {animatedScore}
            </p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-slate-400">
              of 100
            </p>
          </div>
        </div>
        <p
          className={`mt-4 inline-flex items-center rounded-full border px-3.5 py-1 text-sm font-semibold ${accent.badge}`}
        >
          {band}
        </p>
      </div>

      {/* Agent-style caps */}
      {caps.length > 0 && (
        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <p className="text-sm font-semibold text-amber-800">Why this score is capped</p>
          <ul className="mt-2 space-y-1.5">
            {caps.map((cap) => (
              <li key={cap.reason} className="text-sm leading-relaxed text-amber-800">
                {cap.reason}
              </li>
            ))}
          </ul>
          {score < rawScore && (
            <p className="mt-2 text-xs font-medium text-amber-700">
              Raw total {rawScore}/100 — capped to {score}.
            </p>
          )}
        </div>
      )}

      {/* The five factor bars */}
      <FormSection
        icon={TrendingUp}
        title="How your score is worked out"
        description="The five things agents weigh, and your points for each."
      >
        <div className="space-y-4">
          {factors.map((factor) => {
            const ratio = factor.points / factor.max;
            const tone =
              ratio >= 0.7 ? 'bg-emerald-500' : ratio >= 0.4 ? 'bg-amber-500' : 'bg-red-400';
            return (
              <div key={factor.id}>
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm font-medium text-slate-700">{factor.label}</p>
                  <p className="text-sm font-semibold text-slate-900">
                    {factor.points}
                    <span className="text-slate-400">/{factor.max}</span>
                  </p>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full ${tone}`}
                    style={{ width: `${(factor.points / factor.max) * 100}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-slate-500">{factor.detail}</p>
              </div>
            );
          })}
        </div>
      </FormSection>

      {/* Personalised tips */}
      {tips.length > 0 && (
        <FormSection icon={Lightbulb} title="Ways to lift your score">
          <ul className="space-y-2.5">
            {tips.map((tip) => (
              <li key={tip} className="flex gap-2.5 text-sm leading-relaxed text-slate-600">
                <span
                  className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-500"
                  aria-hidden="true"
                />
                {tip}
              </li>
            ))}
          </ul>
        </FormSection>
      )}

      {/* What-if exploration — same scoring function, nothing persisted */}
      <WhatIfCard
        finances={{
          weeklyIncome: finances.weeklyIncome,
          weeklyRent: selectedHome ? selectedHome.weeklyRent : 0,
          savings: finances.savings,
        }}
        assessment={assessment}
        baseScore={score}
        baseCapped={caps.length > 0}
      />

      {/* Move-in costs & timing */}
      {selectedHome && (
        <FormSection
          icon={CalendarDays}
          title="Move-in costs & timing"
          description="Based on the home you chose."
        >
          {moveInDate && (
            <p className="text-sm leading-relaxed text-slate-600">
              {selectedHome.availableFrom <= about.moveInDate ? (
                <>
                  Good news — this home is available from{' '}
                  <strong className="font-semibold text-slate-900">
                    {formatAU(parseISODate(selectedHome.availableFrom))}
                  </strong>
                  , before your preferred move-in on{' '}
                  <strong className="font-semibold text-slate-900">{formatAU(moveInDate)}</strong>.
                </>
              ) : (
                <>
                  This home is available from{' '}
                  <strong className="font-semibold text-slate-900">
                    {formatAU(parseISODate(selectedHome.availableFrom))}
                  </strong>{' '}
                  — after your preferred move-in on{' '}
                  <strong className="font-semibold text-slate-900">{formatAU(moveInDate)}</strong>.
                  You may need a short-term option or a later start.
                </>
              )}
            </p>
          )}
          <div className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <p className="text-sm text-slate-600">
              Estimated move-in cost{' '}
              <span className="font-semibold text-slate-900">
                (about ${moveInCost.toLocaleString('en-AU')})
              </span>
            </p>
            {moveInDate && (
              <p className="mt-1 text-sm font-medium text-teal-700">
                You'll need about ${moveInCost.toLocaleString('en-AU')} by{' '}
                {formatAU(moveInDate)}.
              </p>
            )}
            <p className="mt-2 text-xs leading-relaxed text-slate-500">
              Bond (4 weeks) plus first month's rent, for this home. Plan to have your bond
              and first month's rent ready by{' '}
              {moveInDate ? formatAU(moveInDate) : 'your move-in date'}.
            </p>
          </div>
        </FormSection>
      )}

      {/* What to bring checklist */}
      <FormSection
        icon={ClipboardList}
        title="What to bring"
        description="Tick these off before you apply — ticks aren't saved."
      >
        <div className="space-y-2">
          {CHECKLIST_ITEMS.map((item) => (
            <label
              key={item.id}
              className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-slate-50"
            >
              <input
                type="checkbox"
                checked={Boolean(tickedItems[item.id])}
                onChange={(event) =>
                  setTickedItems((prev) => ({
                    ...prev,
                    [item.id]: event.target.checked,
                  }))
                }
                className="h-4 w-4 shrink-0 accent-teal-600"
              />
              <span className="text-sm text-slate-700">{item.label}</span>
            </label>
          ))}
        </div>
      </FormSection>

      {/* Application summary */}
      <FormSection icon={ClipboardList} title="Application summary">
        <dl className="divide-y divide-slate-100">{renderSummaryRows(summaryRows)}</dl>
      </FormSection>

      {/* Sticky call-to-action — stays on screen while the results scroll,
          so the main buttons are always reachable on small screens. */}
      <div className="sticky bottom-0 -mx-6 -mb-6 mt-6 space-y-3 rounded-b-3xl border-t border-slate-100 bg-white/95 px-6 py-4 backdrop-blur-sm sm:-mx-8 sm:-mb-8 sm:px-8">
        <Button label="Apply for another home" onClick={onApplyAnotherHome} variant="primary" />
        <div className="flex gap-3">
          <Button label="My checks" onClick={onOpenChecks} variant="secondary" className="flex-1" />
          <Button label="Clear my details" onClick={onRestart} variant="secondary" className="flex-1" />
        </div>
      </div>
    </ScreenShell>
  );
}
