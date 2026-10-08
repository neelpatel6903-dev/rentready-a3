import { useEffect, useRef, useState } from 'react';
import { AlertCircle, Check, LoaderCircle } from 'lucide-react';
import Button from './Button';
import FormSection from './FormSection';
import ScreenShell from './ScreenShell';

const CHECK_STEPS = [
  'Reviewing your details…',
  'Checking affordability…',
  'Calculating your score…',
];

/**
 * CheckingScreen
 * The real pause between Your finances and the result: it runs the
 * cosmetic stage list while awaiting onCheck() — the App's memoised
 * POST /api/assessments — and advances only once BOTH the shortest
 * display time and the server response are done. On failure it shows the
 * error with Retry (re-posts) and Back (fix answers).
 *
 * Props:
 * @param {() => Promise<any>} onCheck - Performs/submits the check.
 *        Memoised by App, so a retry after failure re-posts safely and
 *        StrictMode double-mounts can never create duplicate rows.
 * @param {() => void} onSuccess - Advances to Result once saved.
 * @param {() => void} onBack - Returns to Your finances.
 * @param {boolean} reduceMotion - Shortens the cosmetic pause to 150ms.
 */
export default function CheckingScreen({ onCheck, onSuccess, onBack, reduceMotion = false }) {
  const [stage, setStage] = useState(0);
  const [error, setError] = useState(null);
  const [attempt, setAttempt] = useState(0);

  // Keep the latest callbacks stable for the attempt effect without
  // re-triggering it on parent re-renders.
  const onSuccessRef = useRef(onSuccess);
  const onCheckRef = useRef(onCheck);
  onSuccessRef.current = onSuccess;
  onCheckRef.current = onCheck;

  const minDisplayMs = reduceMotion ? 150 : 1500;
  const stageMs = reduceMotion ? 0 : 500;

  useEffect(() => {
    let cancelled = false;
    let requestSettled = false;
    let timerElapsed = false;
    let saved = null;
    let failure = null;
    setStage(0);
    setError(null);

    const advanceIfReady = () => {
      if (cancelled || !requestSettled || !timerElapsed) return;
      if (failure) setError(failure);
      else onSuccessRef.current(saved);
    };

    const startedAt = performance.now();
    const stageTimers = [
      stageMs > 0 && setTimeout(() => setStage(1), stageMs),
      stageMs > 0 && setTimeout(() => setStage(2), stageMs * 2),
    ].filter(Boolean);
    const finishTimer = setTimeout(() => {
      timerElapsed = true;
      advanceIfReady();
    }, minDisplayMs);

    onCheckRef
      .current()
      .then((result) => {
        saved = result;
        if (!cancelled) setStage(2);
      })
      .catch((err) => {
        failure = err;
      })
      .finally(() => {
        if (cancelled) return;
        requestSettled = true;
        // Never reveal the result before the cosmetic pause finishes.
        const remaining = minDisplayMs - (performance.now() - startedAt);
        if (remaining > 0) setTimeout(advanceIfReady, remaining);
        else advanceIfReady();
      });

    return () => {
      cancelled = true;
      stageTimers.forEach(clearTimeout);
      clearTimeout(finishTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  if (error) {
    return (
      <ScreenShell progress={null} footer="Nothing was saved — your answers are still here.">
        <FormSection
          title="We couldn't save your check"
          description="Your answers are untouched — try again."
        >
          <div
            role="alert"
            className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3"
          >
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" aria-hidden="true" />
            <p className="text-sm leading-relaxed text-red-700">{error.message}</p>
          </div>
          <div className="mt-4 flex gap-3">
            <Button label="Back" onClick={onBack} variant="secondary" className="flex-1" />
            <Button
              label="Try again"
              onClick={() => setAttempt((prev) => prev + 1)}
              variant="primary"
              className="flex-[2]"
            />
          </div>
        </FormSection>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell progress={null}>
      <FormSection
        title="Checking your application"
        description="One moment — we're calculating and saving your score."
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