import { WANDERING_BADGES, type WanderingRole } from './WanderingBadgeBar';
import { Label } from '@/components/ui/label';

interface Props {
  value: WanderingRole | null;
  onChange: (role: WanderingRole | null) => void;
  /** Hide HEART since it routes to Tribal Hearts and isn't a sellable identity. */
  excludeHeart?: boolean;
  label?: string;
  helper?: string;
}

/**
 * Compact identity badge picker for upload forms (music, video, book, product).
 * Lets the seller declare WHO they are (FIELD, HAND, HEARTH, etc.).
 */
export default function WanderingRolePicker({
  value,
  onChange,
  excludeHeart = true,
  label = 'Your Wandering Identity',
  helper = 'Pick the badge that best describes you as a seller. Buyers can filter by this.',
}: Props) {
  const badges = excludeHeart
    ? WANDERING_BADGES.filter((b) => b.key !== 'heart')
    : WANDERING_BADGES;

  return (
    <div className="space-y-2">
      <Label className="text-base font-semibold">{label}</Label>
      {helper && <p className="text-xs text-muted-foreground">{helper}</p>}
      <div className="flex flex-wrap gap-2">
        {badges.map((b) => {
          const active = value === b.key;
          return (
            <button
              key={b.key}
              type="button"
              onClick={() => onChange(active ? null : b.key)}
              title={b.description}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold tracking-wider transition-all ${
                active ? 'scale-105' : 'hover:scale-105'
              }`}
              style={{
                background: active
                  ? `linear-gradient(135deg, ${b.color}33, ${b.color}11)`
                  : 'transparent',
                borderColor: active ? b.color : 'hsl(var(--border))',
                color: active ? b.color : 'hsl(var(--muted-foreground))',
                boxShadow: active ? `0 0 12px ${b.color}55` : undefined,
              }}
            >
              <span className="text-base" aria-hidden>{b.emoji}</span>
              {b.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
