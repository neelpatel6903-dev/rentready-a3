import { useEffect, useState } from 'react';
import { Check, LoaderCircle } from 'lucide-react';
import FormSection from './FormSection';
import ScreenShell from './ScreenShell';

const CHECK_STEPS = [
  'Reviewing your details…',
  'Checking affordability…',
  'Calculating your score…',
];

/**
 * CheckingScreen
 * A brief "we're working on it" moment shown after the finances screen,
 * with three short steps that tick off in sequence before the result
 * appears. Purely cosmetic — the score is already computed; this just
 * gives the result a believable arrival. Auto-advances after 1.5 seconds.
 * (Reduced-motion users skip this screen entirely — handled in App.)
 *
 * Props:
 * @param {() => void} onNext - Called once, after 1.5 seconds, to reveal
 *        the result. Must be stable across renders for the timer to fire
 *        exactly once.
 */
export default function CheckingScreen({ onNext }) {
  const [stage, setStage] = useState(0);

  // Deliberately runs once per mount; StrictMode's double mount is safe
  // because every timer is cleared on cleanup.
  useEffect(() => {
    const stageTimers = [
      setTimeout(() => setStage(1), 500),
      setTimeout(() => setStage(2), 1000),
    ];
    const finishTimer = setTimeout(onNext, 1500);
    return () => {
      stageTimers.forEach(clearTimeout);
      clearTimeout(finishTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ScreenShell progress={null}>
      <FormSection
        title="Checking your application"
        description="One moment — this only takes a second."
      >
        <ol className="space-y-3">
          {CHECK_STEPS.map((label, index) => {
            const isDone = index < stage;
            const isActive = index === stage;
            return (
              <li key={label} className="flex items-center gap-3">
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${
                    isDone
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-600'
                      : isActive
                        ? 'border-teal-500 bg-teal-50 text-teal-600'
                        : 'border-slate-200 bg-white text-slate-400'
                  }`}
                >
                  {isDone ? (
                    <Check className="h-4 w-4" aria-hidden="true" />
                  ) : isActive ? (
                    <LoaderCircle
                      className="h-4 w-4 motion-safe:animate-spin"
                      aria-hidden="true"
                    />
                  ) : (
                    <span className="text-xs font-semibold">{index + 1}</span>
                  )}
                </span>
                <span
                  className={`text-sm ${
                    isDone
                      ? 'text-slate-500'
                      : isActive
                        ? 'font-medium text-slate-900'
                        : 'text-slate-400'
                  }`}
                >
                  {label}
                </span>
              </li>
            );
          })}
        </ol>
      </FormSection>
    </ScreenShell>
  );
}