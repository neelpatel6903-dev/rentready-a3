import { useState } from 'react';
import { Wallet } from 'lucide-react';
import InputField from '../components/InputField';
import FormSection from '../components/FormSection';
import Button from '../components/Button';
import ScreenShell from '../components/ScreenShell';
import { validateSavings, validateWeeklyIncome } from '../utils/validation';

/**
 * Finances
 * Screen 4 — "Your finances". Only the two numbers left to collect: weekly
 * household income and total savings. The weekly rent is not asked here —
 * it comes from the chosen sample home and is shown read-only with a
 * "Change home" escape hatch. Continue stays disabled until both fields
 * are valid.
 *
 * Props:
 * @param {{ weeklyIncome: string, savings: string }} data - owned by App.
 * @param {(name: string, value: string) => void} onChange - lifts field
 *        changes up to the parent's form state.
 * @param {{ suburb: string, type: string, bedrooms: number, weeklyRent: number }} selectedHome
 *        The home chosen on the previous screen.
 * @param {() => void} onNext - advances to the checking screen (then Result).
 * @param {() => void} onBack - returns to Choose a home.
 * @param {() => void} onChangeHome - jumps back to Choose a home keeping
 *        everything already entered.
 */
export default function Finances({
  data,
  onChange,
  selectedHome,
  onNext,
  onBack,
  onChangeHome,
}) {
  const [touched, setTouched] = useState({});

  const incomeError = touched.weeklyIncome ? validateWeeklyIncome(data.weeklyIncome) : null;
  const savingsError = touched.savings ? validateSavings(data.savings) : null;
  const isValid =
    validateWeeklyIncome(data.weeklyIncome) === null &&
    validateSavings(data.savings) === null;

  // Live affordability: rent as a share of the entered income. Neutral
  // until there is something to measure, green ≤30%, amber ≤40%, red above.
  const weeklyRent = selectedHome ? Number(selectedHome.weeklyRent) : 0;
  const weeklyIncome = Number(data.weeklyIncome) || 0;
  const rentSharePct =
    weeklyIncome > 0 ? Math.round((weeklyRent / weeklyIncome) * 1000) / 10 : null;
  const affordabilityTone =
    rentSharePct === null
      ? null
      : rentSharePct <= 30
        ? 'bg-emerald-500'
        : rentSharePct <= 40
          ? 'bg-amber-500'
          : 'bg-red-500';
  const affordabilityText =
    rentSharePct === null
      ? 'Enter your income to see affordability.'
      : rentSharePct <= 30
        ? `${rentSharePct}% of your income — comfortably affordable.`
        : rentSharePct <= 40
          ? `${rentSharePct}% of your income — a bit high, but sometimes workable.`
          : `${rentSharePct}% of your income — most agents would be cautious.`;

  return (
    <ScreenShell
      progress={2}
      footer="Your answers are used to score this check and saved to your account."
    >
      <div
        onBlur={(event) => {
          const name = event.target.name;
          if (name) setTouched((prev) => ({ ...prev, [name]: true }));
        }}
      >
        <div className="mb-5">
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Your finances</h1>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
            Two numbers — the rent is already set by the home you chose.
          </p>
        </div>

        {selectedHome && (
          <FormSection
            icon={Wallet}
            title="Your chosen home"
            description="Its rent is used for every affordability check."
          >
            <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200">
              <div className="min-w-0 flex-1">
                <p className="text-base font-semibold text-slate-900">
                  ${selectedHome.weeklyRent}
                  <span className="text-sm font-medium text-slate-500"> per week</span>
                </p>
                <p className="text-xs text-slate-500">
                  {selectedHome.suburb} · {selectedHome.type} · {selectedHome.bedrooms} bed
                  {selectedHome.bedrooms === 1 ? '' : 's'}
                </p>
              </div>
              <Button
                label="Change home"
                onClick={onChangeHome}
                variant="ghost"
                fullWidth={false}
                className="shrink-0"
              />
            </div>
          </FormSection>
        )}

        <FormSection
          icon={Wallet}
          title="Income & savings"
          description="The last two numbers we need."
        >
          <div>
            <InputField
              label="Weekly household income ($)"
              name="weeklyIncome"
              type="number"
              value={data.weeklyIncome}
              onChange={onChange}
              error={incomeError}
              placeholder="e.g. 900"
            />
            <div className="mt-2">
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                {rentSharePct !== null && (
                  <div
                    className={`h-full rounded-full transition-all duration-200 ${affordabilityTone}`}
                    style={{ width: `${Math.min(rentSharePct, 100)}%` }}
                    role="progressbar"
                    aria-valuenow={rentSharePct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="Rent as a percentage of your income"
                  />
                )}
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
                {affordabilityText} Agents often look for rent under 30% of income.
              </p>
            </div>
          </div>

          <InputField
            label="Total savings ($)"
            name="savings"
            type="number"
            value={data.savings}
            onChange={onChange}
            error={savingsError}
            placeholder="e.g. 2400"
          />
          <p className="text-xs leading-relaxed text-slate-500">
            Why we ask: bond plus a few weeks of upfront rent is expected before you move
            in.
          </p>
        </FormSection>

        <div className="mt-8 flex gap-3">
          <Button label="Back" onClick={onBack} variant="secondary" className="flex-1" />
          <Button
            label="Check my score"
            onClick={() => isValid && onNext()}
            variant="primary"
            disabled={!isValid}
            className="flex-[2]"
          />
        </div>
      </div>
    </ScreenShell>
  );
}