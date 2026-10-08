import { Check } from 'lucide-react';

// The counted steps of the flow. Login sits before them and the result is
// the outcome, so the stepper only appears on the three entry screens.
const STEPS = ['About you', 'Choose a home', 'Your finances', 'Result'];

/**
 * Stepper
 * A reusable progress indicator shown at the top of the application card on
 * each entry screen. It renders the flow steps (About you → Choose a home →
 * Your finances → Result) as numbered circles joined by connector lines,
 * with a label under each: completed steps show a tick, the current step is
 * highlighted in teal, and upcoming steps stay muted — so users always know
 * where they are and how much of the flow is left.
 *
 * Props:
 * @param {number} current         - Zero-based index of the active step (0-3).
 * @param {string[]} [steps=STEPS] - Step labels, in flow order.
 * @param {string} [className]     - Optional extra classes for the root.
 */
export default function Stepper({ current, steps = STEPS, className = '' }) {
  return (
    <ol
      className={`mb-4 flex items-start ${className}`}
      aria-label={`Application progress: step ${current + 1} of ${steps.length}, ${steps[current]}`}
    >
      {steps.map((label, index) => {
        const isDone = index < current;
        const isCurrent = index === current;

        return (
          <li
            key={label}
            aria-current={isCurrent ? 'step' : undefined}
            className="flex flex-1 items-start last:flex-none"
          >
            <div className="flex flex-col items-center gap-1.5">
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold transition-colors duration-150 ${
                  isDone
                    ? 'border-teal-600 bg-teal-600 text-white'
                    : isCurrent
                      ? 'border-2 border-teal-600 bg-teal-50 text-teal-700'
                      : 'border-slate-300 bg-white text-slate-500'
                }`}
              >
                {isDone ? <Check className="h-4 w-4" aria-hidden="true" /> : index + 1}
              </span>
              <span
                className={`text-[11px] leading-none ${
                  isCurrent
                    ? 'font-semibold text-teal-700'
                    : isDone
                      ? 'font-medium text-teal-700'
                      : 'font-medium text-slate-500'
                }`}
              >
                {label}
              </span>
            </div>

            {index < steps.length - 1 && (
              <span
                aria-hidden="true"
                className={`mx-1.5 mt-[15px] h-0.5 flex-1 rounded-full ${
                  isDone ? 'bg-teal-600' : 'bg-slate-200'
                }`}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}