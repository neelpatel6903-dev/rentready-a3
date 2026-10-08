import { Home } from 'lucide-react';
import Stepper from './Stepper';

// The counted steps of the flow. Login sits before them and the result is
// the outcome, so the header pill only shows on the three entry screens.
const PROGRESS_STEPS = ['About you', 'Choose a home', 'Your finances', 'Result'];

/**
 * ScreenShell
 * Shared page frame used by every screen so the whole application looks and
 * feels consistent: a soft, centred page background; the RentReady logo
 * header; a white application card containing the progress stepper and the
 * screen content; and an optional reassurance footer. Screens outside the
 * counted flow show the wordmark header only. Purely presentational — it
 * owns no state and changes no behaviour.
 *
 * Props:
 * @param {number|null} progress - Zero-based index of the current step in
 *        the counted flow (0=About you, 1=Choose a home, 2=Your finances).
 *        Pass null for screens outside the flow (Login, Result, the
 *        checking screen) to hide the stepper and the step counter.
 * @param {React.ReactNode} children - The screen content rendered inside the
 *        application card, below the stepper.
 * @param {string} [footer]          - Optional one-line note rendered under
 *        the card (e.g. privacy or demo reassurance).
 */
export default function ScreenShell({ progress = null, children, footer }) {
  const inProgressFlow = progress !== null;

  return (
    <div className="min-h-screen bg-linear-to-b from-slate-50 via-slate-100 to-slate-200 px-4 py-6 sm:py-10">
      <div className="mx-auto w-full max-w-md">
        <header
          className={`mb-5 flex items-center gap-3 ${inProgressFlow ? 'justify-between' : 'justify-center'}`}
        >
          <span className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-teal-500 to-teal-700 shadow-lg shadow-teal-600/30">
              <Home className="h-5 w-5 text-white" aria-hidden="true" />
            </span>
            <span className="text-left">
              <span className="block text-xl font-extrabold leading-tight tracking-tight text-slate-900">
                Rent<span className="text-teal-600">Ready</span>
              </span>
              <span className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                Rental readiness check
              </span>
            </span>
          </span>

          {inProgressFlow && (
            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-teal-700 ring-1 ring-slate-200">
              Step {progress + 1} of {PROGRESS_STEPS.length}
            </span>
          )}
        </header>

        <main className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xl shadow-slate-900/5 motion-safe:animate-[fade-up_250ms_ease-out] sm:p-8">
          {inProgressFlow && <Stepper current={progress} />}
          {children}
        </main>

        {footer && (
          <footer className="mt-5 px-2 text-center text-xs leading-relaxed text-slate-500">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}