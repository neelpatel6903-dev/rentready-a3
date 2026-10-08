import { useEffect, useState } from 'react';
import Login from './screens/Login';
import AboutYou from './screens/AboutYou';
import ChooseHome from './screens/ChooseHome';
import Finances from './screens/Finances';
import Result from './screens/Result';
import CheckingScreen from './components/CheckingScreen';

// Flow order. LOGIN and RESULT sit outside the counted steps; the checking
// screen is a cosmetic pause between Your finances and the result.
const STEPS = {
  LOGIN: 'login',
  ABOUT: 'about',
  HOME: 'home',
  FINANCES: 'finances',
  CHECKING: 'checking',
  RESULT: 'result',
};

const INITIAL_FORM_DATA = {
  login: { email: '', password: '' },
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

/**
 * App
 * Root component. Owns the entire form's state, the chosen sample home and
 * the current step, and passes them down to each screen via props — screens
 * never hold their own copy of the data, only transient validation state.
 * Nothing persists beyond the browser session: a full page refresh clears
 * everything, and "Clear my details" wipes it on demand.
 */
function App() {
  const [step, setStep] = useState(STEPS.LOGIN);
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);
  const [selectedHome, setSelectedHome] = useState(null);

  // Generic field updater shared by every screen: (section, field, value).
  const updateField = (section, name, value) => {
    setFormData((prev) => ({
      ...prev,
      [section]: { ...prev[section], [name]: value },
    }));
  };

  const restart = () => {
    setFormData(INITIAL_FORM_DATA);
    setSelectedHome(null);
    setStep(STEPS.LOGIN);
  };

  const applyAnotherHome = () => setStep(STEPS.HOME);

  // Reduced-motion users skip the cosmetic checking screen entirely.
  const [reduceMotion, setReduceMotion] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const listener = (event) => setReduceMotion(event.matches);
    query.addEventListener('change', listener);
    return () => query.removeEventListener('change', listener);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      {step === STEPS.LOGIN && (
        <Login
          data={formData.login}
          onChange={(name, value) => updateField('login', name, value)}
          onNext={() => setStep(STEPS.ABOUT)}
        />
      )}

      {step === STEPS.ABOUT && (
        <AboutYou
          data={formData.about}
          onChange={(name, value) => updateField('about', name, value)}
          onNext={() => setStep(STEPS.HOME)}
          onBack={() => setStep(STEPS.LOGIN)}
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
          onNext={() => setStep(reduceMotion ? STEPS.RESULT : STEPS.CHECKING)}
          onBack={() => setStep(STEPS.HOME)}
          onChangeHome={() => setStep(STEPS.HOME)}
        />
      )}

      {step === STEPS.CHECKING && (
        <CheckingScreen onNext={() => setStep(STEPS.RESULT)} />
      )}

      {step === STEPS.RESULT && (
        <Result
          about={formData.about}
          finances={formData.finances}
          selectedHome={selectedHome}
          onApplyAnotherHome={applyAnotherHome}
          onEditAbout={() => setStep(STEPS.ABOUT)}
          onRestart={restart}
        />
      )}
    </div>
  );
}

export default App;
