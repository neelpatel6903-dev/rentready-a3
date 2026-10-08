import { useState } from 'react';
import { Lock, Mail, ShieldCheck } from 'lucide-react';
import InputField from '../components/InputField';
import Button from '../components/Button';
import FormSection from '../components/FormSection';
import ScreenShell from '../components/ScreenShell';
import { validateEmail, validatePassword } from '../utils/validation';

/**
 * Login
 * Screen 1 — the real sign-in / create-account gate. Credentials go to
 * POST /api/auth/login (or /api/auth/signup); on success the parent App
 * receives a session token for sessionStorage and the flow advances to
 * About you. A confirmation notice appears when Supabase requires email
 * verification. Server errors render beneath the offending field.
 *
 * Props:
 * @param {(email: string, password: string) => Promise<any>} onLogin -
 *        Resolves on success, throws ApiError { message, fields } on failure.
 * @param {(email: string, password: string) => Promise<{needsConfirmation: boolean}>} onSignup -
 */
export default function Login({ onLogin, onSignup }) {
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [touched, setTouched] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showDataPanel, setShowDataPanel] = useState(false);
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState(null); // cross-field message
  const [serverErrors, setServerErrors] = useState({}); // field → message
  const [confirmation, setConfirmation] = useState(null); // email sent notice

  const emailError = touched.email ? validateEmail(email) : null;
  const passwordError = touched.password ? validatePassword(password) : null;
  const isValid = !validateEmail(email) && !validatePassword(password);

  const isSignup = mode === 'signup';

  const submit = async () => {
    if (!isValid || pending) return;
    setPending(true);
    setFormError(null);
    setServerErrors({});
    setConfirmation(null);
    try {
      const result = isSignup ? await onSignup(email, password) : await onLogin(email, password);
      if (result?.needsConfirmation) {
        setConfirmation(
          `We've sent a confirmation link to ${email}. Confirm your address, then sign in.`
        );
      }
      // On success the parent swaps this screen for the flow.
    } catch (error) {
      if (error.fields) setServerErrors(error.fields);
      else setFormError(error.message);
    } finally {
      setPending(false);
    }
  };

  const switchMode = () => {
    setMode((prev) => (prev === 'signin' ? 'signup' : 'signin'));
    setFormError(null);
    setServerErrors({});
    setConfirmation(null);
  };

  return (
    <ScreenShell
      progress={null}
      footer="Your answers are stored securely with your account — delete them any time from My checks."
    >
      <div className="mb-6 text-center">
        <h1 className="text-xl font-bold tracking-tight text-slate-900">
          {isSignup ? 'Create your RentReady account' : 'Welcome to RentReady'}
        </h1>
        <p className="mx-auto mt-1.5 max-w-[40ch] text-sm leading-relaxed text-slate-500">
          {isSignup
            ? 'One email and a password — your checks stay private to you.'
            : 'Sign in to check how ready you are for your next rental application.'}
        </p>
      </div>

      {/* Blur validation: React's onBlur bubbles, so one wrapper marks any
          field touched without needing an onBlur prop on InputField. */}
      <div
        onBlur={(event) => {
          const name = event.target.name;
          if (name === 'email' || name === 'password') {
            setTouched((prev) => ({ ...prev, [name]: true }));
          }
        }}
      >
        <div className="space-y-4">
          <InputField
            icon={Mail}
            label="Email address"
            name="email"
            type="email"
            value={email}
            onChange={(_, value) => setEmail(value)}
            error={emailError || serverErrors.email || null}
            placeholder="you@example.com"
          />
          <InputField
            icon={Lock}
            label="Password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(_, value) => setPassword(value)}
            error={passwordError || serverErrors.password || null}
            placeholder={isSignup ? 'At least 6 characters' : 'Enter your password'}
          />
          <div className="flex justify-end">
            <Button
              label={showPassword ? 'Hide password' : 'Show password'}
              onClick={() => setShowPassword((prev) => !prev)}
              variant="secondary"
              fullWidth={false}
            />
          </div>
        </div>

        {formError && (
          <p
            role="alert"
            className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-relaxed text-red-700"
          >
            {formError}
          </p>
        )}

        {confirmation && (
          <p
            role="status"
            className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-relaxed text-emerald-700"
          >
            {confirmation}
          </p>
        )}

        {showDataPanel && (
          <FormSection
            icon={ShieldCheck}
            title="How we use your data"
            description="Plain English, no surprises."
          >
            <p className="text-sm leading-relaxed text-slate-600">
              Your answers are sent securely to our server and saved with your account so you
              can review past checks and pick up where you left off. They're only ever shown
              to you — you can delete any check, or your entire account and all its data, from
              the My checks screen at any time.
            </p>
          </FormSection>
        )}

        <div className="mt-6">
          <Button
            label={
              pending
                ? isSignup
                  ? 'Creating account…'
                  : 'Signing in…'
                : isSignup
                  ? 'Create account'
                  : 'Sign in'
            }
            onClick={submit}
            variant="primary"
            disabled={!isValid || pending}
          />
        </div>

        <div className="mt-4 flex flex-col items-center gap-3">
          <Button
            label={
              isSignup
                ? 'Already have an account? Sign in'
                : "Don't have an account? Create one"
            }
            onClick={switchMode}
            variant="secondary"
            fullWidth={false}
          />
          <Button
            label="How we use your data"
            onClick={() => setShowDataPanel((prev) => !prev)}
            variant="ghost"
            fullWidth={false}
          />
        </div>
      </div>
    </ScreenShell>
  );
}
