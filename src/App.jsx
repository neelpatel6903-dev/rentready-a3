import { useEffect, useRef, useState } from 'react';
import Login from './screens/Login';
import AboutYou from './screens/AboutYou';
import ChooseHome from './screens/ChooseHome';
import Finances from './screens/Finances';
import MyChecks from './screens/MyChecks';
import Result from './screens/Result';
import CheckingScreen from './components/CheckingScreen';
import useAuth from './hooks/useAuth';
import { api } from './api/client';

// Flow order. RESULT and MY_CHECKS sit outside the counted steps; the
// checking screen pauses between Your finances and the result while the
// server validates, scores and stores the check.
const STEPS = {
  ABOUT: 'about',
  HOME: 'home',
  FINANCES: 'finances',
  CHECKING: 'checking',
  RESULT: 'result',
  MY_CHECKS: 'my-checks',
};

const INITIAL_FORM_DATA = {
  about: {
    firstName: '',
    currentSuburb: '',
    moveInDate: '',
    employmentStatus: '',
    jobTenure: '',
    rentalHistory: '',
    reference: '',
  },
  finances: { weeklyIncome: '', savings: '' },
};

const isAboutEmpty = (about) => Object.values(about).every((value) => !value);

/**
 * App
 * Root component. Owns the form state, the chosen home and the current
 * step, and passes them down via props. Authentication comes from useAuth:
 * the app boots into a signed-out Login screen, and every data operation
 * goes through same-origin /api routes — Supabase is never touched from
 * the browser.
 */
function App() {
  const { user, profile, ready, login, signup, logout, deleteAllData, reloadProfile } = useAuth();

  const [step, setStep] = useState(STEPS.ABOUT);
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);
  const [selectedHome, setSelectedHome] = useState(null);
  const [savedCheck, setSavedCheck] = useState(null);
  const [aboutSaving, setAboutSaving] = useState(false);
  const [aboutError, setAboutError] = useState(null);

  // Memoised POST for the current check: StrictMode's double-invoked
  // effects (and any stray double-click) create at most one row.
  const checkPromiseRef = useRef(null);

  // Generic field updater shared by every screen: (section, field, value).
  const updateField = (section, name, value) => {
    setFormData((prev) => ({
      ...prev,
      [section]: { ...prev[section], [name]: value },
    }));
  };

  // Prefill About you from the saved profile, but only while the form is
  // still pristine so a returning user can edit freely afterward.
  useEffect(() => {
    if (profile && isAboutEmpty(formData.about)) {
      setFormData((prev) => ({
        ...prev,
        about: {
          firstName: profile.firstName || '',
          currentSuburb: profile.currentSuburb || '',
          moveInDate: profile.moveInDate || '',
          employmentStatus: profile.employmentStatus || '',
          jobTenure: profile.jobTenure || '',
          rentalHistory: profile.rentalHistory || '',
          reference: profile.reference || '',
        },
      }));
    }
    // formData.about intentionally omitted: only re-run when the profile
    // arrives; the emptiness guard inside prevents overwriting edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  const restart = () => {
    setFormData(INITIAL_FORM_DATA);
    setSelectedHome(null);
    setSavedCheck(null);
    checkPromiseRef.current = null;
    setStep(STEPS.ABOUT);
  };

  const applyAnotherHome = () => {
    setSavedCheck(null);
    checkPromiseRef.current = null; // the next check should save a new row
    setStep(STEPS.HOME);
  };

  // Save About you to the profile before advancing. The client already
  // validated; a failure here (network/server) blocks Continue and shows
  // the server's message instead of silently losing answers.
  const saveAboutAndContinue = async () => {
    setAboutSaving(true);
    setAboutError(null);
    try {
      await api.put('/api/profile', formData.about);
      reloadProfile();
      setStep(STEPS.HOME);
    } catch (error) {
      setAboutError(error.message);
    } finally {
      setAboutSaving(false);
    }
  };

  // POST /api/assessments — memoised so only one request (and one row)
  // exists per check; failures clear the memo so Retry can re-post.
  const submitCheck = () => {
    if (!checkPromiseRef.current) {
      checkPromiseRef.current = api
        .post('/api/assessments', {
          about: formData.about,
          finances: formData.finances,
          listingId: selectedHome?.id,
        })
        .then((saved) => {
          setSavedCheck(saved);
          return saved;
        })
        .catch((error) => {
          checkPromiseRef.current = null; // allow retry after failure
          throw error;
        });
    }
    return checkPromiseRef.current;
  };

  // Reduced-motion users see a shorter cosmetic pause — the real work (the
  // POST above) must finish either way before the result appears.
  const [reduceMotion, setReduceMotion] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const listener = (event) => setReduceMotion(event.matches);
    query.addEventListener('change', listener);
    return () => query.removeEventListener('change', listener);
  }, []);

  // --- Boot: session check in flight -------------------------------------
  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-400">
          Loading RentReady…
        </p>
      </div>
    );
  }

  // --- Signed out: only login/signup is possible -------------------------
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Login onLogin={login} onSignup={signup} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {step === STEPS.ABOUT && (
        <AboutYou
          data={formData.about}
          onChange={(name, value) => updateField('about', name, value)}
          onNext={saveAboutAndContinue}
          onBack={logout}
          saving={aboutSaving}
          saveError={aboutError}
        />
      )}

      {step === STEPS.HOME && (
        <ChooseHome
          currentSuburb={formData.about.currentSuburb}
          moveInDate={formData.about.moveInDate}
          selectedHome={selectedHome}
          onSelect={setSelectedHome}
          onNext={() => setStep(STEPS.FINANCES)}
          onBack={() => setStep(STEPS.ABOUT)}
        />
      )}

      {step === STEPS.FINANCES && (
        <Finances
          data={formData.finances}
          onChange={(name, value) => updateField('finances', name, value)}
          selectedHome={selectedHome}
          onNext={() => setStep(STEPS.CHECKING)}
          onBack={() => setStep(STEPS.HOME)}
          onChangeHome={() => setStep(STEPS.HOME)}
        />
      )}

      {step === STEPS.CHECKING && (
        <CheckingScreen
          onCheck={submitCheck}
          onSuccess={() => setStep(STEPS.RESULT)}
          onBack={() => setStep(STEPS.FINANCES)}
          reduceMotion={reduceMotion}
        />
      )}

      {step === STEPS.RESULT && (
        <Result
          about={formData.about}
          finances={formData.finances}
          selectedHome={selectedHome}
          savedCheck={savedCheck}
          onApplyAnotherHome={applyAnotherHome}
          onEditAbout={() => setStep(STEPS.ABOUT)}
          onOpenChecks={() => setStep(STEPS.MY_CHECKS)}
          onRestart={restart}
        />
      )}

      {step === STEPS.MY_CHECKS && (
        <MyChecks
          onBack={() => setStep(savedCheck ? STEPS.RESULT : STEPS.ABOUT)}
          onDeleteAll={deleteAllData}
          onSignOut={logout}
        />
      )}
    </div>
  );
}

export default App;
