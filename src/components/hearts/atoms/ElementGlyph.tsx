/**
 * ElementGlyph — Earth · Air · Fire · Water round selectable glyph.
 */
import { cn } from '@/lib/utils';

export type Element = 'earth' | 'air' | 'fire' | 'water';

const META: Record<Element, { label: string; emoji: string; tint: string }> = {
  earth: { label: 'Earth', emoji: '🌿', tint: '120 35% 35%' },
  air:   { label: 'Air',   emoji: '💨', tint: '200 35% 55%' },
  fire:  { label: 'Fire',  emoji: '🔥', tint: '18 80% 52%' },
  water: { label: 'Water', emoji: '💧', tint: '210 60% 50%' },
};

interface Props {
  element: Element;
  selected?: boolean;
  onClick?: () => void;
  size?: 'sm' | 'md';
}

export function ElementGlyph({ element, selected = false, onClick, size = 'md' }: Props) {
  const m = META[element];
  const dim = size === 'sm' ? 'h-14 w-14 text-2xl' : 'h-20 w-20 text-3xl';
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group flex flex-col items-center gap-1.5 transition-transform',
        onClick && 'hover:scale-105',
      )}
    >
      <span
        className={cn(
          'flex items-center justify-center rounded-full border-2 transition-all',
          dim,
          selected
            ? 'border-[hsl(var(--th-gold-bright))] shadow-[0_0_24px_hsl(var(--th-gold)/0.55)]'
            : 'border-[hsl(var(--th-gold)/0.35)]',
        )}
        style={{
          background: `radial-gradient(circle at 35% 30%, hsl(${m.tint} / 0.7), hsl(var(--th-walnut-dark)) 75%)`,
        }}
      >
        {m.emoji}
      </span>
      <span className={cn(
        'th-serif text-xs uppercase tracking-[0.18em]',
        selected ? 'text-[hsl(var(--th-gold-bright))]' : 'text-[hsl(var(--th-cream)/0.7)]',
      )}>
        {m.label}
      </span>
    </button>
  );
}
