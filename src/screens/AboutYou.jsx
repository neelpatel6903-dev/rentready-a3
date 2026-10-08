import { useState } from 'react';
import { Briefcase, MapPin, User } from 'lucide-react';
import InputField from '../components/InputField';
import FormSection from '../components/FormSection';
import Button from '../components/Button';
import ScreenShell from '../components/ScreenShell';
import {
  EMPLOYMENT_OPTIONS,
  JOB_TENURE_OPTIONS,
  REFERENCE_OPTIONS,
  RENTAL_HISTORY_OPTIONS,
} from '../data/options';
import { SUBURBS } from '../data/suburbs';
import { nearestByDistance } from '../utils/geo';
import { MOVE_IN_MAX, MOVE_IN_MIN } from '../utils/dates';
import {
  validateEmployment,
  validateFirstName,
  validateJobTenure,
  validateMoveInDate,
  validateReference,
  validateRentalHistory,
  validateSuburb,
} from '../utils/validation';

const SUBURB_OPTIONS = SUBURBS.map((suburb) => ({ value: suburb.name, label: suburb.name }));

/**
 * AboutYou
 * Screen 2 — "About you". Collects only what the app actually uses: the
 * first name (personalises the result), the current suburb (anchors the
 * nearby-home suggestions, with an opt-in location helper), the move-in
 * date (drives availability and cost timing on the result), and the four
 * scored assessment selects. Everything is validated on blur and Continue
 * stays disabled until every field is valid.
 *
 * Props:
 * @param {{ firstName: string, currentSuburb: string, moveInDate: string,
 *           employmentStatus: string, jobTenure: string,
 *           rentalHistory: string, reference: string }} data - owned by the
 *        parent App component.
 * @param {(name: string, value: string) => void} onChange - lifts field
 *        changes up to the parent's form state.
 * @param {() => void} onNext - advances to Choose a home once valid.
 * @param {() => void} onBack - returns to Login.
 */
export default function AboutYou({ data, onChange, onNext, onBack }) {
  const [touched, setTouched] = useState({});
  const [locationState, setLocationState] = useState('idle'); // 'idle' | 'locating' | 'unavailable'

  const isWorking = data.employmentStatus !== 'not-working';

  const errors = {
    firstName: touched.firstName ? validateFirstName(data.firstName) : null,
    currentSuburb: touched.currentSuburb ? validateSuburb(data.currentSuburb) : null,
    moveInDate: touched.moveInDate ? validateMoveInDate(data.moveInDate) : null,
    employmentStatus: touched.employmentStatus
      ? validateEmployment(data.employmentStatus)
      : null,
    jobTenure:
      touched.jobTenure && isWorking
        ? validateJobTenure(data.employmentStatus, data.jobTenure)
        : null,
    rentalHistory: touched.rentalHistory ? validateRentalHistory(data.rentalHistory) : null,
    reference: touched.reference ? validateReference(data.reference) : null,
  };

  const isValid = [
    validateFirstName(data.firstName) === null,
    validateSuburb(data.currentSuburb) === null,
    validateMoveInDate(data.moveInDate) === null,
    validateEmployment(data.employmentStatus) === null,
    isWorking ? validateJobTenure(data.employmentStatus, data.jobTenure) === null : true,
    validateRentalHistory(data.rentalHistory) === null,
    validateReference(data.reference) === null,
  ].every(Boolean);

  const handleChange = (name, value) => {
    onChange(name, value);
    // Switching to "Not currently working" hides — and clears — time in the
    // current job, so a stale answer can never be scored.
    if (name === 'employmentStatus' && value === 'not-working') {
      onChange('jobTenure', '');
    }
  };

  // Opt-in only: the browser is asked for a location when the button is
  // pressed, the nearest known suburb is selected, and nothing is stored.
  const handleUseLocation = () => {
    if (!('geolocation' in navigator)) {
      setLocationState('unavailable');
      return;
    }
    setLocationState('locating');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nearest = nearestByDistance(
          SUBURBS,
          position.coords.latitude,
          position.coords.longitude
        );
        if (nearest) onChange('currentSuburb', nearest.name);
        setLocationState('idle');
      },
      () => setLocationState('unavailable'),
      { timeout: 10000, maximumAge: 60000 }
    );
  };

  return (
    <ScreenShell
      progress={0}
      footer="Your information stays on this device — nothing is uploaded or stored."
    >
      <div
        onBlur={(event) => {
          const name = event.target.name;
          if (name) setTouched((prev) => ({ ...prev, [name]: true }));
        }}
      >
        <div className="mb-5">
          <h1 className="text-xl font-bold tracking-tight text-slate-900">About you</h1>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
            Only what agents actually look at — nothing more.
          </p>
        </div>

        <FormSection icon={User} title="About you">
          <InputField
            label="First name"
            name="firstName"
            value={data.firstName}
            onChange={handleChange}
            error={errors.firstName}
            placeholder="e.g. Jordan"
          />
        </FormSection>

        <FormSection
          icon={MapPin}
          title="Where you live now"
          description="So we can suggest homes near you."
        >
          <InputField
            label="Which suburb do you live in now?"
            name="currentSuburb"
            type="select"
            options={SUBURB_OPTIONS}
            value={data.currentSuburb}
            onChange={handleChange}
            error={errors.currentSuburb}
          />
          <Button
            label={locationState === 'locating' ? 'Finding your location…' : 'Use my location'}
            onClick={handleUseLocation}
            variant="secondary"
            disabled={locationState === 'locating'}
          />
          {locationState === 'unavailable' && (
            <p className="text-sm leading-relaxed text-slate-500">
              No worries — location isn't available right now. You can still pick your
              suburb from the list.
            </p>
          )}
          <p className="text-xs leading-relaxed text-slate-500">
            Your location stays on this device. It's only used to find your nearest suburb
            and is never saved or sent anywhere.
          </p>
          <InputField
            label="When do you want to move in?"
            name="moveInDate"
            type="date"
            value={data.moveInDate}
            onChange={handleChange}
            error={errors.moveInDate}
            min={MOVE_IN_MIN}
            max={MOVE_IN_MAX}
          />
        </FormSection>

        <FormSection
          icon={Briefcase}
          title="Your work & renting background"
          description="What agents weigh when they assess an application."
        >
          <InputField
            label="Employment status"
            name="employmentStatus"
            type="select"
            options={EMPLOYMENT_OPTIONS}
            value={data.employmentStatus}
            onChange={handleChange}
            error={errors.employmentStatus}
          />
          {isWorking && (
            <InputField
              label="Time in current job"
              name="jobTenure"
              type="select"
              options={JOB_TENURE_OPTIONS}
              value={data.jobTenure}
              onChange={handleChange}
              error={errors.jobTenure}
            />
          )}
          <InputField
            label="Rental history"
            name="rentalHistory"
            type="select"
            options={RENTAL_HISTORY_OPTIONS}
            value={data.rentalHistory}
            onChange={handleChange}
            error={errors.rentalHistory}
          />
          <InputField
            label="Best reference you can provide"
            name="reference"
            type="select"
            options={REFERENCE_OPTIONS}
            value={data.reference}
            onChange={handleChange}
            error={errors.reference}
          />
        </FormSection>

        <div className="mt-8 flex gap-3">
          <Button label="Back" onClick={onBack} variant="secondary" className="flex-1" />
          <Button
            label="Continue"
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