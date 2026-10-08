import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import Button from './Button';
import FormSection from './FormSection';
import { calculateLikelihood } from '../utils/score';

/**
 * WhatIfCard
 * "What if?" exploration for the Result screen: two sliders — extra savings
 * and extra weekly income — that recalculate the score live by calling the
 * exact same pure scoring function the real result uses. Purely
 * exploratory: the renter's actual answers are never changed.
 *
 * Props:
 * @param {{ weeklyIncome: string|number, weeklyRent: string|number, savings: string|number }} finances
 *        The same finances object the base score was calculated from.
 * @param {{ employmentStatus: string, jobTenure: string, rentalHistory: string, reference: string }} assessment
 * @param {number} baseScore   - The official score shown by the gauge.
 * @param {boolean} [baseCapped=false] - Whether the official score was
 *        capped, so the card can celebrate when a slider lifts it.
 */
export default function WhatIfCard({ finances, assessment, baseScore, baseCapped = false }) {
  const [extraSavings, setExtraSavings] = useState(0);
  const [extraIncome, setExtraIncome] = useState(0);

  const changed = extraSavings > 0 || extraIncome > 0;
  const whatIf = calculateLikelihood(finances, assessment, { extraSavings, extraIncome });
  const delta = whatIf.score - baseScore;

  return (
    <FormSection
      icon={Sparkles}
      title="What if?"
      description="Drag to explore — your application stays exactly as entered."
    >
      <div>
        <div className="flex items-baseline justify-between">
          <label htmlFor="whatif-savings" className="text-sm font-medium text-slate-700">
            Extra savings
          </label>
          <span className="text-sm font-semibold text-slate-900">
            ${extraSavings.toLocaleString('en-AU')}
          </span>
        </div>
        <input
          id="whatif-savings"
          type="range"
          min="0"
          max="10000"
          step="500"
          value={extraSavings}
          onChange={(event) => setExtraSavings(Number(event.target.value))}
          className="mt-1.5 w-full accent-teal-600"
          aria-label="Extra savings to explore"
        />
      </div>

      <div>
        <div className="flex items-baseline justify-between">
          <label htmlFor="whatif-income" className="text-sm font-medium text-slate-700">
            Extra weekly income
          </label>
          <span className="text-sm font-semibold text-slate-900">
            ${extraIncome.toLocaleString('en-AU')}/wk
          </span>
        </div>
        <input
          id="whatif-income"
          type="range"
          min="0"
          max="500"
          step="50"
          value={extraIncome}
          onChange={(event) => setExtraIncome(Number(event.target.value))}
          className="mt-1.5 w-full accent-teal-600"
          aria-label="Extra weekly income to explore"
        />
      </div>

      {changed ? (
        <div className="rounded-xl bg-slate-50 p-4 text-center ring-1 ring-slate-200">
          <p className="text-sm text-slate-500">With those changes your score would be</p>
          <p className="mt-1 text-3xl font-extrabold text-slate-900">
            {whatIf.score}
            <span className="text-base font-bold text-slate-400">/100</span>
          </p>
          <p
            className={`mt-1 text-sm font-semibold ${
              delta > 0 ? 'text-emerald-600' : 'text-slate-500'
            }`}
          >
            {delta > 0 ? `+${delta} points` : 'no change'}
          </p>
          {whatIf.caps.length > 0 ? (
            <p className="mt-2 text-xs leading-relaxed text-amber-700">
              {whatIf.caps[0].reason}
            </p>
          ) : (
            baseCapped && (
              <p className="mt-2 text-xs font-medium text-emerald-600">
                The cap no longer applies at this level.
              </p>
            )
          )}
        </div>
      ) : (
        <p className="text-sm leading-relaxed text-slate-500">
          Drag a slider to see how extra savings or income would change your score.
        </p>
      )}

      {changed && (
        <div className="flex justify-center">
          <Button
            label="Reset"
            onClick={() => {
              setExtraSavings(0);
              setExtraIncome(0);
            }}
            variant="secondary"
            fullWidth={false}
          />
        </div>
      )}
    </FormSection>
  );
}