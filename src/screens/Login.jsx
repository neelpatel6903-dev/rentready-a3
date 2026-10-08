import { useState } from 'react';
import { Lock, Mail, ShieldCheck } from 'lucide-react';
import InputField from '../components/InputField';
import Button from '../components/Button';
import FormSection from '../components/FormSection';
import ScreenShell from '../components/ScreenShell';
import { validateEmail, validatePassword } from '../utils/validation';

/**
 * Login
 * Screen 1. Mock sign-in — there is no real authentication. Fields are
 * validated on blur, Continue stays disabled until both fields are valid,
 * the password can be shown or hidden, and a plain-language panel explains
 * exactly how the demo uses data.
 *
 * Props:
 * @param {{ email: string, password: string }} data - current login values,
 *        owned by the parent App component.
 * @param {(name: string, value: string) => void} onChange - lifts field
 *        changes back up to the parent's form state.
 * @param {() => void} onNext - advances to About you once both fields pass.
 */
export default function Login({ data, onChange, onNext }) {
  const [touched, setTouched] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showDataPanel, setShowDataPanel] = useState(false);

  const emailError = touched.email ? validateEmail(data.email) : null;
  const passwordError = touched.password ? validatePassword(data.password) : null;
  const isValid = !validateEmail(data.email) && !validatePassword(data.password);

  return (
    <ScreenShell
      progress={null}
      footer="This is a demo — no account is created and nothing is stored."
    >
      <div className="mb-6 text-center">
        <h1 className="text-xl font-bold tracking-tight text-slate-900">
          Welcome to RentReady
        </h1>
        <p className="mx-auto mt-1.5 max-w-[40ch] text-sm leading-relaxed text-slate-500">
          Sign in to check how ready you are for your next rental application.
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
            value={data.email}
            onChange={onChange}
            error={emailError}
            placeholder="you@example.com"
          />
          <InputField
            icon={Lock}
            label="Password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            value={data.password}
            onChange={onChange}
            error={passwordError}
            placeholder="Enter your password"
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

        {showDataPanel && (
          <FormSection
            icon={ShieldCheck}
            title="How we use your data"
            description="Plain English, no surprises."
          >
            <p className="text-sm leading-relaxed text-slate-600">
              RentReady runs entirely in your browser. Your answers are used only to
              calculate your score in this session — nothing is sent anywhere, nothing is
              stored, and closing the tab clears everything.
            </p>
          </FormSection>
        )}

        <div className="mt-6">
          <Button
            label="Continue"
            onClick={() => isValid && onNext()}
            variant="primary"
            disabled={!isValid}
          />
        </div>

        <div className="mt-4 flex justify-center">
          <Button
            label="How we use your data"
            onClick={() => setShowDataPanel((prev) => !prev)}
            variant="secondary"
            fullWidth={false}
          />
        </div>
      </div>
    </ScreenShell>
  );
}
