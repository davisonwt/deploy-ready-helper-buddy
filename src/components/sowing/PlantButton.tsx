import { Button } from '@/components/ui/button';
import { Loader2, Sprout } from 'lucide-react';

interface Props {
  requiredCount: number;
  completedCount: number;
  /** One-line, specific reason shown while disabled — e.g. "Add a cover to finish." */
  missingReason?: string;
  submitting: boolean;
  onClick: () => void;
  /** Defaults to "planted" — e.g. "ready" for a role-unlock form like RegisterWanderingPage. */
  progressWord?: string;
  /** Defaults to "Plant seed" / "Planting…" / Sprout — overridable for non-seed uses of this same progress+button pattern. */
  label?: string;
  loadingLabel?: string;
  icon?: React.ComponentType<{ className?: string }>;
}

/**
 * "One button at the end: Plant seed. Progress shows how close they are."
 * — spec-sowing-forms.md. Generalized (label/loadingLabel/icon/
 * progressWord, all optional, all defaulting to the original seed-form
 * copy) so RegisterWanderingPage's role unlock can reuse the exact same
 * progress+button piece instead of forking it.
 */
export default function PlantButton({
  requiredCount, completedCount, missingReason, submitting, onClick,
  progressWord = 'planted', label = 'Plant seed', loadingLabel = 'Planting…', icon: Icon = Sprout,
}: Props) {
  const ready = completedCount >= requiredCount;
  const pct = Math.min(100, Math.round((completedCount / requiredCount) * 100));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{completedCount} of {requiredCount} {progressWord}</span>
        {!ready && missingReason && <span>{missingReason}</span>}
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      <Button
        type="submit"
        onClick={onClick}
        disabled={!ready || submitting}
        className="w-full"
        size="lg"
      >
        {submitting ? (
          <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {loadingLabel}</>
        ) : (
          <><Icon className="w-4 h-4 mr-2" /> {label}</>
        )}
      </Button>
    </div>
  );
}
