/**
 * FormSection
 * A visual grouping wrapper used on the Details and Finances screens to
 * break a long form into calm, digestible chunks with a heading and a
 * short plain-language description.
 *
 * Props:
 * @param {string} title              - Section heading.
 * @param {string} [description]      - One-line helper text under the heading.
 * @param {React.ComponentType<{className?: string, 'aria-hidden'?: boolean}>} [icon]
 *        - Optional lucide-react icon rendered in a small chip beside the
 *          heading, matching the section's topic. Hidden from assistive
 *          technology (the heading itself carries the meaning).
 * @param {React.ReactNode} children  - The grouped InputFields for this section.
 */
export default function FormSection({ title, description, icon: Icon, children }) {
  return (
    <section className="mb-6 rounded-2xl border border-slate-200 bg-slate-50/80 p-5">
      <div className="flex items-center gap-2.5">
        {Icon && (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-teal-600 shadow-sm ring-1 ring-slate-200">
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
        )}
        <h2 className="text-base font-semibold tracking-tight text-slate-900">{title}</h2>
      </div>
      {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
      <div className="mt-4 space-y-4 border-t border-slate-200/80 pt-4">{children}</div>
    </section>
  );
}
