/**
 * options.js
 * The four About-you selects. The option lists are shared by the form, the
 * scoring model and the result summary so the human-readable labels live in
 * exactly one place.
 */
export const EMPLOYMENT_OPTIONS = [
  { value: 'full-time', label: 'Full-time' },
  { value: 'part-time', label: 'Part-time' },
  { value: 'casual', label: 'Casual' },
  { value: 'self-employed', label: 'Self-employed' },
  { value: 'student', label: 'Student' },
  { value: 'not-working', label: 'Not currently working' },
];

export const JOB_TENURE_OPTIONS = [
  { value: 'under-3-months', label: 'Under 3 months' },
  { value: '3-12-months', label: '3 to 12 months' },
  { value: 'over-12-months', label: 'Over 12 months' },
];

export const RENTAL_HISTORY_OPTIONS = [
  { value: 'first-time', label: 'First-time renter' },
  { value: 'under-1-year', label: 'Under 1 year' },
  { value: '1-3-years', label: '1 to 3 years' },
  { value: '3-plus-years', label: '3 years or more' },
];

export const REFERENCE_OPTIONS = [
  { value: 'landlord-agent', label: 'Previous landlord or agent' },
  { value: 'employer', label: 'Employer' },
  { value: 'personal', label: 'Personal only' },
  { value: 'none', label: 'None' },
];

/** Human label for a stored value; empty values stay empty. */
export function optionLabel(options, value) {
  if (!value) return '';
  const match = options.find((option) => option.value === value);
  return match ? match.label : value;
}