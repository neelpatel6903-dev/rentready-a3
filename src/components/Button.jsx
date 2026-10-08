/**
 * Button
 * A single, reusable button used across every screen so actions look and
 * behave consistently.
 *
 * Props:
 * @param {string} label            - Visible button text.
 * @param {() => void} onClick      - Click handler.
 * @param {'primary'|'secondary'|'ghost'} [variant='primary'] - Visual style:
 *        'primary' = solid teal call-to-action (e.g. Continue, Submit),
 *        'secondary' = outlined, lower-emphasis action (e.g. Back),
 *        'ghost' = quiet inline action for sitting inside cards (e.g.
 *        "Change home") — no border, teal text, subtle hover.
 * @param {boolean} [fullWidth=true] - When true (default) the button is
 *        full-width at the standard 48px height, for stacked forms. When
 *        false it renders as a compact 40px inline control that can sit
 *        beside other content without squeezing it.
 * @param {boolean} [disabled=false] - Disables interaction and mutes style.
 * @param {'button'|'submit'} [type='button'] - Native button type.
 * @param {string} [className]      - Optional layout-only extra classes
 *        (e.g. flex sizing when buttons share a row). Sizing like padding,
 *        text size and width comes from variant + fullWidth, not here.
 */
export default function Button({
  label,
  onClick,
  variant = 'primary',
  disabled = false,
  type = 'button',
  className = '',
  fullWidth = true,
}) {
  const base =
    'inline-flex items-center justify-center rounded-xl font-semibold tracking-tight ' +
    'transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ' +
    'focus-visible:ring-offset-2 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 ' +
    (fullWidth
      ? 'w-full min-h-[48px] px-6 py-3 text-base'
      : 'min-h-[40px] px-4 py-2 text-sm');

  const variants = {
    primary:
      'bg-teal-600 text-white shadow-md shadow-teal-600/25 hover:bg-teal-700 ' +
      'hover:shadow-lg hover:shadow-teal-600/30 active:bg-teal-800 active:shadow-md ' +
      'disabled:hover:bg-teal-600 disabled:hover:shadow-md',
    secondary:
      'border border-teal-300 bg-white text-teal-700 shadow-sm hover:border-teal-400 ' +
      'hover:bg-teal-50 active:border-teal-500 active:bg-teal-100 ' +
      'disabled:hover:border-teal-300 disabled:hover:bg-white',
    ghost:
      'bg-transparent text-teal-700 hover:bg-teal-100/60 active:bg-teal-100',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${variants[variant]} ${className}`}
    >
      {label}
    </button>
  );
}
