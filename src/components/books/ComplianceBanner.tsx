import { AlertTriangle } from 'lucide-react';

/**
 * PERSISTENT COMPLIANCE DISCLAIMER — required on the Payroll tab.
 * Jurisdiction-agnostic. Do not remove, hide, collapse or soften this wording.
 */
export default function ComplianceBanner() {
  return (
    <div
      role="note"
      className="rounded-xl border border-amber-400/40 bg-amber-400/10 p-4 text-sm leading-relaxed text-amber-100"
    >
      <div className="flex gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" aria-hidden="true" />
        <p>
          <strong className="font-semibold text-amber-200">Estimates only — not tax or legal advice.</strong>{' '}
          These are estimates based on the statutory deductions you&apos;ve configured — not tax or legal
          advice. Verify current rates, wage caps, and reporting codes with your own country&apos;s tax
          authority or a registered tax/payroll professional before relying on this for real filings or
          payments.
        </p>
      </div>
    </div>
  );
}
