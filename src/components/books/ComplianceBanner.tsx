import { AlertTriangle } from 'lucide-react';

/**
 * PERSISTENT COMPLIANCE DISCLAIMER — required on the Payroll tab.
 * Do not remove, hide, collapse or soften this wording.
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
          <strong className="font-semibold text-amber-200">
            Simplified illustrative estimate — not tax or legal advice.
          </strong>{' '}
          These payroll figures are a simplified illustration only. PAYE brackets, the UIF
          remuneration ceiling, SDL liability and all SARS source codes must be verified against
          current SARS guidance or with a registered tax practitioner or payroll provider before
          you use them for any real filing, payslip or payment.
        </p>
      </div>
    </div>
  );
}
