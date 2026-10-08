import { AlertCircle, ChevronDown } from 'lucide-react';

/**
 * InputField
 * A labelled form control used on Login, Details and Finances screens.
 * Always renders a visible label (never a placeholder-only field) and an
 * optional error message so users always know what's being asked and why
 * a field needs fixing. Errors are also exposed to assistive technology
 * via aria-invalid and aria-describedby.
 *
 * Props:
 * @param {string} label        - Visible label, always shown above the field.
 * @param {string} name         - Field name; used for id/htmlFor and passed
 *        back to onChange so the parent knows which field changed.
 * @param {'text'|'email'|'password'|'tel'|'number'|'date'|'select'} [type='text']
 *        - Input type. 'select' renders a <select> using `options` instead
 *          of a text input (e.g. employment status, references yes/no).
 * @param {string|number} value - Controlled value, owned by the parent screen.
 * @param {(name: string, value: string) => void} onChange - Called with the
 *        field's name and new value; the parent lifts this into state.
 * @param {string} [error]      - Error message. When present, the field gets
 *        a red border and the message is shown beneath it.
 * @param {string} [placeholder] - Supplementary hint text only, never used
 *        as a substitute for the visible label.
 * @param {{value:string,label:string}[]} [options] - Choices for type='select'.
 * @param {React.ComponentType<{className?: string, 'aria-hidden'?: boolean}>} [icon]
 *        - Optional icon (e.g. Mail, Lock) drawn inside the field's left
 *          edge, for visual identification of login-type fields.
 * @param {string|number} [min] - Optional minimum for date/number inputs,
 *        passed straight through to the native input (e.g. move-in window).
 * @param {string|number} [max] - Optional maximum for date/number inputs.
 */
export default function InputField({
  label,
  name,
  type = 'text',
  value,
  onChange,
  error,
  placeholder,
  options = [],
  icon: Icon,
  min,
  max,
}) {
  const fieldId = `field-${name}`;
  const errorId = `${fieldId}-error`;
  const describedBy = error ? errorId : undefined;

  const borderTone = error
    ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
    : 'border-slate-300 hover:border-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20';

  const fieldClasses =
    'w-full min-h-[46px] rounded-lg border bg-white px-3.5 py-2.5 text-base shadow-sm ' +
    'transition-colors duration-150 placeholder:text-slate-400 focus:outline-none ' +
    borderTone +
    (Icon ? ' pl-10' : '');

  // The select keeps its placeholder option muted, then switches to solid
  // text once a real choice has been made.
  const selectClasses =
    `${fieldClasses} cursor-pointer appearance-none pr-10 ` +
    (value ? 'text-slate-900' : 'text-slate-400');

  const handleChange = (event) => onChange(name, event.target.value);

  return (
    <div className="w-full">
      <label htmlFor={fieldId} className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </label>

      {type === 'select' ? (
        <div className="relative">
          <select
            id={fieldId}
            name={name}
            value={value}
            onChange={handleChange}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            className={selectClasses}
          >
            <option value="" disabled>
              Select an option
            </option>
            {options.map((option) => (
              <option key={option.value} value={option.value} className="text-slate-900">
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown
            aria-hidden="true"
            className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          />
        </div>
      ) : (
        <div className="relative">
          {Icon && (
            <Icon
              aria-hidden="true"
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            />
          )}
          <input
            id={fieldId}
            name={name}
            type={type}
            value={value}
            onChange={handleChange}
            placeholder={placeholder}
            min={min}
            max={max}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            className={`${fieldClasses} text-slate-900`}
          />
        </div>
      )}

      {error && (
        <p
          id={errorId}
          className="mt-1.5 flex items-center gap-1 text-sm text-red-600"
          role="alert"
        >
          <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
}
