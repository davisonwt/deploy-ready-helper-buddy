import { Check } from 'lucide-react';

export interface SowStep {
  /** Short enough to read in a chip at 390px. */
  label: string;
  done: boolean;
}

interface Props {
  steps: SowStep[];
  /** 1-based step to highlight. */
  current: number;
  /** What to do first, shown until something is filled in. */
  startHint: string;
}

/**
 * Every step of a sow form, listed before the first question is answered.
 *
 * The form reveals a section only once the one above it is answered, so a
 * member who has picked nothing sees a single question and no hint that a
 * price is ever asked for. A prose cue under the choices did not solve it:
 * on /sow/hand the twenty categories pushed that cue 169px below the fold
 * at 390x844 and 368px below at 1280x720, so it was never read. A fixed
 * one-row list sits above the choices instead, where its height does not
 * depend on how many options the first question has.
 */
export default function SowSteps({ steps, current, startHint }: Props) {
  const total = steps.length;
  const doneCount = steps.filter((s) => s.done).length;
  const rateStep = steps.findIndex((s) => /what you charge/i.test(s.label)) + 1;
  const next = steps.find((s) => !s.done);

  return (
    <nav aria-label={`The ${total} steps of this form`} className="mb-6">
      <ol className="flex flex-wrap gap-1.5">
        {steps.map((step, i) => {
          const n = i + 1;
          const isCurrent = n === current && !step.done;
          return (
            <li key={step.label}>
              <span
                aria-current={isCurrent ? 'step' : undefined}
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] leading-none transition ${
                  step.done
                    ? 'border-primary/40 bg-primary/10 text-primary'
                    : isCurrent
                      ? 'border-primary bg-primary text-primary-foreground font-medium'
                      : 'border-border bg-muted/40 text-muted-foreground'
                }`}
              >
                <span
                  className={`inline-grid h-4 w-4 shrink-0 place-items-center rounded-full text-[10px] ${
                    step.done
                      ? 'bg-primary text-primary-foreground'
                      : isCurrent
                        ? 'bg-primary-foreground text-primary'
                        : 'bg-muted-foreground/20'
                  }`}
                >
                  {step.done ? <Check className="h-2.5 w-2.5" aria-hidden /> : n}
                </span>
                {step.label}
                {step.done && <span className="sr-only"> (done)</span>}
              </span>
            </li>
          );
        })}
      </ol>

      <p className="mt-2 text-xs text-muted-foreground">
        {doneCount === 0 ? (
          <>
            {total} steps. {startHint}
            {rateStep > 0 && <> — we ask <strong>what you charge</strong> at step {rateStep}.</>}
          </>
        ) : doneCount === total ? (
          <>All {total} steps done.</>
        ) : (
          <>
            {doneCount} of {total} done{next && <> — next: <strong>{next.label}</strong></>}.
          </>
        )}
      </p>
    </nav>
  );
}
