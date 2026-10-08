import { useCallback, useEffect, useState } from 'react';
import { CalendarDays, Home, XCircle } from 'lucide-react';
import Button from '../components/Button';
import FormSection from '../components/FormSection';
import ScreenShell from '../components/ScreenShell';
import { api } from '../api/client';
import { formatAU, parseISODate } from '../utils/dates';

// Same accent palette as the Result gauge, keyed by band.
const BAND_BADGE = {
  'High likelihood': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Moderate likelihood': 'bg-teal-50 text-teal-700 border-teal-200',
  'Fair likelihood': 'bg-amber-50 text-amber-700 border-amber-200',
  'Lower likelihood': 'bg-orange-50 text-orange-700 border-orange-200',
};

/**
 * MyChecks
 * History screen: every check the signed-in user has saved, newest first.
 * Each row can be deleted individually (two-step confirm), and "Delete all
 * my data" removes the profile, every check and the account itself before
 * signing the user out. Data comes from GET /api/assessments — RLS scopes
 * the rows to the caller, so this list is always only their own.
 *
 * Props:
 * @param {() => void} onBack - Returns to Result (or About you).
 * @param {() => Promise<void>} onDeleteAll - DELETE /api/account/data + sign out.
 * @param {() => Promise<void>} onSignOut - Signs out without deleting.
 */
export default function MyChecks({ onBack, onDeleteAll, onSignOut }) {
  const [checks, setChecks] = useState(null); // null = still loading
  const [loadError, setLoadError] = useState(null);
  const [deletingId, setDeletingId] = useState(null); // row being removed
  const [confirmingId, setConfirmingId] = useState(null); // row awaiting confirm
  const [confirmAll, setConfirmAll] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const data = await api.get('/api/assessments');
      setChecks(data.checks);
    } catch (error) {
      setChecks([]);
      setLoadError(error.message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const deleteOne = async (id) => {
    setDeletingId(id);
    setActionError(null);
    try {
      await api.delete(`/api/assessments/${id}`);
      setChecks((prev) => (prev || []).filter((check) => check.id !== id));
    } catch (error) {
      setActionError(error.message);
    } finally {
      setDeletingId(null);
      setConfirmingId(null);
    }
  };

  const deleteEverything = async () => {
    setBusy(true);
    setActionError(null);
    try {
      await onDeleteAll(); // clears session state; App switches to Login
    } catch (error) {
      setActionError(error.message);
      setBusy(false);
      setConfirmAll(false);
    }
  };

  return (
    <ScreenShell
      progress={null}
      footer="Checks are stored with your account and visible only to you."
    >
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">My checks</h1>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
            Every readiness check you've run, newest first.
          </p>
        </div>
        <Button label="Back" onClick={onBack} variant="ghost" fullWidth={false} />
      </div>

      {actionError && (
        <p
          role="alert"
          className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-relaxed text-red-700"
        >
          {actionError}
        </p>
      )}

      {loadError && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm leading-relaxed text-amber-800">{loadError}</p>
          <Button label="Try again" onClick={load} variant="secondary" className="mt-3" />
        </div>
      )}

      {checks !== null && checks.length === 0 && !loadError && (
        <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm leading-relaxed text-slate-500">
          No checks yet — run one from the result screen and it'll show up here.
        </p>
      )}


      <div className="space-y-3">
        {(checks || []).map((check) => {
          const home = check.listing || {};
          const isConfirming = confirmingId === check.id;
          const isDeleting = deletingId === check.id;
          return (
            <div
              key={check.id}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-400">
                    <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                    {check.createdAt ? formatAU(parseISODate(check.createdAt.slice(0, 10))) : '—'}
                  </p>
                  <p className="mt-1 flex items-center gap-1.5 text-base font-semibold text-slate-900">
                    <Home className="h-4 w-4 text-teal-600" aria-hidden="true" />
                    {home.suburb || 'Unknown home'}
                    <span className="font-normal text-slate-500">
                      · ${home.weeklyRent ?? '—'}/wk
                    </span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-extrabold leading-none text-slate-900">
                    {check.score}
                  </p>
                  <span
                    className={`mt-1.5 inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                      BAND_BADGE[check.band] || 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}
                  >
                    {check.band}
                  </span>
                </div>
              </div>

              <div className="mt-3 border-t border-slate-100 pt-3">
                {isConfirming ? (
                  <div className="flex gap-2">
                    <Button
                      label={isDeleting ? 'Deleting…' : 'Yes, delete it'}
                      onClick={() => deleteOne(check.id)}
                      variant="primary"
                      disabled={isDeleting}
                      className="flex-1"
                    />
                    <Button
                      label="Keep it"
                      onClick={() => setConfirmingId(null)}
                      variant="secondary"
                      className="flex-1"
                    />
                  </div>
                ) : (
                  <Button
                    label="Delete this check"
                    onClick={() => setConfirmingId(check.id)}
                    variant="ghost"
                    fullWidth={false}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Danger zone — deletes everything, then signs out. */}
      <FormSection
        icon={XCircle}
        title="Delete all my data"
        description="Removes your profile, every saved check, and your account."
      >
        {confirmAll ? (
          <div className="flex gap-2">
            <Button
              label={busy ? 'Deleting…' : 'Yes, delete everything'}
              onClick={deleteEverything}
              variant="primary"
              disabled={busy}
              className="flex-1"
            />
            <Button
              label="Cancel"
              onClick={() => setConfirmAll(false)}
              variant="secondary"
              className="flex-1"
            />
          </div>
        ) : (
          <Button
            label="Delete all my data"
            onClick={() => setConfirmAll(true)}
            variant="secondary"
          />
        )}
      </FormSection>

      <div className="mt-4">
        <Button label="Sign out" onClick={onSignOut} variant="ghost" />
      </div>
    </ScreenShell>
  );
}
