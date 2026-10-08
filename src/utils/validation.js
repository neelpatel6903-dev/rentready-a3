/**
 * validation.js
 * Plain-language field validators shared by every screen. Each returns null
 * when the value is acceptable, or the message to show beneath the field
 * once it has been blurred.
 */
import { MOVE_IN_MAX, MOVE_IN_MIN } from './dates';

export function validateEmail(value) {
  if (!value.trim()) return 'Enter your email address.';
  return /^\S+@\S+\.\S+$/.test(value.trim())
    ? null
    : 'Enter a valid email address like name@example.com.';
}

export function validatePassword(value) {
  return value.trim() ? null : 'Enter your password.';
}

export function validateFirstName(value) {
  return value.trim() ? null : 'Enter your first name.';
}

export function validateSuburb(value) {
  return value ? null : 'Select the suburb you live in now.';
}

export function validateMoveInDate(value) {
  if (!value) return 'Choose your preferred move-in date.';
  if (value < MOVE_IN_MIN) return 'Choose a date from today onwards';
  if (value > MOVE_IN_MAX) return 'Choose a date within the next six months.';
  return null;
}

export function validateEmployment(value) {
  return value ? null : 'Select your employment status.';
}

/**
 * Time in current job is only asked while the user is working, so the
 * check is skipped whenever the field is hidden.
 */
export function validateJobTenure(employmentStatus, value) {
  if (employmentStatus === 'not-working') return null;
  return value ? null : "Tell us how long you've been in your current job.";
}

export function validateRentalHistory(value) {
  return value ? null : "Select how long you've been renting.";
}

export function validateReference(value) {
  return value ? null : 'Select the best reference you can provide.';
}

export function validateWeeklyIncome(value) {
  const amount = Number(value);
  if (value === '' || Number.isNaN(amount) || amount <= 0) {
    return 'Enter your weekly household income (numbers only).';
  }
  return null;
}

export function validateSavings(value) {
  const amount = Number(value);
  if (value === '' || Number.isNaN(amount) || amount < 0) {
    return 'Enter your total savings — 0 is fine.';
  }
  return null;
}